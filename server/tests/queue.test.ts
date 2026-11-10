import { Queue } from 'bullmq';
import IORedis from 'ioredis';
import { config } from '../src/config';
import { prisma } from '../src/db';
import { AUTOMATION_QUEUE, QUEUE_PREFIX } from '../src/queue/constants';
import { closeQueue, enqueueFollowUp } from '../src/queue/jobs';

describe('BullMQ follow-up', () => {
  const previous = process.env.QUEUE_DRIVER;

  afterAll(async () => {
    process.env.QUEUE_DRIVER = previous;
    await closeQueue();
    await prisma.$disconnect();
  });

  it('stores a delayed follow-up on the automation queue', async () => {
    process.env.QUEUE_DRIVER = 'bullmq';
    const phone = `+97253${Math.floor(Math.random() * 1_000_0000)
      .toString()
      .padStart(7, '0')}`;
    const lead = await prisma.lead.create({
      data: {
        name: 'Queue Lead',
        phone,
        status: 'QUALIFYING',
        need: 'Need WhatsApp follow-ups for inbound demo requests from the site.',
        score: 42,
      },
    });

    const connection = new IORedis(config.REDIS_URL, { maxRetriesPerRequest: null });
    const queue = new Queue(AUTOMATION_QUEUE, { connection, prefix: QUEUE_PREFIX });
    try {
      await enqueueFollowUp(lead.id);
      const job = await queue.getJob(`followup-${lead.id}`);
      expect(job).toBeTruthy();
      expect(job?.opts.delay).toBe(config.FOLLOW_UP_DELAY_MS);
      const fresh = await prisma.lead.findUniqueOrThrow({ where: { id: lead.id } });
      expect(fresh.followUpDueAt).not.toBeNull();
      if (job) await job.remove();
    } finally {
      await prisma.lead.delete({ where: { id: lead.id } });
      await queue.close();
      await connection.quit();
    }
  });
});
