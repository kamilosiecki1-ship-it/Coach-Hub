import { prisma } from "@/lib/prisma";

// --- In-memory IP-based rate limiter ---

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

function makeIpRateLimiter(maxRequests: number, windowMs: number) {
  const store = new Map<string, RateLimitEntry>();

  return function isLimited(key: string): boolean {
    const now = Date.now();
    const entry = store.get(key);

    if (!entry || now >= entry.resetAt) {
      store.set(key, { count: 1, resetAt: now + windowMs });
      return false;
    }

    entry.count += 1;
    return entry.count > maxRequests;
  };
}

// 10 requests per 15 minutes per IP — for registration and password reset
export const authRateLimit = makeIpRateLimiter(10, 15 * 60 * 1000);

// 5 requests per 15 minutes per key — for login (keyed by email)
export const loginRateLimit = makeIpRateLimiter(5, 15 * 60 * 1000);

export const AI_RATE_LIMITS = {
  perHour: 60,
  perDay: 300,
};

export async function checkAiRateLimit(
  userId: string
): Promise<{ blocked: boolean; reason?: string }> {
  const now = Date.now();
  const hourAgo = new Date(now - 60 * 60 * 1000);
  const dayAgo = new Date(now - 24 * 60 * 60 * 1000);

  const [hourCount, dayCount] = await Promise.all([
    prisma.aiUsageEvent.count({
      where: {
        userId,
        createdAt: { gte: hourAgo },
        endpoint: "mentor_chat_stream",
      },
    }),
    prisma.aiUsageEvent.count({
      where: {
        userId,
        createdAt: { gte: dayAgo },
        endpoint: "mentor_chat_stream",
      },
    }),
  ]);

  if (hourCount >= AI_RATE_LIMITS.perHour) {
    return { blocked: true, reason: `Limit godzinowy przekroczony (${AI_RATE_LIMITS.perHour}/h).` };
  }
  if (dayCount >= AI_RATE_LIMITS.perDay) {
    return { blocked: true, reason: `Limit dzienny przekroczony (${AI_RATE_LIMITS.perDay}/dzień).` };
  }

  return { blocked: false };
}
