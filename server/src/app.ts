import cors from 'cors';
import express, { type NextFunction, type Request, type Response } from 'express';
import helmet from 'helmet';
import { allowedOrigins, config, effectiveAiMode } from './config';
import { prisma } from './db';
import { HttpError } from './http/async-route';
import { log } from './logger';
import { pingRedis } from './services/redis-health';
import { leadsRouter } from './routes/leads';
import { meetingsRouter } from './routes/meetings';
import { statsRouter } from './routes/stats';
import { webhooksRouter } from './routes/webhooks';

export function createApp() {
  const app = express();
  app.disable('x-powered-by');
  app.use(helmet());
  const origins = allowedOrigins();
  app.use(
    cors({
      origin(origin, callback) {
        if (!origin || origins.has('*') || origins.has(origin)) callback(null, true);
        else callback(null, false);
      },
    }),
  );
  app.use(express.json({ limit: '1mb' }));

  app.get('/api/health', async (_req, res) => {
    let db: 'up' | 'down' = 'down';
    try {
      await prisma.$queryRaw`SELECT 1`;
      db = 'up';
    } catch {
      db = 'down';
    }
    const redis = (await pingRedis()) ? 'up' : 'down';
    const ok = db === 'up' && redis === 'up';
    res.status(ok ? 200 : 503).json({
      ok,
      db,
      redis,
      aiMode: effectiveAiMode(),
      queueDriver: config.QUEUE_DRIVER,
    });
  });

  app.use('/api/stats', statsRouter);
  app.use('/api/leads', leadsRouter);
  app.use('/api/meetings', meetingsRouter);
  app.use('/api/webhooks', webhooksRouter);

  app.use((_req, res) => {
    res.status(404).json({ error: 'Not found' });
  });

  app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    if (err instanceof HttpError) {
      res.status(err.status).json({ error: err.message });
      return;
    }
    log.error('request failed', { error: err instanceof Error ? err.message : String(err) });
    if (res.headersSent) return;
    res.status(500).json({ error: 'Internal server error' });
  });

  return app;
}
