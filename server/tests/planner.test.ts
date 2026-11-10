import { planMockTurn, type PlannerLead } from '../src/domain/planner';
import { proposeMeetingSlots } from '../src/domain/slots';

const now = new Date('2026-11-10T08:00:00.000Z');

function lead(overrides: Partial<PlannerLead> = {}): PlannerLead {
  return {
    name: 'Unknown',
    need: null,
    budget: null,
    timeline: null,
    authority: null,
    email: null,
    company: null,
    status: 'NEW',
    proposedSlots: [],
    hasBookedMeeting: false,
    ...overrides,
  };
}

describe('planMockTurn', () => {
  it('asks what the assistant should help with on a greeting', () => {
    const plan = planMockTurn({
      lead: lead(),
      inboundText: 'Hi',
      now,
      timeZone: 'Asia/Jerusalem',
    });
    expect(plan.calls).toEqual([]);
    expect(plan.reply).toMatch(/qualifying leads/i);
  });

  it('asks for budget when the need is known and the budget is not', () => {
    const plan = planMockTurn({
      lead: lead({
        name: 'Noa Levi',
        company: 'Ramat Aviv Dental',
        authority: 'Office manager',
        timeline: 'This quarter',
        need: 'WhatsApp reminders for missed hygiene visits and new patient inquiries.',
        status: 'QUALIFYING',
      }),
      inboundText: 'Still working out the numbers',
      now,
      timeZone: 'Asia/Jerusalem',
    });
    expect(plan.calls.some((call) => call.name === 'propose_meeting_times')).toBe(false);
    expect(plan.reply).toMatch(/budget/i);
  });

  it('proposes real slots once the lead is a fit', () => {
    const plan = planMockTurn({
      lead: lead({ name: 'Test User' }),
      inboundText:
        "I'm Test User, founder at BrightPath. I want to automate WhatsApp follow-ups for inbound sales leads. Budget is 4000 ILS/month and we need this ASAP. Email test.user@brightpath.example",
      now,
      timeZone: 'Asia/Jerusalem',
    });
    expect(plan.calls.map((call) => call.name)).toEqual([
      'update_lead_profile',
      'set_lead_qualification',
      'propose_meeting_times',
    ]);
    expect(plan.reply).toMatch(/1\)/);
    expect(plan.reply).toMatch(/2\)/);
    expect(plan.reply).toMatch(/3\)/);
  });

  it('books the chosen slot', () => {
    const slots = proposeMeetingSlots(now, 'Asia/Jerusalem', 3);
    const plan = planMockTurn({
      lead: lead({
        name: 'Test User',
        company: 'BrightPath',
        email: 'test.user@brightpath.example',
        need: 'Automate WhatsApp follow-ups for inbound sales leads across the team.',
        budget: '4000 ILS/month',
        timeline: 'ASAP',
        authority: 'Decision maker',
        status: 'QUALIFIED',
        proposedSlots: slots,
      }),
      inboundText: 'Option 2 works for me',
      now,
      timeZone: 'Asia/Jerusalem',
    });
    const booking = plan.calls.find((call) => call.name === 'book_meeting');
    expect(booking?.arguments.slotId).toBe('slot_2');
    expect(plan.reply).toMatch(/^Booked:/);
  });

  it('declines a student with no budget', () => {
    const plan = planMockTurn({
      lead: lead(),
      inboundText: "I'm a student and I have no budget. Just curious about the tech and how WhatsApp bots qualify leads.",
      now,
      timeZone: 'Asia/Jerusalem',
    });
    expect(plan.calls.some((call) => call.name === 'propose_meeting_times' || call.name === 'book_meeting')).toBe(false);
    expect(plan.reply).toMatch(/won't book a sales meeting/i);
  });
});
