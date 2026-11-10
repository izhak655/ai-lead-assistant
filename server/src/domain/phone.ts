export function normalizePhone(input: string): string | null {
  const compact = input.trim().replace(/[\s()-]/g, '');
  if (!compact) return null;
  let digits = compact;
  if (digits.startsWith('00')) digits = `+${digits.slice(2)}`;
  else if (digits.startsWith('0')) digits = `+972${digits.slice(1)}`;
  else if (!digits.startsWith('+')) digits = `+${digits}`;
  if (!/^\+\d{8,15}$/.test(digits)) return null;
  return digits;
}
