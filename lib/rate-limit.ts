import { LRUCache } from "lru-cache";

type RateLimitResult = {
  success: boolean;
  remaining: number;
  resetAt: number;
};

const cache = new LRUCache<string, { count: number; resetAt: number }>({
  max: 5000,
});

export function getClientIp(req: Request) {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]?.trim() ?? "unknown";
  return req.headers.get("x-real-ip") ?? "unknown";
}

export function rateLimit(
  key: string,
  limit: number,
  windowMs: number
): RateLimitResult {
  const now = Date.now();
  const entry = cache.get(key);

  if (!entry || entry.resetAt <= now) {
    const resetAt = now + windowMs;
    cache.set(key, { count: 1, resetAt });
    return { success: true, remaining: limit - 1, resetAt };
  }

  if (entry.count >= limit) {
    return { success: false, remaining: 0, resetAt: entry.resetAt };
  }

  entry.count += 1;
  cache.set(key, entry);
  return { success: true, remaining: limit - entry.count, resetAt: entry.resetAt };
}
