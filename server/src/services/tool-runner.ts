import { Prisma } from '@prisma/client';
import { z } from 'zod';
import { prisma } from '../db';
import { config } from '../config';
import { buildSummary, analyzeLead } from '../domain/qualification';
import { formatBookingConfirmation, proposeMeetingSlots, readSlots } from '../domain/slots';
import { recomputeLead } from './leads';

const profileSchema = z.object({
  name: z.string().min(1).max(120).nullish(),
  email: z.string().email().max(255).nullish(),
  company: z.string().min(1).max(255).nullish(),
  need: z.string().min(1).max(2000).nullish(),
  budget: z.string().min(1).max(255).nullish(),
  timeline: z.string().min(1).max(255).nullish(),
  authority: z.string().min(1).max(255).nullish(),
});

const summarySchema = z.object({
  summary: z.string().max(600).nullish(),
});

const bookSchema = z.object({
  slotId: z.string().min(1).max(64),
  notes: z.string().max(500).nullish(),
});

function clean(value: string | null | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

export async function executeToolCall(
  leadId: string,
  name: string,
  args: unknown,
  now: Date,
): Promise<unknown> {
  const lead = await prisma.lead.findUnique({
    where: { id: leadId },
    include: { meetings: { where: { status: 'BOOKED' }, take: 1 } },
  });
  if (!lead) return { ok: false, error: 'Lead not found' };

  if (name === 'update_lead_profile') {
    const parsed = profileSchema.safeParse(args ?? {});
    if (!parsed.success) return { ok: false, error: 'Invalid profile fields' };
    const data: Prisma.LeadUpdateInput = {};
    const nameValue = clean(parsed.data.name);
    const email = clean(parsed.data.email);
    const company = clean(parsed.data.company);
    const need = clean(parsed.data.need);
    const budget = clean(parsed.data.budget);
    const timeline = clean(parsed.data.timeline);
    const authority = clean(parsed.data.authority);
    if (nameValue) data.name = nameValue;
    if (email) data.email = email;
    if (company) data.company = company;
    if (need) data.need = need;
    if (budget) data.budget = budget;
    if (timeline) data.timeline = timeline;
    if (authority) data.authority = authority;
    if (Object.keys(data).length > 0) {
      await prisma.lead.update({ where: { id: leadId }, data });
    }
    const analyzed = await recomputeLead(leadId);
    return { ok: true, score: analyzed.score, status: analyzed.status };
  }

  if (name === 'set_lead_qualification') {
    const parsed = summarySchema.safeParse(args ?? {});
    if (!parsed.success) return { ok: false, error: 'Invalid summary' };
    const current = await prisma.lead.findUniqueOrThrow({ where: { id: leadId } });
    const summary = clean(parsed.data.summary) || current.summary || buildSummary(current);
    const analyzed = await recomputeLead(leadId, summary);
    return { ok: true, score: analyzed.score, status: analyzed.status, summary };
  }

  if (name === 'propose_meeting_times') {
    if (lead.meetings.length > 0) return { ok: false, error: 'A meeting is already booked' };
    const analyzed = analyzeLead(lead, false);
    if (analyzed.disqualified || !analyzed.readyForMeeting) {
      return { ok: false, error: 'Lead is not ready for a meeting' };
    }
    const slots = proposeMeetingSlots(now, config.APP_TIMEZONE);
    await prisma.lead.update({
      where: { id: leadId },
      data: {
        proposedSlots: slots as unknown as Prisma.InputJsonValue,
        score: analyzed.score,
        status: analyzed.status,
      },
    });
    return { ok: true, slots };
  }

  if (name === 'book_meeting') {
    const parsed = bookSchema.safeParse(args ?? {});
    if (!parsed.success) return { ok: false, error: 'Invalid slot' };
    const result = await bookProposedSlot(leadId, parsed.data.slotId, { announce: false, notes: clean(parsed.data.notes) });
    if (result.status !== 'booked') return { ok: false, error: result.error };
    return { ok: true, meeting: { id: result.meeting.id, startsAt: result.meeting.startsAt.toISOString(), label: result.label } };
  }

  return { ok: false, error: `Unknown tool ${name}` };
}

export async function bookProposedSlot(
  leadId: string,
  slotId: string,
  options: { announce: boolean; notes?: string },
): Promise<
  | { status: 'booked'; meeting: { id: string; startsAt: Date; endsAt: Date; title: string }; label: string }
  | { status: 'not_found'; error: string }
  | { status: 'bad_slot'; error: string }
  | { status: 'already_booked'; error: string }
> {
  return prisma.$transaction(async (tx) => {
    const lead = await tx.lead.findUnique({
      where: { id: leadId },
      include: { meetings: { where: { status: 'BOOKED' }, take: 1 } },
    });
    if (!lead) return { status: 'not_found' as const, error: 'Lead not found' };
    if (lead.meetings.length > 0) return { status: 'already_booked' as const, error: 'A meeting is already booked' };
    const slot = readSlots(lead.proposedSlots).find((item) => item.id === slotId);
    if (!slot) return { status: 'bad_slot' as const, error: 'Unknown slot' };
    const title = `Intro call${lead.company ? ` · ${lead.company}` : ''}`;
    const meeting = await tx.meeting.create({
      data: {
        leadId,
        title,
        startsAt: new Date(slot.startsAt),
        endsAt: new Date(slot.endsAt),
        status: 'BOOKED',
        notes: options.notes || 'Booked from a proposed slot.',
      },
    });
    const analyzed = analyzeLead(lead, true);
    await tx.lead.update({
      where: { id: leadId },
      data: {
        status: 'MEETING_BOOKED',
        score: analyzed.score,
        summary: lead.summary ?? buildSummary(lead),
        followUpDueAt: null,
      },
    });
    if (options.announce) {
      await tx.message.create({
        data: {
          leadId,
          direction: 'OUTBOUND',
          body: formatBookingConfirmation(slot.label, lead.email),
        },
      });
    }
    return {
      status: 'booked' as const,
      label: slot.label,
      meeting: { id: meeting.id, startsAt: meeting.startsAt, endsAt: meeting.endsAt, title: meeting.title },
    };
  });
}

export async function cancelMeeting(meetingId: string) {
  const meeting = await prisma.meeting.findUnique({ where: { id: meetingId } });
  if (!meeting) return null;
  if (meeting.status === 'CANCELLED') return meeting;
  await prisma.meeting.update({ where: { id: meetingId }, data: { status: 'CANCELLED' } });
  const lead = await prisma.lead.findUniqueOrThrow({ where: { id: meeting.leadId } });
  const analyzed = analyzeLead(lead, false);
  await prisma.lead.update({
    where: { id: lead.id },
    data: { status: analyzed.status, score: analyzed.score },
  });
  const label = new Intl.DateTimeFormat('en-GB', {
    timeZone: config.APP_TIMEZONE,
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).format(meeting.startsAt);
  await prisma.message.create({
    data: {
      leadId: lead.id,
      direction: 'OUTBOUND',
      body: `The intro call on ${label} is cancelled. Reply if you want a new time.`,
    },
  });
  return prisma.meeting.findUniqueOrThrow({
    where: { id: meetingId },
    include: { lead: { select: { id: true, name: true, company: true, phone: true } } },
  });
}
