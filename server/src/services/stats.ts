import { config, effectiveAiMode } from '../config';
import { LEAD_STATUSES } from '../domain/qualification';
import { prisma } from '../db';

export async function getStats() {
  const [grouped, aggregate, upcomingMeetings] = await Promise.all([
    prisma.lead.groupBy({
      by: ['status'],
      _count: { _all: true },
    }),
    prisma.lead.aggregate({
      _avg: { score: true },
      _count: { _all: true },
    }),
    prisma.meeting.count({
      where: { status: 'BOOKED', startsAt: { gte: new Date() } },
    }),
  ]);

  const byStatus = Object.fromEntries(LEAD_STATUSES.map((status) => [status, 0])) as Record<
    (typeof LEAD_STATUSES)[number],
    number
  >;
  for (const row of grouped) {
    byStatus[row.status] = row._count._all;
  }

  return {
    totalLeads: aggregate._count._all,
    averageScore: Math.round(aggregate._avg.score ?? 0),
    upcomingMeetings,
    byStatus,
    aiMode: effectiveAiMode(),
    queueDriver: config.QUEUE_DRIVER,
  };
}
