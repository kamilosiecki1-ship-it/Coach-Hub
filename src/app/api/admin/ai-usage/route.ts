import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";

// GET /api/admin/ai-usage — per-user AI token usage aggregation
export async function GET() {
  const { error } = await requireAdmin();
  if (error) return error;

  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const [usage7, usage30, usageAll, users] = await Promise.all([
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
    .map((userId) => ({
      userId,
      email: userMap[userId]?.email ?? "(usunięty użytkownik)",
      name: userMap[userId]?.name ?? null,
      role: userMap[userId]?.role ?? "—",
      tokens7Days: map7[userId] ?? 0,
      tokens30Days: map30[userId] ?? 0,
      tokensTotal: mapAll[userId]?.total ?? 0,
      inputTokensTotal: mapAll[userId]?.input ?? 0,
      outputTokensTotal: mapAll[userId]?.output ?? 0,
    }))
    .filter((r) => r.tokensTotal > 0)
    .sort((a, b) => b.tokensTotal - a.tokensTotal);

  return NextResponse.json(rows);
}
