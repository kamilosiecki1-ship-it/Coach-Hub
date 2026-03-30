/**
 * POST /api/mentor/conversations/[id]/send
 *
 * Streaming SSE endpoint for Mentor AI chat.
 *
 * Streaming lifecycle:
 *  1. Auth + ownership check
 *  2. User message saved to DB immediately (before streaming starts)
 *  3. Context pack built from conversation contextType
 *  4. OpenAI streaming call — deltas sent as SSE events
 *  5. After stream: assistant message saved, conversation.lastMessageAt updated
 *  6. Final SSE event: {done:true, messageId, userMessageId}
 *  7. If message count > 30 and no summary yet: async summarization triggered
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isAiConfigured } from "@/lib/aiService";
import { buildContextPack, buildSystemMessage } from "@/lib/mentorContext";
import { checkAiRateLimit } from "@/lib/rateLimit";
import OpenAI from "openai";

const MODEL = process.env.OPENAI_MODEL ?? "gpt-4o";

function isReasoningModel(model: string): boolean {
  return /^o\d/.test(model);
}

// ─── Rolling Summary (fire-and-forget) ───────────────────────────────────────

async function generateConversationSummary(
  conversationId: string,
  messages: Array<{ role: string; content: string }>,
  userId: string
): Promise<void> {
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const turns = messages
    .map((m) => `${m.role === "user" ? "Coach" : "Mentor"}: ${m.content.slice(0, 400)}`)
    .join("\n\n");

  const prompt = `Napisz krótkie podsumowanie poniższej rozmowy superwizyjnej (max 350 słów). Uwzględnij:
- Główny temat lub cel coacha w tej rozmowie
- Co zostało omówione i jakie rekomendacje zostały udzielone
- Otwarte pytania lub wątki do kontynuacji

Pisz zwięźle i po polsku.

---
${turns}`;

  try {
    const response = await openai.chat.completions.create({
      model: MODEL,
      messages: [{ role: "user", content: prompt }],
      temperature: 0.3,
      max_tokens: 600,
    });

    const summary = response.choices[0]?.message?.content ?? "";
    if (summary) {
      await prisma.mentorConversation.update({
        where: { id: conversationId },
        data: { conversationSummary: summary },
      });
    }

    // Track usage
    if (response.usage) {
      prisma.aiUsageEvent
        .create({
          data: {
            userId,
            model: response.model,
            inputTokens: response.usage.prompt_tokens ?? 0,
            outputTokens: response.usage.completion_tokens ?? 0,
            totalTokens: response.usage.total_tokens ?? 0,
            endpoint: "mentor_summary",
          },
        })
        .catch(() => {});
    }
  } catch (err) {
    console.error("[mentor_summary] Failed:", err);
  }
}

// ─── Route Handler ────────────────────────────────────────────────────────────

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Nieautoryzowany" }, { status: 401 });

  if (!isAiConfigured()) {
    return NextResponse.json({ error: "Integracja z AI nie została skonfigurowana." }, { status: 503 });
  }

  const userId = (session.user as { id: string }).id;

  // Rate limit check
  const rateLimit = await checkAiRateLimit(userId);
  if (rateLimit.blocked) {
    return NextResponse.json({ error: rateLimit.reason }, { status: 429 });
  }

  const { content } = await req.json();

  if (!content?.trim()) {
    return NextResponse.json({ error: "Brak treści wiadomości" }, { status: 400 });
  }

  // Verify ownership
  const conversation = await prisma.mentorConversation.findFirst({
    where: { id: params.id, userId },
    include: {
      client: {
        include: {
          sessions: {
            include: { offboarding: true },
            orderBy: { scheduledAt: "desc" },
          },
        },
      },
      contextSession: {
        include: { offboarding: true },
      },
    },
  });

  if (!conversation) {
    return NextResponse.json({ error: "Nie znaleziono rozmowy" }, { status: 404 });
  }

  // Save user message first
  const userMsg = await prisma.mentorMessage.create({
    data: {
      conversationId: params.id,
      role: "user",
      content: content.trim(),
    },
  });

  // Fetch last 20 messages for context (excluding the one we just saved — it's the current turn)
  const recentMessages = await prisma.mentorMessage.findMany({
    where: { conversationId: params.id },
    orderBy: { createdAt: "asc" },
    take: 21, // last 21 = 20 history + current
  });

  // Build history for AI (skip the just-saved user message for history; it's the current prompt)
  const historyMessages = recentMessages.slice(-21, -1); // last 20 before current

  // Build context pack based on contextType
  const contextPack = buildContextPack(
    conversation.contextType as "PROCESS" | "SESSION" | "GENERAL",
    conversation.contextType === "PROCESS" && conversation.client ? {
      name: conversation.client.name,
      role: conversation.client.role,
      company: conversation.client.company,
      stage: conversation.client.stage,
      generalNote: conversation.client.generalNote,
      sessions: conversation.client.sessions,
    } : null,
    conversation.contextType === "SESSION" ? conversation.contextSession : null,
    // session number: count sessions up to and including this one
    undefined
  );

  const systemMessage = buildSystemMessage(contextPack, conversation.conversationSummary);

  // Build messages array for OpenAI
  type OAIMessage = { role: "system" | "user" | "assistant"; content: string };
  const messagesForAI: OAIMessage[] = [];

  if (isReasoningModel(MODEL)) {
    // Reasoning models: merge system prompt into first user message
    const historyWithSystem: OAIMessage[] = [
      { role: "user", content: `[Instrukcja systemowa]\n${systemMessage}\n\n[Rozmowa — kontynuuj od poniższej historii]` },
      ...historyMessages.map((m) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      })),
      { role: "user", content: content.trim() },
    ];
    messagesForAI.push(...historyWithSystem);
  } else {
    messagesForAI.push(
      { role: "system", content: systemMessage },
      ...historyMessages.map((m) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      })),
      { role: "user", content: content.trim() }
    );
  }

  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const encoder = new TextEncoder();

  // Stream the response
  const stream = new ReadableStream({
    async start(controller) {
      let fullContent = "";
      let inputTokens = 0;
      let outputTokens = 0;
      let totalTokens = 0;

      try {
        const streamParams = isReasoningModel(MODEL)
          ? { model: MODEL, messages: messagesForAI, stream: true as const, max_completion_tokens: 2400 }
          : { model: MODEL, messages: messagesForAI, stream: true as const, temperature: 0.5, max_tokens: 2400, stream_options: { include_usage: true } };

        const aiStream = await openai.chat.completions.create(streamParams as Parameters<typeof openai.chat.completions.create>[0]);

        for await (const chunk of aiStream as AsyncIterable<{ choices: Array<{ delta?: { content?: string | null }; finish_reason?: string | null }>; usage?: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number } | null }>) {
          const delta = chunk.choices[0]?.delta?.content ?? "";
          if (delta) {
            fullContent += delta;
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ delta })}\n\n`));
          }
          // Capture usage from final chunk (stream_options.include_usage)
          if (chunk.usage) {
            inputTokens = chunk.usage.prompt_tokens ?? 0;
            outputTokens = chunk.usage.completion_tokens ?? 0;
            totalTokens = chunk.usage.total_tokens ?? 0;
          }
        }
      } catch (err) {
        console.error("[mentor/send] stream error:", err);
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: "Wystąpił błąd serwera. Spróbuj ponownie." })}\n\n`));
        controller.close();
        return;
      }

      // Save assistant message
      let assistantMsgId: string | null = null;
      try {
        const assistantMsg = await prisma.mentorMessage.create({
          data: {
            conversationId: params.id,
            role: "assistant",
            content: fullContent || "Nie udało się wygenerować odpowiedzi.",
            inputTokens: inputTokens || null,
            outputTokens: outputTokens || null,
            totalTokens: totalTokens || null,
          },
        });
        assistantMsgId = assistantMsg.id;

        // Update conversation timestamp
        await prisma.mentorConversation.update({
          where: { id: params.id },
          data: { lastMessageAt: new Date() },
        });

        // Track AI usage
        if (inputTokens > 0) {
          prisma.aiUsageEvent
            .create({
              data: {
                userId,
                model: MODEL,
                inputTokens,
                outputTokens,
                totalTokens,
                endpoint: "mentor_chat_stream",
              },
            })
            .catch(() => {});
        }

        // Trigger async summarization if threshold exceeded
        const totalMsgCount = await prisma.mentorMessage.count({
          where: { conversationId: params.id },
        });

        if (totalMsgCount > 30 && !conversation.conversationSummary) {
          const allMessages = await prisma.mentorMessage.findMany({
            where: { conversationId: params.id },
            orderBy: { createdAt: "asc" },
            take: 30,
          });
          generateConversationSummary(params.id, allMessages, userId).catch(() => {});
        }
      } catch (dbErr) {
        console.error("[mentor_send] DB save error:", dbErr);
      }

      // Final event
      controller.enqueue(
        encoder.encode(
          `data: ${JSON.stringify({ done: true, messageId: assistantMsgId, userMessageId: userMsg.id })}\n\n`
        )
      );
      controller.close();
    },
  });

  return new NextResponse(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
