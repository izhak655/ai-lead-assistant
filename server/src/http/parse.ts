import type { ZodType } from 'zod';

export function parseInput<T>(
  schema: ZodType<T>,
  value: unknown,
): { ok: true; data: T } | { ok: false; error: string } {
  const parsed = schema.safeParse(value);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    if (!issue) return { ok: false, error: 'Invalid request' };
    const path = issue.path.length > 0 ? issue.path.join('.') : 'body';
    return { ok: false, error: `${path}: ${issue.message}` };
  }
  return { ok: true, data: parsed.data };
}
