import { Prisma } from '@prisma/client';
import { prisma } from './db';
import { log } from './logger';
import { buildDemoLeads } from './seed-data';

async function main(): Promise<void> {
  const existing = await prisma.lead.count();
  if (existing > 0) {
    log.info('seed skipped; database already has leads');
    return;
  }

  const now = new Date();
  const demos = buildDemoLeads(now);
  for (const demo of demos) {
    await prisma.lead.create({
      data: {
        name: demo.name,
        phone: demo.phone,
        email: demo.email,
        company: demo.company,
        source: 'whatsapp',
        status: demo.status,
        score: demo.score,
        need: demo.need,
        budget: demo.budget,
        timeline: demo.timeline,
        authority: demo.authority,
        summary: demo.summary,
        proposedSlots:
          demo.proposedSlots.length > 0 ? (demo.proposedSlots as unknown as Prisma.InputJsonValue) : Prisma.DbNull,
        messages: {
          create: demo.messages.map((message) => ({
            direction: message.direction,
            body: message.body,
            createdAt: new Date(now.getTime() - message.minutesAgo * 60 * 1000),
          })),
        },
        meetings: {
          create: demo.meetings.map((meeting) => ({
            title: meeting.title,
            startsAt: new Date(meeting.startsAt),
            endsAt: new Date(meeting.endsAt),
            status: 'BOOKED' as const,
            notes: meeting.notes,
          })),
        },
      },
    });
  }
  log.info('seeded demo leads', { count: demos.length });
}

main()
  .catch((error: unknown) => {
    log.error('seed failed', { error: error instanceof Error ? error.message : String(error) });
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
