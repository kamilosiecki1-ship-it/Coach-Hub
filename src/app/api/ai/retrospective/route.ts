import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { generateRetrospective, isAiConfigured } from "@/lib/aiService";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Nieautoryzowany" }, { status: 401 });
  }

  if (!isAiConfigured()) {
    return NextResponse.json(
      { error: "Integracja z AI nie została skonfigurowana. Dodaj klucz OPENAI_API_KEY do pliku .env." },
      { status: 503 }
    );
  }

  const userId = (session.user as { id: string }).id;
  const { clientId } = await req.json();

  if (!clientId) {
    return NextResponse.json({ error: "Brak wymaganego pola: clientId" }, { status: 400 });
  }

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

  if (clientRecord.sessions.length === 0) {
    return NextResponse.json(
      { error: "Klient nie ma żadnych sesji. Dodaj notatki z sesji, aby wygenerować retrospektywę." },
      { status: 422 }
    );
  }

  const { report, truncated } = await generateRetrospective({
    clientName: clientRecord.name,
    clientRole: clientRecord.role,
    clientCompany: clientRecord.company,
    clientStage: clientRecord.stage,
    generalNote: clientRecord.generalNote,
    sessions: clientRecord.sessions,
  }, userId);

  const saved = await prisma.retrospective.create({
    data: { clientId, reportMd: report, truncated },
  });

  return NextResponse.json({ id: saved.id, reportMd: report, truncated, createdAt: saved.createdAt });
}
