import { DECLINE_REPLY } from './domain/copy';
import { analyzeLead, buildSummary, type LeadStatus } from './domain/qualification';
import {
  addCalendarDays,
  formatBookingConfirmation,
  formatSlotLabel,
  formatSlotOffer,
  proposeMeetingSlots,
  zonedTimeToUtc,
  zonedYmd,
  type MeetingSlot,
} from './domain/slots';

const TIME_ZONE = 'Asia/Jerusalem';

export type DemoMessage = {
  direction: 'INBOUND' | 'OUTBOUND';
  body: string;
  minutesAgo: number;
};

export type DemoMeeting = {
  title: string;
  startsAt: string;
  endsAt: string;
  notes: string;
};

export type DemoLead = {
  name: string;
  phone: string;
  email: string | null;
  company: string | null;
  need: string | null;
  budget: string | null;
  timeline: string | null;
  authority: string | null;
  summary: string;
  score: number;
  status: LeadStatus;
  proposedSlots: MeetingSlot[];
  messages: DemoMessage[];
  meetings: DemoMeeting[];
};

type Draft = Omit<DemoLead, 'summary' | 'score' | 'status'> & { hasBookedMeeting: boolean };

function finish(draft: Draft): DemoLead {
  const facts = {
    need: draft.need,
    budget: draft.budget,
    timeline: draft.timeline,
    authority: draft.authority,
    email: draft.email,
    company: draft.company,
  };
  const analyzed = analyzeLead(facts, draft.hasBookedMeeting);
  return {
    name: draft.name,
    phone: draft.phone,
    email: draft.email,
    company: draft.company,
    need: draft.need,
    budget: draft.budget,
    timeline: draft.timeline,
    authority: draft.authority,
    summary: buildSummary(facts),
    score: analyzed.score,
    status: analyzed.status,
    proposedSlots: draft.proposedSlots,
    messages: draft.messages,
    meetings: draft.meetings,
  };
}

function pastSlot(now: Date): { startsAt: string; endsAt: string; label: string } {
  let cursor = addCalendarDays(zonedYmd(now, TIME_ZONE), -2);
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const starts = zonedTimeToUtc(cursor, 13, 0, TIME_ZONE);
    const weekday = new Intl.DateTimeFormat('en-US', { timeZone: TIME_ZONE, weekday: 'short' }).format(starts);
    if (['Sun', 'Mon', 'Tue', 'Wed', 'Thu'].includes(weekday) && starts.getTime() < now.getTime() - 60 * 60 * 1000) {
      return {
        startsAt: starts.toISOString(),
        endsAt: new Date(starts.getTime() + 30 * 60 * 1000).toISOString(),
        label: formatSlotLabel(starts, TIME_ZONE),
      };
    }
    cursor = addCalendarDays(cursor, -1);
  }
  const starts = new Date(now.getTime() - 50 * 60 * 60 * 1000);
  return {
    startsAt: starts.toISOString(),
    endsAt: new Date(starts.getTime() + 30 * 60 * 1000).toISOString(),
    label: formatSlotLabel(starts, TIME_ZONE),
  };
}

