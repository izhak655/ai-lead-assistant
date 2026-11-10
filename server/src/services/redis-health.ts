import IORedis from 'ioredis';
import { config } from '../config';

export async function pingRedis(): Promise<boolean> {
  const client = new IORedis(config.REDIS_URL, {
    maxRetriesPerRequest: 1,
    connectTimeout: 2000,
    lazyConnect: true,
    enableOfflineQueue: false,
  });
  client.on('error', () => undefined);
  try {
    await client.connect();
    const result = await client.ping();
    return result === 'PONG';
  } catch {
    return false;
  } finally {
    client.disconnect();
  }
}
