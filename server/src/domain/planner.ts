import { DECLINE_REPLY, OPENING_QUESTION } from './copy';
import { extractFields, type ExtractedFields } from './extract';
import { analyzeLead, buildSummary, type LeadFacts, type LeadStatus } from './qualification';
import {
  formatBookingConfirmation,
  formatSlotOffer,
  matchSlotChoice,
  proposeMeetingSlots,
  type MeetingSlot,
} from './slots';

export type PlannerLead = LeadFacts & {
  name: string;
  status: LeadStatus;
  proposedSlots: MeetingSlot[];
  hasBookedMeeting: boolean;
  meetingLabel?: string | null;
};

export type PlannedCall = {
  name: 'update_lead_profile' | 'set_lead_qualification' | 'propose_meeting_times' | 'book_meeting';
  arguments: Record<string, unknown>;
};

export type MockPlan = {
  calls: PlannedCall[];
  reply: string;
};

function firstName(name: string): string {
  if (!name || name === 'Unknown') return '';
  return name.split(' ')[0] ?? '';
}

function acknowledgement(extracted: ExtractedFields, lead: PlannerLead): string {
  if (extracted.name && (lead.name === 'Unknown' || lead.name === '')) return `Nice to meet you, ${extracted.name}.`;
  if (extracted.company) return `Thanks — ${extracted.company}.`;
  if (extracted.budget && extracted.budget !== 'No budget') return `Noted, budget ${extracted.budget}.`;
  if (extracted.timeline) return `${extracted.timeline} is a useful timeline.`;
  if (extracted.authority) return 'Thanks, that helps.';
  return 'Thanks for the detail.';
}

function nextQuestion(facts: LeadFacts): string | null {
  if (!facts.need) return OPENING_QUESTION;
  if (!facts.company) return 'Which company is this for?';
  if (!facts.authority) return 'Are you the person who would decide on a tool like this?';
  if (!facts.timeline) return 'When are you hoping to have this running?';
  if (!facts.budget) return 'What budget range are you considering? A monthly figure is enough.';
  return null;
}

function mergeFacts(lead: PlannerLead, extracted: ExtractedFields): LeadFacts {
  return {
    need: lead.need || extracted.need || null,
    budget: extracted.budget || lead.budget || null,
    timeline: extracted.timeline || lead.timeline || null,
    authority: extracted.authority || lead.authority || null,
    email: extracted.email || lead.email || null,
    company: extracted.company || lead.company || null,
  };
}

export function planMockTurn(input: {
  lead: PlannerLead;
  inboundText: string;
  now: Date;
  timeZone: string;
}): MockPlan {
  const { lead, inboundText, now, timeZone } = input;
  if (lead.hasBookedMeeting) {
    const when = lead.meetingLabel ? ` for ${lead.meetingLabel}` : '';
    return {
      calls: [],
      reply: `You're already booked${when}. If you need to reschedule, say so and we can move it.`,
    };
  }

  const extracted = extractFields(inboundText);
  const calls: PlannedCall[] = [];
  const profile: Record<string, string> = {};
  if (extracted.name && (lead.name === 'Unknown' || lead.name === '')) profile.name = extracted.name;
  if (extracted.email) profile.email = extracted.email;
  if (extracted.company && extracted.company !== lead.company) profile.company = extracted.company;
  if (extracted.need && !lead.need) profile.need = extracted.need;
  if (extracted.budget && extracted.budget !== lead.budget) profile.budget = extracted.budget;
  if (extracted.timeline && extracted.timeline !== lead.timeline) profile.timeline = extracted.timeline;
  if (extracted.authority && extracted.authority !== lead.authority) profile.authority = extracted.authority;

  if (Object.keys(profile).length > 0) {
    calls.push({ name: 'update_lead_profile', arguments: profile });
  }

  const facts = mergeFacts(lead, extracted);
  const analyzed = analyzeLead(facts, false);
  if (Object.keys(profile).length > 0) {
    calls.push({ name: 'set_lead_qualification', arguments: { summary: buildSummary(facts) } });
  }

  const choice = matchSlotChoice(inboundText, lead.proposedSlots);
  if (choice) {
    calls.push({ name: 'book_meeting', arguments: { slotId: choice.id } });
    return { calls, reply: formatBookingConfirmation(choice.label, facts.email) };
  }

  if (analyzed.disqualified) {
    return { calls, reply: DECLINE_REPLY };
  }

  if (analyzed.readyForMeeting) {
    const slots = proposeMeetingSlots(now, timeZone);
    if (lead.proposedSlots.length === 0 && slots.length > 0) {
      calls.push({ name: 'propose_meeting_times', arguments: {} });
      return { calls, reply: formatSlotOffer(slots) };
    }
    if (lead.proposedSlots.length > 0) {
      return { calls, reply: formatSlotOffer(lead.proposedSlots) };
    }
  }

  const question = nextQuestion(facts);
  if (!question) {
    return {
      calls,
      reply: 'Thanks. I have the outline — a teammate can take the next step from here.',
    };
  }

  const greetingOnly = /^(hi|hello|hey|shalom|good morning|good afternoon)[!.\s]*$/i.test(inboundText.trim());
  if (greetingOnly) {
    const who = firstName(lead.name);
    const hello = who ? `Hi ${who}.` : 'Hi.';
    return { calls, reply: `${hello} ${question}` };
  }
  if (Object.keys(profile).length === 0) return { calls, reply: question };
  return { calls, reply: `${acknowledgement(extracted, lead)} ${question}` };
}
