import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { generateMentorResponse, buildClientContext, isAiConfigured } from "@/lib/aiService";
import type { ChatMessage } from "@/lib/aiService";

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
  const { clientId, message } = await req.json();

  if (!clientId || !message) {
    return NextResponse.json({ error: "Brak wymaganych pól: clientId, message" }, { status: 400 });
  }

  // Verify client belongs to this coach
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

  // Get or create chat thread
  let thread = await prisma.chatThread.findUnique({ where: { clientId } });
  if (!thread) {
    thread = await prisma.chatThread.create({ data: { clientId } });
  }

  // Store user message
  await prisma.chatMessage.create({
    data: { threadId: thread.id, role: "user", contentMd: message },
  });

  // Fetch last 60 messages from DB; aiService will use the last 30 for AI
  const allMessages = await prisma.chatMessage.findMany({
    where: { threadId: thread.id },
    orderBy: { createdAt: "asc" },
    take: 60,
  });

  const history: ChatMessage[] = allMessages.map((m) => ({
    role: m.role as "user" | "assistant",
    content: m.contentMd,
  }));

  // Build client context
  const clientCtx = {
    name: clientRecord.name,
    role: clientRecord.role,
    company: clientRecord.company,
    stage: clientRecord.stage,
    generalNote: clientRecord.generalNote,
    sessions: clientRecord.sessions,
  };

  const { contextSummary } = buildClientContext(clientCtx);

  // Call AI with full conversation history (slice(-30) applied in aiService)
  const reply = await generateMentorResponse(clientCtx, history, userId);

  // Store assistant message
  const assistantMsg = await prisma.chatMessage.create({
    data: { threadId: thread.id, role: "assistant", contentMd: reply },
  });

  // Update thread timestamp
  await prisma.chatThread.update({
    where: { id: thread.id },
    data: { updatedAt: new Date() },
  });

  return NextResponse.json({
    message: {
      id: assistantMsg.id,
      role: "assistant",
      contentMd: reply,
      createdAt: assistantMsg.createdAt,
    },
    contextSummary,
  });
}
