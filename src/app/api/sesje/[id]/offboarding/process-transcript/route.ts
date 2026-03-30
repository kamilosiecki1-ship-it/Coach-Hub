import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isAiConfigured } from "@/lib/aiService";
import OpenAI from "openai";
import type { ChatCompletionCreateParamsNonStreaming } from "openai/resources/chat/completions";

async function getSessionForUser(id: string, userId: string) {
  return prisma.session.findFirst({
    where: { id, client: { userId } },
    include: { client: true },
  });
}

const MODEL = process.env.OPENAI_MODEL ?? "gpt-4o";

function isReasoningModel(model: string): boolean {
  return /^o\d/.test(model);
}

const EXTRACT_SYSTEM_PROMPT = `Jesteś asystentem coacha. Przeanalizuj dostarczoną transkrypcję sesji coachingowej i wyodrębnij informacje do ustrukturyzowanego formularza podsumowania sesji.

Zwróć WYŁĄCZNIE poprawny JSON (bez markdown, bez bloku \`\`\`json) z następującymi polami (ustaw null jeśli brak danych):

{
  "eventTopic": string | null,
  "sessionGoals": string | null,
  "learningExperience": string | null,
  "techniques": string | null,
  "keyInsightsClient": string | null,
  "gains": string | null,
  "homework": string | null,
  "homeworkDescription": string | null,
  "feedback": string | null,
  "coachReflection": string | null,
  "focusAreas": string | null,
  "additionalNotes": string | null
}

Zasady:
- Pisz po polsku.
- Zachowaj konkretność – wyciągaj fakty z transkrypcji, nie wymyślaj.
- Dla keyInsightsClient używaj cytatów lub bliskich parafraz wypowiedzi klienta.`;

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Nieautoryzowany" }, { status: 401 });

  if (!isAiConfigured()) {
    return NextResponse.json({ error: "Integracja z AI nie została skonfigurowana." }, { status: 503 });
  }

  const userId = (session.user as { id: string }).id;
  const s = await getSessionForUser(params.id, userId);
  if (!s) return NextResponse.json({ error: "Nie znaleziono sesji" }, { status: 404 });

  const { transcript } = await req.json();
  if (!transcript?.trim()) {
    return NextResponse.json({ error: "Brak transkrypcji" }, { status: 400 });
  }

  const userContent = `Oto transkrypcja sesji coachingowej:\n\n---\n${transcript}\n---\n\nWyodrębnij informacje i zwróć wyłącznie JSON.`;

  let requestParams: ChatCompletionCreateParamsNonStreaming;

  if (isReasoningModel(MODEL)) {
    // Reasoning models: merge system into user message, use max_completion_tokens, no temperature
    requestParams = {
      model: MODEL,
      messages: [
        {
          role: "user",
          content: `[Instrukcja systemowa]\n${EXTRACT_SYSTEM_PROMPT}\n\n[Zadanie]\n${userContent}`,
        },
      ],
      max_completion_tokens: 3000,
    };
  } else {
    requestParams = {
      model: MODEL,
      messages: [
        { role: "system", content: EXTRACT_SYSTEM_PROMPT },
        { role: "user", content: userContent },
      ],
      temperature: 0.2,
      max_tokens: 2000,
      response_format: { type: "json_object" },
    };
  }

  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  try {
    const response = await openai.chat.completions.create(requestParams);

    // Track AI usage
    if (response.usage) {
      prisma.aiUsageEvent.create({
        data: {
          userId,
          model: response.model,
          inputTokens: response.usage.prompt_tokens ?? 0,
          outputTokens: response.usage.completion_tokens ?? 0,
          totalTokens: response.usage.total_tokens ?? 0,
          endpoint: "process_transcript",
        },
      }).catch((err: unknown) => console.error("[aiUsage] Failed to save usage event:", err));
    }

    const raw = response.choices[0]?.message?.content ?? "{}";

    // Extract JSON — strip possible markdown fences if model ignored instructions
    const jsonStr = raw.replace(/^```json?\s*/i, "").replace(/```\s*$/, "").trim();

    let extracted: Record<string, string | null> = {};
    try {
      extracted = JSON.parse(jsonStr);
    } catch {
      return NextResponse.json({ error: "Wystąpił błąd serwera. Spróbuj ponownie." }, { status: 500 });
    }

    return NextResponse.json({ fields: extracted });
  } catch (err) {
    console.error("[process-transcript] AI error:", err);
    return NextResponse.json({ error: "Wystąpił błąd serwera. Spróbuj ponownie." }, { status: 500 });
  }
}
