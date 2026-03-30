import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

function formatTitle(contextType: string, contextDate?: string): string {
  const date = new Date().toLocaleDateString("pl-PL", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
  if (contextType === "PROCESS") return `Cały proces — ${date}`;
  if (contextType === "GENERAL") return `Ogólne pytanie — ${date}`;
  if (contextType === "SESSION" && contextDate) return contextDate;
  return `Rozmowa — ${date}`;
}

// GET /api/mentor/conversations?clientId=X
// If no clientId: returns ALL conversations for the user (for the global Mentor AI view)
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Nieautoryzowany" }, { status: 401 });

  const userId = (session.user as { id: string }).id;
  const { searchParams } = new URL(req.url);
  const clientId = searchParams.get("clientId");

  if (clientId) {
    // Client-scoped view: verify ownership
    const client = await prisma.client.findFirst({ where: { id: clientId, userId } });
    if (!client) return NextResponse.json({ error: "Nie znaleziono klienta" }, { status: 404 });

    const conversations = await prisma.mentorConversation.findMany({
      where: { userId, clientId },
      orderBy: [{ lastMessageAt: "desc" }, { createdAt: "desc" }],
      include: { _count: { select: { messages: true } } },
    });
    return NextResponse.json(conversations);
  }

  // Global view: return all conversations for user, include client name
  const conversations = await prisma.mentorConversation.findMany({
    where: { userId },
    orderBy: [{ lastMessageAt: "desc" }, { createdAt: "desc" }],
    include: {
      _count: { select: { messages: true } },
      client: { select: { id: true, name: true } },
    },
  });
  return NextResponse.json(conversations);
}

// POST /api/mentor/conversations
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Nieautoryzowany" }, { status: 401 });

  const userId = (session.user as { id: string }).id;
  const { clientId, contextType, contextSessionId } = await req.json();

  if (!contextType) {
    return NextResponse.json({ error: "Brak wymaganego pola: contextType" }, { status: 400 });
  }

  if (!["PROCESS", "SESSION", "GENERAL"].includes(contextType)) {
    return NextResponse.json({ error: "Nieprawidłowy contextType" }, { status: 400 });
  }

  // PROCESS and SESSION require a clientId; GENERAL may omit it
  if (contextType !== "GENERAL" && !clientId) {
    return NextResponse.json({ error: "Brak wymaganego pola: clientId" }, { status: 400 });
  }

  // Verify client ownership (if clientId provided)
  if (clientId) {
    const client = await prisma.client.findFirst({ where: { id: clientId, userId } });
    if (!client) return NextResponse.json({ error: "Nie znaleziono klienta" }, { status: 404 });
  }

  let sessionLabel: string | undefined;
  let resolvedSessionId: string | null = null;

  if (contextType === "SESSION") {
    if (!contextSessionId) {
      return NextResponse.json({ error: "contextSessionId jest wymagane dla SESSION" }, { status: 400 });
    }
    const s = await prisma.session.findFirst({
      where: {
        id: contextSessionId,
        clientId,
        status: "Odbyta",
        client: { userId },
      },
    });
    if (!s) {
      return NextResponse.json(
        { error: "Sesja nie istnieje, nie jest odbyta lub nie należy do tego klienta" },
        { status: 404 }
      );
    }

    const sessionsBeforeOrEqual = await prisma.session.count({
      where: { clientId, scheduledAt: { lte: s.scheduledAt } },
    });
    const sessionDate = s.scheduledAt.toLocaleDateString("pl-PL", {
      day: "numeric",
      month: "long",
    });
    sessionLabel = `Sesja ${sessionsBeforeOrEqual} z ${sessionDate}`;
    resolvedSessionId = contextSessionId;
  }

  const title = formatTitle(contextType, sessionLabel);

  try {
    const conversation = await prisma.mentorConversation.create({
      data: {
        userId,
        ...(clientId ? { clientId } : {}),
        title,
        contextType,
        ...(resolvedSessionId ? { contextSessionId: resolvedSessionId } : {}),
        status: "ACTIVE",
      },
    });
    return NextResponse.json(conversation, { status: 201 });
  } catch (err) {
    console.error("[mentor/conversations POST]", err);
    return NextResponse.json({ error: "Wystąpił błąd serwera. Spróbuj ponownie." }, { status: 500 });
  }
}