export function buildDemoLeads(now: Date): DemoLead[] {
  const slots = proposeMeetingSlots(now, TIME_ZONE, 3);
  const first = slots[0];
  const second = slots[1];
  const third = slots[2];
  if (!first || !second || !third) {
    throw new Error('Demo seed could not propose three meeting slots');
  }
  const earlier = pastSlot(now);

  const maya = finish({
    name: 'Maya Azulay',
    phone: '+972521110001',
    email: null,
    company: null,
    need: null,
    budget: null,
    timeline: null,
    authority: null,
    proposedSlots: [],
    hasBookedMeeting: false,
    meetings: [],
    messages: [
      {
        direction: 'INBOUND',
        minutesAgo: 300,
        body: 'Hi, I saw your ad about an AI assistant for leads',
      },
      {
        direction: 'OUTBOUND',
        minutesAgo: 298,
        body: 'Hi. What should the assistant help with — qualifying leads, WhatsApp follow-ups, scheduling, or something else?',
      },
    ],
  });

  const noa = finish({
    name: 'Noa Levi',
    phone: '+972521110002',
    email: null,
    company: 'Ramat Aviv Dental',
    need: 'WhatsApp reminders for missed hygiene visits, and a first qualification for new patient inquiries.',
    budget: null,
    timeline: 'This quarter',
    authority: 'Office manager',
    proposedSlots: [],
    hasBookedMeeting: false,
    meetings: [],
    messages: [
      {
        direction: 'INBOUND',
        minutesAgo: 220,
        body: "Hi, I'm Noa Levi. I run the front desk at Ramat Aviv Dental.",
      },
      {
        direction: 'OUTBOUND',
        minutesAgo: 218,
        body: 'Nice to meet you, Noa. What should the assistant take on for the clinic?',
      },
      {
        direction: 'INBOUND',
        minutesAgo: 200,
        body: "Patients miss hygiene visits, and new WhatsApp inquiries sit until the evening. I want reminders plus a first qualification before they reach the dentist. I'm the office manager, and we're hoping to do this this quarter.",
      },
      {
        direction: 'OUTBOUND',
        minutesAgo: 198,
        body: 'This quarter is a useful timeline. What budget range are you considering? A monthly figure is enough.',
      },
    ],
  });

  const daniel = finish({
    name: 'Daniel Cohen',
    phone: '+972521110003',
    email: 'daniel@cohen-realty.example',
    company: 'Cohen & Co Realty',
    need: 'Qualify seller leads from Facebook ads and book valuation calls on WhatsApp for 12 agents.',
    budget: '8000 ILS/month',
    timeline: 'ASAP',
    authority: 'Decision maker',
    proposedSlots: slots,
    hasBookedMeeting: false,
    meetings: [],
    messages: [
      {
        direction: 'INBOUND',
        minutesAgo: 1500,
        body: "Hi, I'm Daniel Cohen from Cohen & Co Realty. We have 12 agents and seller leads from Facebook are going cold.",
      },
      {
        direction: 'OUTBOUND',
        minutesAgo: 1496,
        body: 'Nice to meet you, Daniel. Are you the person who would decide on this, and when do you want it running?',
      },
      {
        direction: 'INBOUND',
        minutesAgo: 1400,
        body: 'Yes, I decide. We need this ASAP — qualify the leads and book valuation calls on WhatsApp.',
      },
      {
        direction: 'OUTBOUND',
        minutesAgo: 1396,
        body: 'ASAP works. What budget range are you considering? A monthly figure is enough.',
      },
      {
        direction: 'INBOUND',
        minutesAgo: 1300,
        body: 'Budget is 8000 ILS/month. Email me at daniel@cohen-realty.example.',
      },
      {
        direction: 'OUTBOUND',
        minutesAgo: 1298,
        body: formatSlotOffer(slots),
      },
    ],
  });

  const shira = finish({
    name: 'Shira Ben-David',
    phone: '+972521110004',
    email: 'shira@bendavid.example',
    company: 'Ben-David Studio',
    need: 'Recover abandoned checkouts and answer sizing questions on WhatsApp for an online fashion shop.',
    budget: '5000 ILS/month',
    timeline: 'This month',
    authority: 'Decision maker',
    proposedSlots: slots,
    hasBookedMeeting: true,
    meetings: [
      {
        title: 'Intro call · Ben-David Studio',
        startsAt: first.startsAt,
        endsAt: first.endsAt,
        notes: 'Checkout recovery and sizing replies.',
      },
    ],
    messages: [
      {
        direction: 'INBOUND',
        minutesAgo: 900,
        body: "I'm Shira Ben-David, founder at Ben-David Studio. We sell fashion online and sizing questions plus abandoned checkouts are stuck in WhatsApp.",
      },
      {
        direction: 'OUTBOUND',
        minutesAgo: 896,
        body: 'Thanks — Ben-David Studio. When do you want this running, and what budget should I plan for?',
      },
      {
        direction: 'INBOUND',
        minutesAgo: 860,
        body: "This month. Budget is 5000 ILS/month. I'm the decision maker. Email shira@bendavid.example.",
      },
      {
        direction: 'OUTBOUND',
        minutesAgo: 858,
        body: formatSlotOffer(slots),
      },
      {
        direction: 'INBOUND',
        minutesAgo: 840,
        body: 'Option 1 works for me',
      },
      {
        direction: 'OUTBOUND',
        minutesAgo: 839,
        body: formatBookingConfirmation(first.label, 'shira@bendavid.example'),
      },
    ],
  });

  const omar = finish({
    name: 'Omar Haddad',
    phone: '+972521110005',
    email: null,
    company: null,
    need: 'Looking for a student project that can qualify leads for free.',
    budget: 'No budget',
    timeline: 'Just looking',
    authority: null,
    proposedSlots: [],
    hasBookedMeeting: false,
    meetings: [],
    messages: [
      {
        direction: 'INBOUND',
        minutesAgo: 80,
        body: "Hi, I'm Omar. I'm a student and I have no budget. Just curious how the WhatsApp bot works.",
      },
      {
        direction: 'OUTBOUND',
        minutesAgo: 78,
        body: DECLINE_REPLY,
      },
    ],
  });

  const lior = finish({
    name: 'Lior Avraham',
    phone: '+972521110006',
    email: 'lior@avraham.example',
    company: 'Avraham Digital',
    need: 'Route inbound campaign leads to the right closer and book intro calls over WhatsApp.',
    budget: '7000 ILS/month',
    timeline: 'This month',
    authority: 'Decision maker',
    proposedSlots: [],
    hasBookedMeeting: true,
    meetings: [
      {
        title: 'Intro call · Avraham Digital',
        startsAt: earlier.startsAt,
        endsAt: earlier.endsAt,
        notes: 'Campaign handoff for a performance agency.',
      },
    ],
    messages: [
      {
        direction: 'INBOUND',
        minutesAgo: 6000,
        body: "Lior from Avraham Digital. I need WhatsApp routing for campaign leads, this month, budget 7000 ILS/month. I make the decision. lior@avraham.example.",
      },
      {
        direction: 'OUTBOUND',
        minutesAgo: 5990,
        body: formatBookingConfirmation(earlier.label, 'lior@avraham.example'),
      },
    ],
  });

  return [maya, noa, daniel, shira, omar, lior];
}
