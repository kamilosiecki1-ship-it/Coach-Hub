import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

function formatPl(date: Date): string {
  const dd = String(date.getDate()).padStart(2, "0");
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const yyyy = date.getFullYear();
  const hh = String(date.getHours()).padStart(2, "0");
  const min = String(date.getMinutes()).padStart(2, "0");
  return `${dd}.${mm}.${yyyy} — ${hh}:${min}`;
}

// POST /api/mentor/messages/[id]/add-to-plan
// Body: { sessionId?: string }
// - Client-bound conversations (clientId set): sessionId optional; omit = use next planned session.
// - GENERAL conversations (clientId null): sessionId REQUIRED (chosen via picker in UI).
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Nieautoryzowany" }, { status: 401 });

  const userId = (session.user as { id: string }).id;

  const message = await prisma.mentorMessage.findFirst({
    where: { id: params.id },
    include: { conversation: true },
  });

  if (!message) return NextResponse.json({ error: "Nie znaleziono wiadomości" }, { status: 404 });

  if (message.conversation.userId !== userId) {
    return NextResponse.json({ error: "Nieautoryzowany" }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const { sessionId } = body as { sessionId?: string };

  const convClientId = message.conversation.clientId;

  // GENERAL (no client) requires explicit sessionId from the picker
  if (!convClientId && !sessionId) {
    return NextResponse.json(
      { error: "sessionId jest wymagane dla rozmów bez klienta", needsSessionPicker: true },
      { status: 400 }
    );
  }

  let targetSession;

  if (sessionId) {
    // Provided sessionId: verify ownership. For client-bound conversations also verify clientId matches.
    targetSession = await prisma.session.findFirst({
      where: {
        id: sessionId,
        ...(convClientId ? { clientId: convClientId } : {}),
        client: { userId },
      },
    });
    if (!targetSession) {
      return NextResponse.json({ error: "Nie znaleziono sesji" }, { status: 404 });
    }
  } else {
    // No sessionId: find next future planned session for this client
    targetSession = await prisma.session.findFirst({
      where: {
        clientId: convClientId as string,
        status: "Zaplanowana",
        scheduledAt: { gte: new Date() },
        client: { userId },
      },
      orderBy: { scheduledAt: "asc" },
    });

    if (!targetSession) {
      return NextResponse.json(
        { error: "Brak zaplanowanej sesji", noSession: true },
        { status: 404 }
      );
    }
  }

  // Reference header with deep-link back to the conversation
  const dateStr = formatPl(new Date());
  const convLink = `/mentor?convId=${message.conversationId}`;
  const header = `> **Mentor AI — sugestia z rozmowy**\n> *${dateStr}* · [Przejdź do rozmowy](${convLink})`;

  const separator = targetSession.planMd?.trim() ? "\n\n---\n\n" : "";
  const newPlanMd = (targetSession.planMd ?? "") + separator + header + "\n\n" + message.content;
  await prisma.session.update({
    where: { id: targetSession.id },
    data: { planMd: newPlanMd },
  });

  return NextResponse.json({
    sessionId: targetSession.id,
    sessionScheduledAt: targetSession.scheduledAt,
    newPlanMd,
  });
}
