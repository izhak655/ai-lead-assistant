import { matchSlotChoice, proposeMeetingSlots } from '../src/domain/slots';

describe('proposeMeetingSlots', () => {
  it('offers three future Sunday–Thursday slots at 10:00, 13:00, or 16:00', () => {
    const now = new Date('2026-11-13T15:00:00.000Z');
    const slots = proposeMeetingSlots(now, 'Asia/Jerusalem', 3);
    expect(slots).toHaveLength(3);
    expect(slots.map((slot) => slot.id)).toEqual(['slot_1', 'slot_2', 'slot_3']);

    const seen = new Set<string>();
    for (const slot of slots) {
      const start = new Date(slot.startsAt);
      expect(start.getTime()).toBeGreaterThan(now.getTime());
      expect(new Date(slot.endsAt).getTime() - start.getTime()).toBe(30 * 60 * 1000);
      const weekday = new Intl.DateTimeFormat('en-US', {
        timeZone: 'Asia/Jerusalem',
        weekday: 'short',
      }).format(start);
      expect(['Sun', 'Mon', 'Tue', 'Wed', 'Thu']).toContain(weekday);
      const hour = new Intl.DateTimeFormat('en-GB', {
        timeZone: 'Asia/Jerusalem',
        hour: '2-digit',
        hourCycle: 'h23',
      }).format(start);
      expect(['10', '13', '16']).toContain(hour);
      seen.add(slot.startsAt);
      expect(slot.label).toMatch(/\d{2}:\d{2}$/);
    }
    expect(seen.size).toBe(3);
  });

  it('skips Friday evening and starts on Sunday morning', () => {
    const slots = proposeMeetingSlots(new Date('2026-11-13T15:00:00.000Z'), 'Asia/Jerusalem', 1);
    const first = slots[0];
    expect(first).toBeDefined();
    const weekday = new Intl.DateTimeFormat('en-US', {
      timeZone: 'Asia/Jerusalem',
      weekday: 'short',
    }).format(new Date(first!.startsAt));
    expect(weekday).toBe('Sun');
    expect(first!.label).toContain('10:00');
  });
});

describe('matchSlotChoice', () => {
  const slots = proposeMeetingSlots(new Date('2026-11-13T15:00:00.000Z'), 'Asia/Jerusalem', 3);

  it('matches an option number', () => {
    expect(matchSlotChoice('Option 2 works for me', slots)?.id).toBe('slot_2');
  });

  it('matches a bare digit when that is the whole message', () => {
    expect(matchSlotChoice('1', slots)?.id).toBe('slot_1');
  });

  it('returns null when nothing was offered', () => {
    expect(matchSlotChoice('option 1', [])).toBeNull();
  });
});
