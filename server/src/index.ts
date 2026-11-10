import { createApp } from './app';
import { config, effectiveAiMode } from './config';
import { prisma } from './db';
import { log } from './logger';
import { closeQueue } from './queue/jobs';

if (config.AI_MODE === 'openai' && config.OPENAI_API_KEY.trim().length === 0) {
  log.info('OPENAI_API_KEY is empty; requests will use the deterministic mock');
}

const app = createApp();
const server = app.listen(config.PORT, () => {
  log.info('api listening', {
    port: config.PORT,
    aiMode: effectiveAiMode(),
    queueDriver: config.QUEUE_DRIVER,
  });
});

async function shutdown(): Promise<void> {
  server.close();
  await closeQueue();
  await prisma.$disconnect();
  process.exit(0);
}

process.on('SIGTERM', () => {
  void shutdown();
});
process.on('SIGINT', () => {
  void shutdown();
});
