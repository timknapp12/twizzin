import { NextRequest, NextResponse } from 'next/server';

interface RateLimitConfig {
  windowMs: number; // Time window in milliseconds
  maxRequests: number; // Max requests per window
}

// ---------------------------------------------------------------------------
// Storage backends
// ---------------------------------------------------------------------------

// In-memory fallback — works for local dev but resets on every cold start in
// serverless environments (Vercel). A console.warn is emitted once so
// operators notice the gap in production.
const requestCounts = new Map<string, { count: number; resetTime: number }>();

let inMemoryWarned = false;

function warnInMemory() {
  if (!inMemoryWarned) {
    inMemoryWarned = true;
    console.warn(
      '[rate-limit] Using in-memory rate limiting. ' +
        'This is unsuitable for production on serverless platforms because ' +
        'state is lost on cold starts and is not shared across instances. ' +
        'Set UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN to enable ' +
        'distributed rate limiting via Upstash Redis.'
    );
  }
}

/**
 * In-memory rate limiter. Returns { count, remaining, resetTime } or throws
 * if it cannot be processed.
 */
async function inMemoryIncrement(
  clientId: string,
  config: RateLimitConfig
): Promise<{ count: number; remaining: number; resetTime: number }> {
  warnInMemory();

  const now = Date.now();

  // Clean up expired entries periodically (every call is cheap enough for dev)
  const keys = Array.from(requestCounts.keys());
  for (const key of keys) {
    const value = requestCounts.get(key);
    if (value && now > value.resetTime) {
      requestCounts.delete(key);
    }
  }

  let entry = requestCounts.get(clientId);

  if (!entry || now > entry.resetTime) {
    entry = { count: 0, resetTime: now + config.windowMs };
    requestCounts.set(clientId, entry);
  }

  entry.count++;

  return {
    count: entry.count,
    remaining: Math.max(0, config.maxRequests - entry.count),
    resetTime: entry.resetTime,
  };
}

// ---------------------------------------------------------------------------
// Upstash Redis rate limiter (REST API, no npm dependency needed)
// ---------------------------------------------------------------------------

const UPSTASH_URL = process.env.UPSTASH_REDIS_REST_URL;
const UPSTASH_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;

/**
 * Uses the Upstash Redis REST API with an INCR + EXPIRE pattern.
 *
 * Key format: `ratelimit:<clientId>:<windowId>`
 * where windowId = Math.floor(now / windowMs) so all requests in the same
 * window share the same counter. EXPIRE is set to windowMs/1000 + 1 second
 * to auto-clean old keys.
 */
async function upstashIncrement(
  clientId: string,
  config: RateLimitConfig
): Promise<{ count: number; remaining: number; resetTime: number }> {
  const now = Date.now();
  const windowId = Math.floor(now / config.windowMs);
  const key = `ratelimit:${clientId}:${windowId}`;
  const ttlSeconds = Math.ceil(config.windowMs / 1000) + 1;

  // Pipeline: INCR key, then EXPIRE key ttl (only sets if not already set
  // via the NX-like behaviour of checking the INCR result).
  // Upstash REST API supports pipelining by sending an array of commands.
  const pipelineBody = [
    ['INCR', key],
    ['EXPIRE', key, ttlSeconds.toString()],
  ];

  const res = await fetch(`${UPSTASH_URL}/pipeline`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${UPSTASH_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(pipelineBody),
  });

  if (!res.ok) {
    // If Upstash is unreachable, fall back to allowing the request rather
    // than blocking legitimate users. Log the error for observability.
    console.error(
      `[rate-limit] Upstash Redis returned ${res.status}: ${await res.text()}`
    );
    return { count: 0, remaining: config.maxRequests, resetTime: now + config.windowMs };
  }

  const results = await res.json();
  // results is an array of { result: number } — first element is the INCR result
  const count: number = results[0]?.result ?? 0;
  const resetTime = (windowId + 1) * config.windowMs;

  return {
    count,
    remaining: Math.max(0, config.maxRequests - count),
    resetTime,
  };
}

// Pick the backend once at module load time
const useUpstash = !!(UPSTASH_URL && UPSTASH_TOKEN);
const increment = useUpstash ? upstashIncrement : inMemoryIncrement;

// ---------------------------------------------------------------------------
// IP extraction
// ---------------------------------------------------------------------------

/**
 * Extract the client IP address with Vercel-aware header priority.
 *
 * - `x-real-ip` is set by Vercel's edge network and is the most trustworthy
 *   header because end users cannot override it.
 * - `x-forwarded-for` is a standard proxy header; we take only the first
 *   (leftmost) IP which is the original client. This header CAN be spoofed
 *   upstream of the CDN, but is the best fallback available.
 * - Falls back to 'unknown' when neither header is present (e.g. local dev).
 */
function getClientIp(request: NextRequest): string {
  const realIp = request.headers.get('x-real-ip');
  if (realIp) return realIp.trim();

  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    const first = forwarded.split(',')[0];
    if (first) return first.trim();
  }

  return 'unknown';
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Rate limit a request. Returns `null` if the request is allowed, or a
 * `NextResponse` (HTTP 429) if the limit has been exceeded.
 *
 * Usage in a route handler:
 *
 * ```ts
 * const limited = await rateLimit(request, { windowMs: 10_000, maxRequests: 30 });
 * if (limited) return limited;
 * // ... handle request
 * ```
 */
export async function rateLimit(
  request: NextRequest,
  config: RateLimitConfig
): Promise<NextResponse | null> {
  const clientId = getClientIp(request);
  const { count, remaining, resetTime } = await increment(clientId, config);

  if (count > config.maxRequests) {
    const now = Date.now();
    const retryAfter = Math.ceil((resetTime - now) / 1000);
    return NextResponse.json(
      {
        error: 'Rate limit exceeded. Please try again later.',
        retryAfter,
      },
      {
        status: 429,
        headers: {
          'Retry-After': retryAfter.toString(),
          'X-RateLimit-Limit': config.maxRequests.toString(),
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': new Date(resetTime).toISOString(),
        },
      }
    );
  }

  // Request allowed — caller is responsible for setting rate-limit headers
  // on the actual response if desired.
  return null;
}

/**
 * Higher-order wrapper that applies rate limiting to a route handler.
 * Kept for backward compatibility with existing route handlers.
 */
export function createRateLimitedHandler(
  config: RateLimitConfig,
  handler: (request: NextRequest) => Promise<NextResponse>
) {
  return async (request: NextRequest): Promise<NextResponse> => {
    // Increment once and capture the result for headers
    const clientId = getClientIp(request);
    const { count, remaining, resetTime } = await increment(clientId, config);

    if (count > config.maxRequests) {
      const now = Date.now();
      const retryAfter = Math.ceil((resetTime - now) / 1000);
      return NextResponse.json(
        {
          error: 'Rate limit exceeded. Please try again later.',
          retryAfter,
        },
        {
          status: 429,
          headers: {
            'Retry-After': retryAfter.toString(),
            'X-RateLimit-Limit': config.maxRequests.toString(),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': new Date(resetTime).toISOString(),
          },
        }
      ) as NextResponse;
    }

    const response = await handler(request);

    // Attach informational rate-limit headers to the response
    response.headers.set('X-RateLimit-Limit', config.maxRequests.toString());
    response.headers.set('X-RateLimit-Remaining', remaining.toString());
    response.headers.set(
      'X-RateLimit-Reset',
      new Date(resetTime).toISOString()
    );

    return response;
  };
}
