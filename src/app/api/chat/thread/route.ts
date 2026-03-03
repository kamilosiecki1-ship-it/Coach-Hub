import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { buildClientContext } from "@/lib/aiService";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Nieautoryzowany" }, { status: 401 });
  }

  const userId = (session.user as { id: string }).id;
  const { searchParams } = new URL(req.url);
  const clientId = searchParams.get("clientId");

  if (!clientId) {
    return NextResponse.json({ error: "Brak parametru clientId" }, { status: 400 });
  }

  // Verify ownership
  const clientRecord = await prisma.client.findFirst({
    where: { id: clientId, userId },
    include: {
      sessions: {
        orderBy: { scheduledAt: "desc" },
        select: {
          scheduledAt: true,
          durationMin: true,
          status: true,
          notesMd: true,
          summaryMd: true,
        },
      },
    },
  });

  if (!clientRecord) {
    return NextResponse.json({ error: "Nie znaleziono klienta" }, { status: 404 });
  }

  const thread = await prisma.chatThread.findUnique({
    where: { clientId },
    include: {
      messages: {
        orderBy: { createdAt: "asc" },
      },
    },
  });

  const { contextSummary } = buildClientContext({
    name: clientRecord.name,
    role: clientRecord.role,
    company: clientRecord.company,
    stage: clientRecord.stage,
    generalNote: clientRecord.generalNote,
    sessions: clientRecord.sessions,
  });

  return NextResponse.json({
    messages: thread?.messages ?? [],
    contextSummary,
  });
}
