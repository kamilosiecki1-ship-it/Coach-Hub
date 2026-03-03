import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { generateProcessReport, isAiConfigured } from "@/lib/aiService";

export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Nieautoryzowany" }, { status: 401 });

  const userId = (session.user as { id: string }).id;

  const client = await prisma.client.findFirst({
    where: { id: params.id, userId },
    include: {
      sessions: {
        orderBy: { scheduledAt: "desc" },
        include: { offboarding: true },
      },
    },
  });

  if (!client) return NextResponse.json({ error: "Nie znaleziono klienta" }, { status: 404 });
  if (client.closedAt) return NextResponse.json({ error: "Proces już został zamknięty" }, { status: 400 });

  if (!isAiConfigured()) {
    return NextResponse.json({ error: "AI nie jest skonfigurowane. Dodaj klucz OPENAI_API_KEY." }, { status: 503 });
  }

  const { report, truncated } = await generateProcessReport({
    name: client.name,
    role: client.role,
    company: client.company,
    stage: client.stage,
    generalNote: client.generalNote,
    sessions: client.sessions.map((s) => ({
      scheduledAt: s.scheduledAt,
      durationMin: s.durationMin,
      status: s.status,
      notesMd: s.notesMd,
      summaryMd: s.summaryMd,
      offboarding: s.offboarding
        ? { generatedNoteMd: s.offboarding.generatedNoteMd, transcript: s.offboarding.transcript }
        : null,
    })),
  }, userId);

  const updated = await prisma.client.update({
    where: { id: params.id },
    data: {
      stage: "Zakończony",
      closedAt: new Date(),
      finalReportMd: report,
    },
    include: {
      sessions: { orderBy: { scheduledAt: "desc" } },
      retrospectives: { orderBy: { createdAt: "desc" } },
    },
  });

  return NextResponse.json({ client: updated, truncated });
}
