import { buildDemoLeads } from '../src/seed-data';
import { analyzeLead } from '../src/domain/qualification';

describe('buildDemoLeads', () => {
  const leads = buildDemoLeads(new Date('2026-11-10T12:00:00.000Z'));

  function byName(name: string) {
    const lead = leads.find((item) => item.name === name);
    if (!lead) throw new Error(`missing ${name}`);
    return lead;
  }

  it('covers every pipeline stage and keeps scores consistent', () => {
    expect(new Set(leads.map((lead) => lead.status))).toEqual(
      new Set(['NEW', 'QUALIFYING', 'QUALIFIED', 'UNQUALIFIED', 'MEETING_BOOKED']),
    );
    for (const lead of leads) {
      const analyzed = analyzeLead(lead, lead.meetings.length > 0);
      expect(lead.score).toBe(analyzed.score);
      expect(lead.status).toBe(analyzed.status);
      expect(lead.messages[lead.messages.length - 1]?.direction).toBe('OUTBOUND');
    }
  });

  it('gives the qualified realty lead open slots and the studio a future meeting', () => {
    const daniel = byName('Daniel Cohen');
    expect(daniel.status).toBe('QUALIFIED');
    expect(daniel.score).toBeGreaterThanOrEqual(90);
    expect(daniel.proposedSlots).toHaveLength(3);
    expect(daniel.messages[daniel.messages.length - 1]?.body).toContain(daniel.proposedSlots[0]?.label);

    const shira = byName('Shira Ben-David');
    expect(shira.status).toBe('MEETING_BOOKED');
    expect(new Date(shira.meetings[0]!.startsAt).getTime()).toBeGreaterThan(new Date('2026-11-10T12:00:00.000Z').getTime());

    const lior = byName('Lior Avraham');
    expect(new Date(lior.meetings[0]!.startsAt).getTime()).toBeLessThan(new Date('2026-11-10T12:00:00.000Z').getTime());

    expect(byName('Maya Azulay').status).toBe('NEW');
    expect(byName('Noa Levi').status).toBe('QUALIFYING');
    expect(byName('Omar Haddad').status).toBe('UNQUALIFIED');
    expect(byName('Omar Haddad').score).toBeLessThanOrEqual(24);
  });
});
