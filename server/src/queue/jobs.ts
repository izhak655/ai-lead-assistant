import { Queue } from 'bullmq';
import IORedis from 'ioredis';
import { config } from '../config';
import { log } from '../logger';
import { prisma } from '../db';
import { processInboundLead } from '../services/automation';
import { AUTOMATION_QUEUE, QUEUE_PREFIX } from './constants';

export type JobData =
  | { type: 'process-inbound'; leadId: string }
  | { type: 'send-follow-up'; leadId: string };

let connection: IORedis | null = null;
let queue: Queue<JobData> | null = null;

export function queueDriver(): 'inline' | 'bullmq' {
  const value = (process.env.QUEUE_DRIVER ?? config.QUEUE_DRIVER).toLowerCase();
  return value === 'inline' ? 'inline' : 'bullmq';
}

function getQueue(): Queue<JobData> {
  if (!queue) {
    connection = new IORedis(config.REDIS_URL, { maxRetriesPerRequest: null });
    connection.on('error', (error: Error) => {
      log.error('redis connection error', { error: error.message });
    });
    queue = new Queue<JobData>(AUTOMATION_QUEUE, { connection, prefix: QUEUE_PREFIX });
  }
  return queue;
}

export async function closeQueue(): Promise<void> {
  if (queue) await queue.close();
  queue = null;
  if (connection) await connection.quit();
  connection = null;
}

export async function enqueueInbound(leadId: string): Promise<void> {
  if (queueDriver() === 'inline') {
    await processInboundLead(leadId, { scheduleFollowUp: enqueueFollowUp });
    return;
  }
  await getQueue().add(
    'automation',
    { type: 'process-inbound', leadId },
    { attempts: 3, backoff: { type: 'exponential', delay: 2000 }, removeOnComplete: 500, removeOnFail: 500 },
  );
}

export async function enqueueFollowUp(leadId: string): Promise<void> {
  const lead = await prisma.lead.findUnique({ where: { id: leadId } });
  if (!lead || lead.followUpSentAt || lead.status !== 'QUALIFYING') return;
  const delay = config.FOLLOW_UP_DELAY_MS;
  await prisma.lead.update({
    where: { id: leadId },
    data: { followUpDueAt: new Date(Date.now() + delay) },
  });
  if (queueDriver() === 'inline') return;
  try {
    await getQueue().add(
      'automation',
      { type: 'send-follow-up', leadId },
      {
        delay,
        jobId: `followup-${leadId}`,
        attempts: 3,
        removeOnComplete: 200,
        removeOnFail: 200,
      },
    );
  } catch (error) {
    log.info('follow-up already queued', {
      leadId,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}
