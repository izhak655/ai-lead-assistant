import { config, effectiveAiMode } from './config';
import { log } from './logger';
import { startWorker } from './queue/worker';

if (config.AI_MODE === 'openai' && config.OPENAI_API_KEY.trim().length === 0) {
  log.info('OPENAI_API_KEY is empty; the worker will use the deterministic mock');
}

log.info('starting worker', { aiMode: effectiveAiMode() });
startWorker();
