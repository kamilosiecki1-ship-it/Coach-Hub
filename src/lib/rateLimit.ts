import { prisma } from "@/lib/prisma";

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
