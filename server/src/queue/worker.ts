import { Worker } from 'bullmq';
import IORedis from 'ioredis';
import { config } from '../config';
import { log } from '../logger';
import { prisma } from '../db';
import { handleAutomationJob } from './processor';
import { AUTOMATION_QUEUE, QUEUE_PREFIX } from './constants';
import type { JobData } from './jobs';

export function startWorker(): Worker<JobData> {
  const connection = new IORedis(config.REDIS_URL, { maxRetriesPerRequest: null });
  connection.on('error', (error: Error) => {
    log.error('worker redis error', { error: error.message });
  });
  const worker = new Worker<JobData>(
    AUTOMATION_QUEUE,
    async (job) => {
      await handleAutomationJob(job.data);
    },
    { connection, prefix: QUEUE_PREFIX, concurrency: 4 },
  );
  worker.on('failed', (job, error) => {
    log.error('job failed', { id: job?.id, error: error.message });
  });
  worker.on('ready', () => {
    log.info('worker ready', { queue: AUTOMATION_QUEUE, aiMode: config.AI_MODE });
  });

  const shutdown = async () => {
    await worker.close();
    await connection.quit();
    await prisma.$disconnect();
    process.exit(0);
  };
  process.on('SIGTERM', () => {
    void shutdown();
  });
  process.on('SIGINT', () => {
    void shutdown();
  });
  return worker;
}
