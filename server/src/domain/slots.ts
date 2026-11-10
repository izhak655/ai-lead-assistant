export type MeetingSlot = {
  id: string;
  startsAt: string;
  endsAt: string;
  label: string;
};

const BUSINESS_DAYS = new Set(['Sun', 'Mon', 'Tue', 'Wed', 'Thu']);
const SLOT_HOURS = [10, 13, 16];

type Ymd = { year: number; month: number; day: number };

function zonedParts(instant: Date, timeZone: string): Record<string, string> {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hourCycle: 'h23',
    weekday: 'short',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
  const parts: Record<string, string> = {};
  for (const part of formatter.formatToParts(instant)) {
    if (part.type !== 'literal') parts[part.type] = part.value;
  }
  return parts;
}

function offsetMs(instant: Date, timeZone: string): number {
  const parts = zonedParts(instant, timeZone);
  const hour = parts.hour === '24' ? 0 : Number(parts.hour);
  const asUtc = Date.UTC(
    Number(parts.year),
    Number(parts.month) - 1,
    Number(parts.day),
    hour,
    Number(parts.minute),
    Number(parts.second),
  );
  return asUtc - instant.getTime();
}

export function zonedTimeToUtc(ymd: Ymd, hour: number, minute: number, timeZone: string): Date {
  const wallAsUtc = Date.UTC(ymd.year, ymd.month - 1, ymd.day, hour, minute, 0);
  let utc = wallAsUtc;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    utc = wallAsUtc - offsetMs(new Date(utc), timeZone);
  }
  return new Date(utc);
}

export function zonedYmd(instant: Date, timeZone: string): Ymd {
  const parts = zonedParts(instant, timeZone);
  return { year: Number(parts.year), month: Number(parts.month), day: Number(parts.day) };
}

export function addCalendarDays(ymd: Ymd, days: number): Ymd {
  const shifted = new Date(Date.UTC(ymd.year, ymd.month - 1, ymd.day + days));
  return { year: shifted.getUTCFullYear(), month: shifted.getUTCMonth() + 1, day: shifted.getUTCDate() };
}

function weekdayOf(ymd: Ymd, timeZone: string): string {
  const noon = zonedTimeToUtc(ymd, 12, 0, timeZone);
  return new Intl.DateTimeFormat('en-US', { timeZone, weekday: 'short' }).format(noon);
}

export function formatSlotLabel(instant: Date, timeZone: string): string {
  const weekday = new Intl.DateTimeFormat('en-GB', { timeZone, weekday: 'short' }).format(instant);
  const day = new Intl.DateTimeFormat('en-GB', { timeZone, day: 'numeric', month: 'short' }).format(instant);
  const time = new Intl.DateTimeFormat('en-GB', {
    timeZone,
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).format(instant);
  return `${weekday} ${day} · ${time}`;
}

export function proposeMeetingSlots(now: Date, timeZone: string, count = 3): MeetingSlot[] {
  const slots: MeetingSlot[] = [];
  const start = zonedYmd(now, timeZone);
  for (let dayOffset = 0; dayOffset < 21 && slots.length < count; dayOffset += 1) {
    const ymd = addCalendarDays(start, dayOffset);
    if (!BUSINESS_DAYS.has(weekdayOf(ymd, timeZone))) continue;
    for (const hour of SLOT_HOURS) {
      const starts = zonedTimeToUtc(ymd, hour, 0, timeZone);
      if (starts.getTime() < now.getTime() + 30 * 60 * 1000) continue;
      const ends = new Date(starts.getTime() + 30 * 60 * 1000);
      slots.push({
        id: `slot_${slots.length + 1}`,
        startsAt: starts.toISOString(),
        endsAt: ends.toISOString(),
        label: formatSlotLabel(starts, timeZone),
      });
      if (slots.length >= count) break;
    }
  }
  return slots;
}

export function readSlots(value: unknown): MeetingSlot[] {
  if (!Array.isArray(value)) return [];
  const slots: MeetingSlot[] = [];
  for (const item of value) {
    if (!item || typeof item !== 'object') continue;
    const record = item as Record<string, unknown>;
    if (
      typeof record.id !== 'string' ||
      typeof record.startsAt !== 'string' ||
      typeof record.endsAt !== 'string' ||
      typeof record.label !== 'string'
    ) {
      continue;
    }
    slots.push({
      id: record.id,
      startsAt: record.startsAt,
      endsAt: record.endsAt,
      label: record.label,
    });
  }
  return slots;
}

export function matchSlotChoice(text: string, slots: MeetingSlot[]): MeetingSlot | null {
  if (slots.length === 0) return null;
  const normalized = text.trim().toLowerCase();
  const numbered = normalized.match(/\boption\s*(\d)\b/) ?? normalized.match(/^\s*(\d)\s*[).]?\s*$/);
  if (numbered?.[1]) {
    const index = Number(numbered[1]) - 1;
    return slots[index] ?? null;
  }
  if (/\b(first|1st)\b/.test(normalized)) return slots[0] ?? null;
  if (/\b(second|2nd)\b/.test(normalized)) return slots[1] ?? null;
  if (/\b(third|3rd)\b/.test(normalized)) return slots[2] ?? null;
  for (const slot of slots) {
    const time = slot.label.match(/\d{2}:\d{2}/)?.[0];
    if (time && normalized.includes(time)) return slot;
    if (normalized.includes(slot.label.toLowerCase())) return slot;
  }
  return null;
}

export function formatSlotOffer(slots: MeetingSlot[]): string {
  const lines = slots.map((slot, index) => `${index + 1}) ${slot.label}`);
  return [
    'You look like a strong fit. I can hold one of these times (Asia/Jerusalem):',
    ...lines,
    "Reply with the option number and I'll book it.",
  ].join('\n');
}

export function formatBookingConfirmation(label: string, email?: string | null): string {
  const invite = email
    ? ` I'll use ${email} for the invite.`
    : ' Reply with an email if you want a calendar invite.';
  return `Booked: ${label}.${invite} If you need a different time, say so.`;
}
