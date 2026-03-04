import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";

// GET /api/admin/users — paginated list with search + role + blocked filters + AI usage
export async function GET(req: NextRequest) {
  const { error } = await requireAdmin();
  if (error) return error;

  const { searchParams } = req.nextUrl;
  const query = searchParams.get("query") ?? "";
  const role = searchParams.get("role") ?? ""; // ADMIN | COACH | ""
  const status = searchParams.get("status") ?? ""; // blocked | active | ""
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1"));
  const pageSize = parseInt(searchParams.get("pageSize") ?? "20");

  const where = {
    AND: [
      query
        ? {
            OR: [
              { email: { contains: query } },
              { name: { contains: query } },
            ],
          }
        : {},
      role ? { role } : {},
      status === "blocked" ? { isBlocked: true } : status === "active" ? { isBlocked: false } : {},
    ],
  };

  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const [users, total, usageLast30, usageTotal, lastActivity] = await Promise.all([
    prisma.user.findMany({
      where,
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isBlocked: true,
        createdAt: true,
        _count: { select: { clients: true } },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.user.count({ where }),
    prisma.aiUsageEvent.groupBy({
      by: ["userId"],
      _sum: { totalTokens: true },
      where: { createdAt: { gte: thirtyDaysAgo } },
    }),
    prisma.aiUsageEvent.groupBy({
      by: ["userId"],
      _sum: { totalTokens: true },
    }),
    prisma.aiUsageEvent.groupBy({
      by: ["userId"],
      _max: { createdAt: true },
    }),
  ]);

  const usage30Map = Object.fromEntries(
    usageLast30.map((u) => [u.userId, u._sum.totalTokens ?? 0])
  );
  const usageTotalMap = Object.fromEntries(
    usageTotal.map((u) => [u.userId, u._sum.totalTokens ?? 0])
  );
  const lastActivityMap = Object.fromEntries(
    lastActivity.map((u) => [u.userId, u._max.createdAt?.toISOString() ?? null])
  );

  const enriched = users.map((u) => ({
    ...u,
    tokensLast30Days: usage30Map[u.id] ?? 0,
    tokensTotal: usageTotalMap[u.id] ?? 0,
    lastActivityAt: lastActivityMap[u.id] ?? null,
  }));

  return NextResponse.json({ users: enriched, total, page, pageSize });
}
