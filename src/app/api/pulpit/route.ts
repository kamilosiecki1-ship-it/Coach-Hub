import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { startOfMonth, endOfMonth } from "date-fns";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Nieautoryzowany" }, { status: 401 });
  }

  const userId = (session.user as { id: string }).id;
  const now = new Date();
  const monthStart = startOfMonth(now);
  const monthEnd = endOfMonth(now);

  const [sessionsThisMonth, allSessions, recentClients] = await Promise.all([
    prisma.session.findMany({
      where: {
        client: { userId },
        scheduledAt: { gte: monthStart, lte: monthEnd },
        status: "Odbyta",
      },
      select: { durationMin: true },
    }),
    prisma.session.findMany({
      where: { client: { userId } },
      orderBy: { scheduledAt: "desc" },
      take: 5,
      include: { client: { select: { name: true } } },
    }),
    prisma.client.findMany({
      where: { userId },
      orderBy: { updatedAt: "desc" },
      take: 5,
      include: { sessions: { orderBy: { scheduledAt: "desc" }, take: 1 } },
    }),
  ]);

  const totalMinutes = sessionsThisMonth.reduce((acc, s) => acc + (s.durationMin ?? 0), 0);

  return NextResponse.json({
    sessionsThisMonth: sessionsThisMonth.length,
    totalMinutesThisMonth: totalMinutes,
    recentSessions: allSessions,
    recentClients,
  });
}
