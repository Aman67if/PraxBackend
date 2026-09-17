import { Request, Response, NextFunction } from 'express';
import redis from '../config/redis';
import logger from '../config/logger';

const DEFAULT_TTL = 300; // 5 minutes in seconds

// ─── Core cache operations ────────────────────────────────────────────────────

/**
 * Get a value from Redis cache.
 */
export async function cacheGet<T>(key: string): Promise<T | null> {
  try {
    const data = await redis.get(key);
    if (!data) return null;
    return JSON.parse(data) as T;
  } catch (err) {
    logger.error(`Cache GET error for key "${key}":`, err);
    return null;
  }
}

/**
 * Set a value in Redis cache with TTL.
 */
export async function cacheSet(key: string, data: any, ttl: number = DEFAULT_TTL): Promise<void> {
  try {
    await redis.setex(key, ttl, JSON.stringify(data));
  } catch (err) {
    logger.error(`Cache SET error for key "${key}":`, err);
  }
}

/**
 * Delete a specific cache key.
 */
export async function cacheDel(key: string): Promise<void> {
  try {
    await redis.del(key);
  } catch (err) {
    logger.error(`Cache DEL error for key "${key}":`, err);
  }
}

/**
 * Invalidate all cache keys matching a pattern (e.g., "curriculum:*").
 * Uses SCAN to avoid blocking Redis with KEYS command.
 */
export async function cacheInvalidate(pattern: string): Promise<void> {
  try {
    let cursor = '0';
    do {
      const [nextCursor, keys] = await redis.scan(cursor, 'MATCH', pattern, 'COUNT', 100);
      cursor = nextCursor;
      if (keys.length > 0) {
        await redis.del(...keys);
      }
    } while (cursor !== '0');
  } catch (err) {
    logger.error(`Cache INVALIDATE error for pattern "${pattern}":`, err);
  }
}

// ─── Express middleware for automatic caching ─────────────────────────────────

/**
 * Express middleware that caches GET endpoint responses dynamically.
 * 
 * @param keyFn - Function to generate a cache key from the request
 * @param ttl - Time-to-live in seconds (default 5 minutes)
 * 
 * Usage:
 *   router.get('/data', cacheMiddleware((req) => `data:${req.query.id}`, 600), controller);
 */
export function cacheMiddleware(
  keyFn: (req: Request) => string,
  ttl: number = DEFAULT_TTL
) {
  return async (req: Request, res: Response, next: NextFunction) => {
    if (req.method !== 'GET') return next();

    const key = keyFn(req);

    try {
      const cached = await redis.get(key);
      if (cached) {
        const parsed = JSON.parse(cached);
        return res.status(200).json(parsed);
      }
    } catch (err) {
      logger.error(`Cache middleware GET error:`, err);
    }

    // Store original json method and intercept it to cache the response
    const originalJson = res.json.bind(res);
    res.json = (body: any) => {
      // Only cache successful responses
      if (res.statusCode >= 200 && res.statusCode < 300) {
        redis.setex(key, ttl, JSON.stringify(body)).catch((err) => {
          logger.error(`Cache middleware SET error:`, err);
        });
      }
      return originalJson(body);
    };

    next();
  };
}
