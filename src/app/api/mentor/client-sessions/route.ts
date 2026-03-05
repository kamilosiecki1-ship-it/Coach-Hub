import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET /api/mentor/client-sessions?clientId=X&type=planned|completed
// Returns sessions with session numbers for use in GlobalMentorView pickers.
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Nieautoryzowany" }, { status: 401 });

  const userId = (session.user as { id: string }).id;
  const { searchParams } = new URL(req.url);
  const clientId = searchParams.get("clientId");
  const type = searchParams.get("type"); // "planned" | "completed"

  if (!clientId) return NextResponse.json({ error: "Brak parametru clientId" }, { status: 400 });

  // Verify ownership
  const client = await prisma.client.findFirst({ where: { id: clientId, userId } });
  if (!client) return NextResponse.json({ error: "Nie znaleziono klienta" }, { status: 404 });

  const statusFilter =
    type === "planned"
      ? { status: "Zaplanowana", scheduledAt: { gte: new Date() } }
      : type === "completed"
      ? { status: "Odbyta" }
      : {};

  const sessions = await prisma.session.findMany({
    where: { clientId, ...statusFilter },
    select: { id: true, scheduledAt: true, status: true },
    orderBy: { scheduledAt: type === "planned" ? "asc" : "desc" },
  });

  if (sessions.length === 0) return NextResponse.json([]);

  // Compute session numbers: position in all sessions for this client ordered by scheduledAt
  const allSessions = await prisma.session.findMany({
    where: { clientId },
    select: { id: true },
    orderBy: { scheduledAt: "asc" },
  });

  const orderMap = new Map(allSessions.map((s, i) => [s.id, i + 1]));

  const result = sessions.map((s) => ({
    id: s.id,
    scheduledAt: s.scheduledAt.toISOString(),
    sessionNumber: orderMap.get(s.id) ?? 0,
  }));

  return NextResponse.json(result);
}
