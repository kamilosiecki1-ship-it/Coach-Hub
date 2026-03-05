import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET /api/pulpit/calendar?year=YYYY&month=M  (month is 1-based)
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Nieautoryzowany" }, { status: 401 });

  const userId = (session.user as { id: string }).id;
  const { searchParams } = new URL(req.url);
  const year = parseInt(searchParams.get("year") ?? "");
  const month = parseInt(searchParams.get("month") ?? ""); // 1-based

  if (isNaN(year) || isNaN(month) || month < 1 || month > 12) {
    return NextResponse.json({ error: "Nieprawidłowe parametry" }, { status: 400 });
  }

  const from = new Date(year, month - 1, 1);
  const to = new Date(year, month, 0, 23, 59, 59, 999); // last ms of last day

  const calendarSessions = await prisma.session.findMany({
    where: { client: { userId }, scheduledAt: { gte: from, lte: to } },
    select: {
      id: true,
      scheduledAt: true,
      status: true,
      clientId: true,
      client: { select: { id: true, name: true } },
    },
    orderBy: { scheduledAt: "asc" },
  });

  if (calendarSessions.length === 0) return NextResponse.json([]);

  // Compute session numbers efficiently (2 queries total)
  const uniqueClientIds = Array.from(new Set(calendarSessions.map((s) => s.clientId)));
  const allClientSessions = await prisma.session.findMany({
    where: { clientId: { in: uniqueClientIds } },
    select: { id: true, clientId: true, scheduledAt: true },
    orderBy: { scheduledAt: "asc" },
  });

  const clientOrder = new Map<string, string[]>();
  for (const s of allClientSessions) {
    const list = clientOrder.get(s.clientId) ?? [];
    list.push(s.id);
    clientOrder.set(s.clientId, list);
  }

  const result = calendarSessions.map((s) => ({
    id: s.id,
    scheduledAt: s.scheduledAt.toISOString(),
    status: s.status,
    sessionNumber: (clientOrder.get(s.clientId)?.indexOf(s.id) ?? -1) + 1,
    client: s.client,
  }));

  return NextResponse.json(result);
}
