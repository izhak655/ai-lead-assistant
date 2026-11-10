import { z } from 'zod';
import { processFollowUp, processInboundLead } from '../services/automation';
import { enqueueFollowUp, type JobData } from './jobs';

const jobSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('process-inbound'), leadId: z.string().min(1) }),
  z.object({ type: z.literal('send-follow-up'), leadId: z.string().min(1) }),
]);

export async function handleAutomationJob(data: JobData): Promise<void> {
  const parsed = jobSchema.parse(data);
  if (parsed.type === 'process-inbound') {
    await processInboundLead(parsed.leadId, { scheduleFollowUp: enqueueFollowUp });
    return;
  }
  await processFollowUp(parsed.leadId);
}
