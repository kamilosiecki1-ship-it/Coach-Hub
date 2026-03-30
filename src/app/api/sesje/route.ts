import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const createSessionSchema = z.object({
  clientId: z.string().uuid(),
  scheduledAt: z.string().datetime(),
  durationMin: z.number().int().min(1).max(480).optional(),
  notes: z.string().max(5000).optional(),
});

// GET /api/sesje?status=planned — returns all future planned sessions with client info
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Nieautoryzowany" }, { status: 401 });

  const userId = (session.user as { id: string }).id;
  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");

  if (status !== "planned") {
    return NextResponse.json({ error: "Nieobsługiwany parametr" }, { status: 400 });
  }

  const sessions = await prisma.session.findMany({
    where: {
      status: "Zaplanowana",
      scheduledAt: { gte: new Date() },
      client: { userId },
    },
    select: {
      id: true,
      scheduledAt: true,
      client: { select: { id: true, name: true } },
    },
    orderBy: { scheduledAt: "asc" },
  });

  return NextResponse.json(
    sessions.map((s) => ({
      id: s.id,
      scheduledAt: s.scheduledAt.toISOString(),
      clientId: s.client.id,
      clientName: s.client.name,
    }))
  );
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Nieautoryzowany" }, { status: 401 });

  const userId = (session.user as { id: string }).id;
  const body = await req.json();
  const parsed = createSessionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Nieprawidłowe dane", details: parsed.error.flatten() }, { status: 400 });
  }
  const { clientId, scheduledAt, durationMin } = parsed.data;

  // Verify client belongs to user
  const client = await prisma.client.findFirst({ where: { id: clientId, userId } });
  if (!client) return NextResponse.json({ error: "Nie znaleziono klienta" }, { status: 404 });

  const newSession = await prisma.session.create({
    data: {
      clientId,
      scheduledAt: new Date(scheduledAt),
      durationMin: durationMin ?? null,
      status: "Zaplanowana",
      notesMd: "",
      planMd: "",
    },
  });

  // Auto-advance stage: 2nd session → "W trakcie"
  if (client.stage === "Wstęp") {
    const sessionCount = await prisma.session.count({ where: { clientId } });
    if (sessionCount === 2) {
      await prisma.client.update({ where: { id: clientId }, data: { stage: "W trakcie" } });
    }
  }

  return NextResponse.json(newSession, { status: 201 });
}
