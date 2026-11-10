import './load-env';
import { z } from 'zod';

const schema = z.object({
  PORT: z.coerce.number().int().positive().default(4000),
  DATABASE_URL: z.string().min(1),
  REDIS_URL: z.string().min(1).default('redis://127.0.0.1:6379'),
  AI_MODE: z
    .string()
    .default('mock')
    .transform((value) => value.toLowerCase())
    .pipe(z.enum(['mock', 'openai'])),
  OPENAI_API_KEY: z.string().optional().default(''),
  OPENAI_MODEL: z.string().min(1).default('gpt-4o-mini'),
  WEB_ORIGIN: z.string().min(1).default('http://localhost:3000'),
  QUEUE_DRIVER: z
    .string()
    .default('bullmq')
    .transform((value) => value.toLowerCase())
    .pipe(z.enum(['inline', 'bullmq'])),
  FOLLOW_UP_DELAY_MS: z.coerce.number().int().positive().default(86_400_000),
  APP_TIMEZONE: z.string().min(1).default('Asia/Jerusalem'),
});

export const config = schema.parse(process.env);

export function effectiveAiMode(): 'mock' | 'openai' {
  if (config.AI_MODE === 'openai' && config.OPENAI_API_KEY.trim().length > 0) return 'openai';
  return 'mock';
}

export function allowedOrigins(): Set<string> {
  return new Set(
    config.WEB_ORIGIN.split(',')
      .map((origin) => origin.trim())
      .filter((origin) => origin.length > 0),
  );
}
