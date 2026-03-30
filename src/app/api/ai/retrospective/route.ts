import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { generateRetrospectiveJSON, isAiConfigured } from "@/lib/aiService";

const MIN_MEANINGFUL_CHARS = 25;

function isMeaningful(s?: string | null): boolean {
  return (s?.trim().length ?? 0) >= MIN_MEANINGFUL_CHARS;
}

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
        orderBy: { scheduledAt: "asc" },
        select: {
          id: true,
          scheduledAt: true,
          durationMin: true,
          status: true,
          notesMd: true,
          planMd: true,
          scratchpadMd: true,
          summaryMd: true,
          offboarding: {
            select: { generatedNoteMd: true, transcript: true },
          },
        },
      },
    },
  });

  if (!clientRecord) {
    return NextResponse.json({ error: "Nie znaleziono klienta" }, { status: 404 });
  }

  // ── Validation: enough data ────────────────────────────────────────────────

  const completedSessions = clientRecord.sessions.filter((s) => s.status === "Odbyta");

  if (completedSessions.length === 0) {
    return NextResponse.json(
      {
        error: {
          code: "INSUFFICIENT_DATA",
          message: "Brak odbytych sesji. Retrospektywa wymaga przynajmniej jednej sesji ze statusem 'Odbyta'.",
          missing: [
            "Brak sesji ze statusem 'Odbyta'",
            "Dodaj i przeprowadz przynajmniej jedna sesje, aby wygenerowac retrospektywe",
          ],
        },
      },
      { status: 400 }
    );
  }

  const hasMeaningfulContent = completedSessions.some(
    (s) =>
      isMeaningful(s.summaryMd) ||
      isMeaningful(s.scratchpadMd) ||
      isMeaningful(s.planMd) ||
      isMeaningful(s.offboarding?.generatedNoteMd)
  );

  if (!hasMeaningfulContent) {
    const missing: string[] = [];
    if (!completedSessions.some((s) => isMeaningful(s.summaryMd)))
      missing.push("Uzupelnij podsumowanie po sesji (pole Podsumowanie w widoku sesji)");
    if (!completedSessions.some((s) => isMeaningful(s.scratchpadMd)))
      missing.push("Dodaj notatki w brudnopisie sesji");
    if (!completedSessions.some((s) => isMeaningful(s.planMd)))
      missing.push("Uzupełnij plan sesji");
    if (!completedSessions.some((s) => isMeaningful(s.offboarding?.generatedNoteMd)))
      missing.push("Uzupełnij offboarding po sesji (notatka z podsumowania)");
    if (completedSessions.length < 2)
      missing.push("Dodaj min. 2 odbyte sesje — retrospektywa jest bardziej wartościowa przy szerszym procesie");

    return NextResponse.json(
      {
        error: {
          code: "INSUFFICIENT_DATA",
          message: "Sesje nie zawierają wystarczającej treści. Uzupełnij dane, aby retrospektywa miała wartość.",
          missing,
        },
      },
      { status: 400 }
    );
  }

  // ── Generate ────────────────────────────────────────────────────────────────

  // Compute session numbers (chronological order)
  const allSorted = [...clientRecord.sessions].sort(
    (a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime()
  );
  const sessionNumberMap = new Map(allSorted.map((s, i) => [s.id, i + 1]));

  const retroSessions = clientRecord.sessions
    .filter((s) => s.status === "Odbyta")
    .map((s) => ({
      sessionNumber: sessionNumberMap.get(s.id) ?? 0,
      scheduledAt: s.scheduledAt,
      durationMin: s.durationMin,
      status: s.status,
      notesMd: s.notesMd,
      planMd: s.planMd,
      scratchpadMd: s.scratchpadMd,
      summaryMd: s.summaryMd,
      offboarding: s.offboarding,
    }));

  let report: Awaited<ReturnType<typeof generateRetrospectiveJSON>>["report"];
  let truncated: boolean;
  try {
    ({ report, truncated } = await generateRetrospectiveJSON(
      {
        clientName: clientRecord.name,
        clientRole: clientRecord.role,
        clientCompany: clientRecord.company,
        clientStage: clientRecord.stage,
        generalNote: clientRecord.generalNote,
        totalSessionCount: clientRecord.sessions.length,
        completedSessionCount: completedSessions.length,
        sessions: retroSessions,
      },
      userId
    ));
  } catch (err) {
    console.error("[ai/retrospective] error:", err);
    return NextResponse.json({ error: "Wystąpił błąd serwera. Spróbuj ponownie." }, { status: 500 });
  }

  const saved = await prisma.retrospective.create({
    data: {
      clientId,
      reportJson: report as object,
      truncated,
      version: "v1",
    },
  });

  return NextResponse.json({
    id: saved.id,
    reportJson: report,
    truncated,
    version: "v1",
    createdAt: saved.createdAt,
  });
}
