import { redis } from "@/lib/redis"

export interface RateLimitConfig {
  /** Max requests within the window */
  max: number
  /** Window size in seconds */
  windowSec: number
}

// Per MASTER_PLAN: 10/min auth, 30/min mutations, 200/min reads
export const RATE_LIMITS = {
  auth:     { max: 10,  windowSec: 60 } satisfies RateLimitConfig,
  mutation: { max: 30,  windowSec: 60 } satisfies RateLimitConfig,
  read:     { max: 200, windowSec: 60 } satisfies RateLimitConfig,
  meeting:  { max: 10,  windowSec: 60 } satisfies RateLimitConfig,
} as const

interface RateLimitResult {
  allowed: boolean
  remaining: number
  resetAt: number // Unix timestamp (seconds)
}

/**
 * Sliding-window rate limiter using Redis sorted sets.
 * Returns whether the request is allowed + remaining quota.
 */
export async function checkRateLimit(
  identifier: string,
  config: RateLimitConfig,
): Promise<RateLimitResult> {
  const key = `rl:${identifier}`
  const now = Date.now()
  const windowMs = config.windowSec * 1000
  const windowStart = now - windowMs

  // Use pipeline for atomicity
  const pipeline = redis.pipeline()
  // Remove expired entries
  pipeline.zremrangebyscore(key, 0, windowStart)
  // Count current entries
  pipeline.zcard(key)
  // Add this request (score = now, value = unique)
  pipeline.zadd(key, now, `${now}:${Math.random().toString(36).slice(2, 8)}`)
  // Set TTL
  pipeline.expire(key, config.windowSec + 1)

  const results = await pipeline.exec()
  const currentCount = (results?.[1]?.[1] as number) ?? 0

  const allowed = currentCount < config.max
  const remaining = Math.max(0, config.max - currentCount - (allowed ? 1 : 0))
  const resetAt = Math.ceil((now + windowMs) / 1000)

  if (!allowed) {
    // Remove the request we just added since it's not allowed
    const lastEntry = results?.[2]
    if (lastEntry) {
      await redis.zremrangebyscore(key, now, now + 1)
    }
  }

  return { allowed, remaining, resetAt }
}

/**
 * Rate limit by user ID + operation type.
 */
export async function rateLimitByUser(
  userId: string,
  type: keyof typeof RATE_LIMITS,
): Promise<RateLimitResult> {
  return checkRateLimit(`${type}:user:${userId}`, RATE_LIMITS[type])
}

/**
 * Rate limit by workspace ID + operation type.
 */
export async function rateLimitByWorkspace(
  workspaceId: string,
  type: keyof typeof RATE_LIMITS,
): Promise<RateLimitResult> {
  return checkRateLimit(`${type}:ws:${workspaceId}`, RATE_LIMITS[type])
}
