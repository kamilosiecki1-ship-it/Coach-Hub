import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Nieautoryzowany" }, { status: 401 });

  const userId = (session.user as { id: string }).id;
  const body = await req.json();
  const { clientId, scheduledAt, durationMin } = body;

  if (!clientId || !scheduledAt) {
    return NextResponse.json({ error: "Brak wymaganych pól" }, { status: 400 });
  }

  // Verify client belongs to user
  const client = await prisma.client.findFirst({ where: { id: clientId, userId } });
  if (!client) return NextResponse.json({ error: "Nie znaleziono klienta" }, { status: 404 });

  const newSession = await prisma.session.create({
    data: {
      clientId,
      scheduledAt: new Date(scheduledAt),
      durationMin: durationMin ? parseInt(durationMin) : null,
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
