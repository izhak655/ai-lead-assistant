import { analyzeLead } from '../src/domain/qualification';

describe('analyzeLead', () => {
  it('scores a complete buyer at the top of the scale', () => {
    const result = analyzeLead(
      {
        need: 'Qualify seller leads and book valuation calls on WhatsApp.',
        budget: '8000 ILS/month',
        timeline: 'ASAP',
        authority: 'Decision maker',
        company: 'Cohen & Co Realty',
        email: 'daniel@cohen-realty.example',
      },
      false,
    );
    expect(result.breakdown.map((row) => row.max)).toEqual([30, 25, 20, 15, 10]);
    expect(result.score).toBe(100);
    expect(result.status).toBe('QUALIFIED');
    expect(result.readyForMeeting).toBe(true);
  });

  it('keeps a clinic office manager in qualifying until budget is known', () => {
    const result = analyzeLead(
      {
        need: 'WhatsApp reminders for missed hygiene visits, and a first qualification for new patient inquiries.',
        timeline: 'This quarter',
        authority: 'Office manager',
        company: 'Ramat Aviv Dental',
      },
      false,
    );
    expect(result.status).toBe('QUALIFYING');
    expect(result.score).toBeGreaterThan(40);
    expect(result.score).toBeLessThan(75);
    expect(result.readyForMeeting).toBe(false);
  });

  it('caps and disqualifies a lead with no budget', () => {
    const result = analyzeLead(
      {
        need: 'I need WhatsApp automation for clinic follow-ups and new inquiries.',
        budget: 'No budget',
        timeline: 'ASAP',
        authority: 'Founder',
        company: 'Clinic',
        email: 'a@example.com',
      },
      false,
    );
    expect(result.disqualified).toBe(true);
    expect(result.status).toBe('UNQUALIFIED');
    expect(result.score).toBeLessThanOrEqual(24);
  });

  it('leaves a greeting with no facts as new', () => {
    const result = analyzeLead({}, false);
    expect(result.status).toBe('NEW');
    expect(result.score).toBe(0);
  });

  it('keeps an existing booking even if later facts would disqualify', () => {
    const result = analyzeLead({ budget: 'No budget', need: 'a student project for free' }, true);
    expect(result.status).toBe('MEETING_BOOKED');
  });
});
