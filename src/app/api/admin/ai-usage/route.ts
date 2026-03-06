import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
import { AI_RATE_LIMITS } from "@/lib/rateLimit";

// o4-mini pricing (USD per 1M tokens)
const PRICE_INPUT_PER_1M = 1.10;
const PRICE_OUTPUT_PER_1M = 4.40;

// GET /api/admin/ai-usage — per-user AI token usage aggregation
export async function GET() {
  const { error } = await requireAdmin();
  if (error) return error;

  const now = Date.now();
  const oneHourAgo = new Date(now - 60 * 60 * 1000);
  const oneDayAgo = new Date(now - 24 * 60 * 60 * 1000);
  const sevenDaysAgo = new Date(now - 7 * 24 * 60 * 60 * 1000);
  const thirtyDaysAgo = new Date(now - 30 * 24 * 60 * 60 * 1000);

  const [usage1h, usage24h, usage7, usage30, usageAll, users] = await Promise.all([
    prisma.aiUsageEvent.groupBy({
      by: ["userId"],
      _count: { id: true },
      where: { createdAt: { gte: oneHourAgo }, endpoint: "mentor_chat_stream" },
    }),
    prisma.aiUsageEvent.groupBy({
      by: ["userId"],
      _count: { id: true },
      where: { createdAt: { gte: oneDayAgo }, endpoint: "mentor_chat_stream" },
    }),
    prisma.aiUsageEvent.groupBy({
      by: ["userId"],
      _sum: { totalTokens: true },
      where: { createdAt: { gte: sevenDaysAgo } },
    }),
    prisma.aiUsageEvent.groupBy({
      by: ["userId"],
      _sum: { totalTokens: true },
      where: { createdAt: { gte: thirtyDaysAgo } },
    }),
    prisma.aiUsageEvent.groupBy({
      by: ["userId"],
      _sum: { totalTokens: true, inputTokens: true, outputTokens: true },
    }),
    prisma.user.findMany({
      select: { id: true, email: true, name: true, role: true },
    }),
  ]);

  const map1h = Object.fromEntries(usage1h.map((u) => [u.userId, u._count.id ?? 0]));
  const map24h = Object.fromEntries(usage24h.map((u) => [u.userId, u._count.id ?? 0]));
  const map7 = Object.fromEntries(usage7.map((u) => [u.userId, u._sum.totalTokens ?? 0]));
  const map30 = Object.fromEntries(usage30.map((u) => [u.userId, u._sum.totalTokens ?? 0]));
  const mapAll = Object.fromEntries(
    usageAll.map((u) => [
      u.userId,
      {
        total: u._sum.totalTokens ?? 0,
        input: u._sum.inputTokens ?? 0,
        output: u._sum.outputTokens ?? 0,
      },
    ])
  );

  // Include all users who have any usage events
  const allUserIds = new Set([
    ...users.map((u) => u.id),
    ...usageAll.map((u) => u.userId),
  ]);

  const userMap = Object.fromEntries(users.map((u) => [u.id, u]));

  const rows = Array.from(allUserIds)
    .map((userId) => {
      const input = mapAll[userId]?.input ?? 0;
      const output = mapAll[userId]?.output ?? 0;
      const estimatedCostUsd =
        (input * PRICE_INPUT_PER_1M + output * PRICE_OUTPUT_PER_1M) / 1_000_000;

      return {
        userId,
        email: userMap[userId]?.email ?? "(usunięty użytkownik)",
        name: userMap[userId]?.name ?? null,
        role: userMap[userId]?.role ?? "—",
        messagesLast1h: map1h[userId] ?? 0,
        messagesLast24h: map24h[userId] ?? 0,
        limitPerHour: AI_RATE_LIMITS.perHour,
        limitPerDay: AI_RATE_LIMITS.perDay,
        tokens7Days: map7[userId] ?? 0,
        tokens30Days: map30[userId] ?? 0,
        tokensTotal: mapAll[userId]?.total ?? 0,
        inputTokensTotal: input,
        outputTokensTotal: output,
        estimatedCostUsd,
      };
    })
    .filter((r) => r.tokensTotal > 0)
    .sort((a, b) => b.tokensTotal - a.tokensTotal);

  return NextResponse.json(rows);
}
