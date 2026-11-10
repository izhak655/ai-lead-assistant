import { config, effectiveAiMode } from '../config';
import { log } from '../logger';
import { prisma } from '../db';
import { followUpBody } from '../domain/copy';
import { planMockTurn, type PlannerLead } from '../domain/planner';
import { formatSlotLabel, readSlots } from '../domain/slots';
import { createMockComplete } from '../ai/mock-client';
import { createOpenAIComplete } from '../ai/openai';
import { systemPrompt } from '../ai/prompt';
import { runAssistant } from '../ai/run-assistant';
import { executeToolCall } from './tool-runner';

export async function processInboundLead(
  leadId: string,
  hooks?: { scheduleFollowUp?: (id: string) => Promise<void> },
  now = new Date(),
): Promise<void> {
  const lead = await prisma.lead.findUnique({
    where: { id: leadId },
    include: {
      messages: { orderBy: { createdAt: 'asc' } },
      meetings: { where: { status: 'BOOKED' }, orderBy: { startsAt: 'desc' }, take: 1 },
    },
  });
  if (!lead) return;
  const last = lead.messages[lead.messages.length - 1];
  if (!last || last.direction !== 'INBOUND') return;

  const booked = lead.meetings[0];
  const plannerLead: PlannerLead = {
    name: lead.name,
    need: lead.need,
    budget: lead.budget,
    timeline: lead.timeline,
    authority: lead.authority,
    email: lead.email,
    company: lead.company,
    status: lead.status,
    proposedSlots: readSlots(lead.proposedSlots),
    hasBookedMeeting: Boolean(booked),
    meetingLabel: booked ? formatSlotLabel(booked.startsAt, config.APP_TIMEZONE) : null,
  };
  const plan = planMockTurn({
    lead: plannerLead,
    inboundText: last.body,
    now,
    timeZone: config.APP_TIMEZONE,
  });

  const history = lead.messages.slice(-20).map((message) => ({
    role: message.direction === 'INBOUND' ? ('user' as const) : ('assistant' as const),
    content: message.body,
  }));

  const useOpenAI = effectiveAiMode() === 'openai';
  let mutated = false;
  const execute = async (call: { id: string; name: string; arguments: unknown }) => {
    mutated = true;
    return executeToolCall(leadId, call.name, call.arguments, now);
  };

  let reply: string;
  try {
    reply = await runAssistant({
      system: systemPrompt(now, config.APP_TIMEZONE),
      history,
      complete: useOpenAI ? createOpenAIComplete() : createMockComplete(plan),
      execute,
    });
  } catch (error) {
    if (useOpenAI && !mutated) {
      log.error('OpenAI request failed; using mock', {
        error: error instanceof Error ? error.message : String(error),
        leadId,
      });
      reply = await runAssistant({
        system: systemPrompt(now, config.APP_TIMEZONE),
        history,
        complete: createMockComplete(plan),
        execute,
      });
    } else {
      throw error;
    }
  }

  await prisma.message.create({
    data: { leadId, direction: 'OUTBOUND', body: reply },
  });

  const updated = await prisma.lead.findUnique({ where: { id: leadId } });
  if (updated && updated.status === 'QUALIFYING' && !updated.followUpSentAt && hooks?.scheduleFollowUp) {
    await hooks.scheduleFollowUp(leadId);
  }
}

export async function processFollowUp(leadId: string): Promise<void> {
  const lead = await prisma.lead.findUnique({ where: { id: leadId } });
  if (!lead || lead.status !== 'QUALIFYING' || lead.followUpSentAt) return;
  const last = await prisma.message.findFirst({ where: { leadId }, orderBy: { createdAt: 'desc' } });
  if (!last || last.direction !== 'OUTBOUND') return;
  await prisma.message.create({
    data: { leadId, direction: 'OUTBOUND', body: followUpBody(lead.name) },
  });
  await prisma.lead.update({
    where: { id: leadId },
    data: { followUpSentAt: new Date(), followUpDueAt: null },
  });
}
