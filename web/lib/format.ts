const TIME_ZONE = 'Asia/Jerusalem';

export function formatWhen(iso: string): string {
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: TIME_ZONE,
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).format(new Date(iso));
}

export function formatDay(iso: string): string {
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: TIME_ZONE,
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).format(new Date(iso));
}

export function formatRelative(iso: string): string {
  const minutes = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 36) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  return `${days}d ago`;
}

export function statusLabel(status: string): string {
  return status.toLowerCase().replaceAll('_', ' ');
}

export function scoreTone(score: number): 'high' | 'mid' | 'low' {
  if (score >= 75) return 'high';
  if (score >= 40) return 'mid';
  return 'low';
}

export const PIPELINE: { status: 'NEW' | 'QUALIFYING' | 'QUALIFIED' | 'UNQUALIFIED' | 'MEETING_BOOKED'; label: string }[] = [
  { status: 'NEW', label: 'New' },
  { status: 'QUALIFYING', label: 'Qualifying' },
  { status: 'QUALIFIED', label: 'Qualified' },
  { status: 'MEETING_BOOKED', label: 'Meeting booked' },
  { status: 'UNQUALIFIED', label: 'Unqualified' },
];
