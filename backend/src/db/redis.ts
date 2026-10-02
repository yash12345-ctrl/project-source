import Redis from 'ioredis';
import { prisma } from './db';

// Singleton Redis client — shared across the whole backend.
// Uses eager connection (no lazyConnect) so it's ready before the first request.
let redis: Redis | null = null;

export const redisConnectionConfig = {
  host: process.env.REDIS_HOST || '127.0.0.1',
  port: parseInt(process.env.REDIS_PORT || '6379', 10)
};
console.log('[Redis Config]', redisConnectionConfig);

export function getRedisClient(): Redis {
  if (!redis) {
    redis = new Redis({
      ...redisConnectionConfig,
      // Eager connection: ioredis connects immediately on instantiation.
      // This ensures isRedisReady() returns true before the first HTTP request arrives.
      retryStrategy: (times) => {
        if (times > 5) {
          console.warn('[Redis] Max reconnect attempts reached. Running without cache.');
          return null; // stop retrying
        }
        return Math.min(times * 200, 2000);
      },
    });

    redis.on('connect', () => console.log('[Redis] ✅ Connected'));
    redis.on('ready',   () => console.log('[Redis] ✅ Ready to serve requests'));
    redis.on('error',   (err) => console.error('[Redis] ❌ Error:', err.message));
    redis.on('close',   () => console.warn('[Redis] ⚠ Connection closed'));
  }
  return redis;
}

// Call once on module load so the connection is established at import time.
getRedisClient();

/** Convenience: is Redis currently usable? */
export function isRedisReady(): boolean {
  return redis?.status === 'ready';
}

/**
 * Safe get: returns null on any error (Redis down, parse error, etc.)
 */
export async function cacheGet<T>(key: string): Promise<T | null> {
  // 1. Check Redis first
  if (isRedisReady()) {
    try {
      const raw = await redis!.get(key);
      if (raw) {
        console.log(`[Cache] ⚡ Redis HIT for ${key}`);
        return JSON.parse(raw) as T;
      }
    } catch (e) {
      console.error(`[Cache] Redis get error for key "${key}":`, (e as Error).message);
    }
  }

  // 2. Redis miss -> check Database
  const colonIndex = key.indexOf(':');
  const type = colonIndex !== -1 ? key.slice(0, colonIndex) : key;
  const username = colonIndex !== -1 ? key.slice(colonIndex + 1) : '';
  if (type && username) {
    try {
      const dbEntry = await prisma.scrapedData.findUnique({
        where: { username_type: { username, type } }
      });
      if (dbEntry) {
        console.log(`[Cache] 🗄️ Database HIT for ${key}`);
        // Backfill Redis so the next request is faster
        if (isRedisReady()) {
          // Hardcoding a default 2-hour TTL for the backfill, though it'll be fully overwritten
          // on the next live scrape.
          await redis!.set(key, dbEntry.data, 'EX', 7200);
        }
        return JSON.parse(dbEntry.data) as T;
      }
    } catch (e) {
      console.error(`[Cache] DB get error for key "${key}":`, (e as Error).message);
    }
  }

  console.log(`[Cache] ❌ MISS for ${key}`);
  return null;
}

/**
 * Safe set with TTL (seconds). Saves to both Redis and the Database.
 */
export async function cacheSet(key: string, value: unknown, ttlSeconds: number): Promise<void> {
  const jsonValue = JSON.stringify(value);

  // 1. Save to Redis
  if (isRedisReady()) {
    try {
      await redis!.set(key, jsonValue, 'EX', ttlSeconds);
    } catch (e) {
      console.error(`[Cache] Redis set error for key "${key}":`, (e as Error).message);
    }
  }

  // 2. Save to Database
  const colonIndex = key.indexOf(':');
  const type = colonIndex !== -1 ? key.slice(0, colonIndex) : key;
  const username = colonIndex !== -1 ? key.slice(colonIndex + 1) : '';
  if (type && username) {
    try {
      await prisma.scrapedData.upsert({
        where: { username_type: { username, type } },
        update: { data: jsonValue },
        create: { username, type, data: jsonValue }
      });
      console.log(`[Cache] 💾 Saved to Database for ${key}`);
    } catch (e) {
      console.error(`[Cache] DB set error for key "${key}":`, (e as Error).message);
    }
  }
}
