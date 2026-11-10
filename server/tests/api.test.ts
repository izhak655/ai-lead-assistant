import request from 'supertest';
import { createApp } from '../src/app';
import { prisma } from '../src/db';
import { closeQueue } from '../src/queue/jobs';
import { processFollowUp } from '../src/services/automation';

const app = createApp();

async function reset(): Promise<void> {
  await prisma.lead.deleteMany();
}

describe('API', () => {
  beforeEach(async () => {
    await reset();
  });

  afterAll(async () => {
    await closeQueue();
    await prisma.$disconnect();
  });

  it('reports database and redis health', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ ok: true, db: 'up', redis: 'up', aiMode: 'mock', queueDriver: 'inline' });
  });

  it('creates, lists, and filters a lead', async () => {
    const created = await request(app).post('/api/leads').send({
      name: 'Yael Mizrahi',
      phone: '052-111-0099',
      company: 'Mizrahi Clinic',
      need: 'Qualify new patient inquiries that arrive on WhatsApp.',
    });
    expect(created.status).toBe(201);
    expect(created.body.lead.phone).toBe('+972521110099');
    expect(created.body.lead.status).toBe('QUALIFYING');

    const listed = await request(app).get('/api/leads').query({ q: 'Mizrahi' });
    expect(listed.status).toBe(200);
    expect(listed.body.leads).toHaveLength(1);

    const filtered = await request(app).get('/api/leads').query({ status: 'NEW' });
    expect(filtered.body.leads).toHaveLength(0);

    const duplicate = await request(app).post('/api/leads').send({ name: 'Yael', phone: '+972521110099' });
    expect(duplicate.status).toBe(409);
  });

  it('rejects an invalid webhook payload', async () => {
    const res = await request(app).post('/api/webhooks/whatsapp').send({});
    expect(res.status).toBe(400);
  });

  it('qualifies an inbound WhatsApp lead and replies in mock mode', async () => {
    const res = await request(app)
      .post('/api/webhooks/whatsapp')
      .send({
        from: '+972521119999',
        name: 'Test User',
        text: "I'm Test User, founder at BrightPath. I want to automate WhatsApp follow-ups for inbound sales leads. Budget is 4000 ILS/month and we need this ASAP. Email test.user@brightpath.example",
        messageId: 'wamid-1',
      });
    expect(res.status).toBe(202);
    expect(res.body.duplicate).toBe(false);

    const detail = await request(app).get(`/api/leads/${res.body.leadId}`);
    expect(detail.status).toBe(200);
    expect(detail.body.lead.company).toBe('BrightPath');
    expect(detail.body.lead.email).toBe('test.user@brightpath.example');
    expect(detail.body.lead.status).toBe('QUALIFIED');
    expect(detail.body.lead.score).toBeGreaterThan(70);
    expect(detail.body.lead.proposedSlots).toHaveLength(3);
    expect(detail.body.messages.some((message: { direction: string }) => message.direction === 'OUTBOUND')).toBe(true);
    expect(detail.body.messages[detail.body.messages.length - 1].body).toMatch(/1\)/);

    const again = await request(app).post('/api/webhooks/whatsapp').send({
      from: '+972521119999',
      text: 'hello again',
      messageId: 'wamid-1',
    });
    expect(again.status).toBe(202);
    expect(again.body.duplicate).toBe(true);
    const after = await request(app).get(`/api/leads/${res.body.leadId}`);
    expect(after.body.messages).toHaveLength(2);
  });

  it('books a proposed slot and can cancel the meeting', async () => {
    const first = await request(app)
      .post('/api/webhooks/whatsapp')
      .send({
        from: '0521110088',
        name: 'Dana Levi',
        text: "I'm Dana Levi, founder at North Clinic. I want WhatsApp qualification for new patient leads. Budget is 6000 ILS/month, timeline ASAP. Email dana@north.example",
        messageId: 'wamid-dana-1',
      });
    expect(first.status).toBe(202);
    const leadId = first.body.leadId as string;

    const second = await request(app).post('/api/webhooks/whatsapp').send({
      from: '+972521110088',
      text: 'Option 1 works for me',
      messageId: 'wamid-dana-2',
    });
    expect(second.status).toBe(202);

    const detail = await request(app).get(`/api/leads/${leadId}`);
    expect(detail.body.lead.status).toBe('MEETING_BOOKED');
    expect(detail.body.meetings).toHaveLength(1);
    expect(detail.body.messages[detail.body.messages.length - 1].body).toMatch(/^Booked:/);

    const meetingId = detail.body.meetings[0].id as string;
    const cancelled = await request(app).patch(`/api/meetings/${meetingId}`).send({ status: 'CANCELLED' });
    expect(cancelled.status).toBe(200);
    expect(cancelled.body.meeting.status).toBe('CANCELLED');

    const after = await request(app).get(`/api/leads/${leadId}`);
    expect(after.body.lead.status).toBe('QUALIFIED');
  });

  it('books from the dashboard endpoint', async () => {
    const opened = await request(app).post('/api/webhooks/whatsapp').send({
      from: '+972521110077',
      name: 'Gil',
      text: "I'm Gil, founder at Harbor Ops. I need to qualify inbound demo leads on WhatsApp. Budget 4500 ILS/month and this month. Email gil@harbor.example",
    });
    const leadId = opened.body.leadId as string;
    const detail = await request(app).get(`/api/leads/${leadId}`);
    const slotId = detail.body.lead.proposedSlots[0].id as string;
    const booked = await request(app).post(`/api/leads/${leadId}/meetings`).send({ slotId });
    expect(booked.status).toBe(201);

    const meetings = await request(app).get('/api/meetings');
    expect(meetings.body.meetings.some((meeting: { leadId: string }) => meeting.leadId === leadId)).toBe(true);

    const unknown = await request(app).post(`/api/leads/${leadId}/meetings`).send({ slotId: 'slot_9' });
    expect(unknown.status).toBe(409);
  });

  it('sends one follow-up while a qualifying lead still owes a reply', async () => {
    const created = await request(app).post('/api/leads').send({
      name: 'Waiting Lead',
      phone: '+972521110777',
      company: 'Wait Co',
      need: 'We need WhatsApp follow-ups for inbound demo requests from ads',
    });
    const leadId = created.body.lead.id as string;
    await prisma.message.create({
      data: { leadId, direction: 'OUTBOUND', body: 'What budget range are you considering?' },
    });
    await processFollowUp(leadId);
    await processFollowUp(leadId);
    const detail = await request(app).get(`/api/leads/${leadId}`);
    const outbound = detail.body.messages.filter((message: { direction: string }) => message.direction === 'OUTBOUND');
    expect(outbound).toHaveLength(2);
    expect(detail.body.lead.followUpSentAt).toBeTruthy();
  });

  it('returns pipeline stats', async () => {
    await request(app).post('/api/leads').send({ name: 'Stat Lead', phone: '+972521110123', company: 'Stat Co' });
    const stats = await request(app).get('/api/stats');
    expect(stats.status).toBe(200);
    expect(stats.body.totalLeads).toBe(1);
    expect(stats.body.aiMode).toBe('mock');
    expect(stats.body.byStatus.QUALIFYING + stats.body.byStatus.NEW).toBeGreaterThanOrEqual(1);
  });
});
