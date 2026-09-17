import Redis from 'ioredis';
import logger from './logger';

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

const redis = new Redis(REDIS_URL, {
  maxRetriesPerRequest: 3,
  retryStrategy(times) {
    const delay = Math.min(times * 200, 2000);
    return delay;
  },
  lazyConnect: true, // Don't connect until explicitly called
});

redis.on('connect', () => {
  logger.info('✅ Redis connected.');
});

redis.on('error', (err) => {
  logger.error('Redis connection error:', err.message);
});

export async function connectRedis() {
  try {
    await redis.connect();
  } catch (err: any) {
    logger.error('Failed to connect to Redis, falling back to degraded mode:', err.message);
  }
}

export async function disconnectRedis() {
  await redis.quit();
  logger.info('💤 Redis disconnected.');
}

export default redis;
