import OpenAI from "openai";
import type { ChatCompletionCreateParamsNonStreaming } from "openai/resources/chat/completions";
import MENTOR_SYSTEM_PROMPT from "./mentorPrompt";
import { prisma } from "./prisma";

let openaiClient: OpenAI | null = null;

function getClient(): OpenAI {
  if (!openaiClient) {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error("OPENAI_API_KEY nie jest skonfigurowany.");
    }
    openaiClient = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }
  return openaiClient;
}

export function isAiConfigured(): boolean {
  return !!process.env.OPENAI_API_KEY;
}

const MODEL = process.env.OPENAI_MODEL ?? "gpt-4o";

function isReasoningModel(model: string): boolean {
  return /^o\d/.test(model);
}

type Message = { role: "system" | "user" | "assistant"; content: string };

function buildRequest(
  messages: Message[],
  maxTokens: number,
  temperature?: number
): ChatCompletionCreateParamsNonStreaming {
  if (isReasoningModel(MODEL)) {
    const systemMsg = messages.find((m) => m.role === "system");
    const otherMessages = messages.filter((m) => m.role !== "system");
    const firstUser = otherMessages.find((m) => m.role === "user");
    const rest = otherMessages.filter((m) => m !== firstUser);

    const merged: Message[] = systemMsg
      ? [
          {
            role: "user",
            content: `[Instrukcja systemowa]\n${systemMsg.content}\n\n[Wiadomość]\n${firstUser?.content ?? ""}`,
          },
          ...rest,
        ]
      : otherMessages;

    return { model: MODEL, messages: merged, max_completion_tokens: maxTokens };
  }

  return {
    model: MODEL,
    messages,
    temperature: temperature ?? 0.7,
    max_tokens: maxTokens,
  };
}

// ─── Usage tracking (fire-and-forget) ────────────────────────────────────────

function logUsage(
  response: { model: string; usage?: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number } | null },
  userId: string | undefined,
  endpoint: string
): void {
  if (!userId) return;
  const usage = response.usage;
  prisma.aiUsageEvent
    .create({
      data: {
        userId,
        model: response.model,
        inputTokens: usage?.prompt_tokens ?? 0,
        outputTokens: usage?.completion_tokens ?? 0,
        totalTokens: usage?.total_tokens ?? 0,
        endpoint,
      },
    })
    .catch((err: unknown) => console.error("[aiUsage] Failed to save usage event:", err));
}

// ─── MENTOR_AI_SYSTEM_PROMPT alias ───────────────────────────────────────────
const MENTOR_AI_SYSTEM_PROMPT = MENTOR_SYSTEM_PROMPT;

// ─── Context Builder ──────────────────────────────────────────────────────────

const MAX_CONTEXT_CHARS = 50000;

export interface SessionForContext {
  scheduledAt: Date | string;
  durationMin?: number | null;
  status: string;
  notesMd: string;
  summaryMd?: string | null;
  offboarding?: { generatedNoteMd: string; transcript?: string | null } | null;
}

export interface ClientContext {
  name: string;
  role?: string | null;
  company?: string | null;
  stage: string;
  generalNote?: string | null;
  sessions: SessionForContext[];
}

export interface BuiltContext {
  contextBlock: string;
  contextSummary: string;
  sessionsIncluded: number;
  totalSessions: number;
  newestSessionDate: string | null;
}

function formatSessionDate(date: Date | string): string {
  const d = new Date(date);
  return d.toLocaleDateString("pl-PL", { day: "numeric", month: "long", year: "numeric" });
}

export function buildClientContext(ctx: ClientContext): BuiltContext {
  const { name, role, company, stage, generalNote, sessions } = ctx;
  const totalSessions = sessions.length;

  const sorted = [...sessions].sort(
    (a, b) => new Date(b.scheduledAt).getTime() - new Date(a.scheduledAt).getTime()
  );

  const newestSessionDate = sorted.length > 0 ? formatSessionDate(sorted[0].scheduledAt) : null;

  const headerLines = [
    `## Dane klienta`,
    `- **Imię i nazwisko:** ${name}`,
    role ? `- **Rola:** ${role}` : null,
    company ? `- **Firma:** ${company}` : null,
    `- **Etap procesu:** ${stage}`,
    generalNote ? `- **Notatka ogólna:** ${generalNote}` : null,
    `- **Liczba sesji łącznie:** ${totalSessions}`,
  ]
    .filter(Boolean)
    .join("\n");

  let sessionsBlock = "";
  let sessionsIncluded = 0;
  let charsUsed = headerLines.length;

  for (let i = 0; i < sorted.length; i++) {
    const s = sorted[i];
    const isNewest = i === 0;
    const sessionDate = formatSessionDate(s.scheduledAt);

    let sessionText: string;

    if (isNewest) {
      const offboardingSection = s.offboarding?.generatedNoteMd
        ? `\n\n📋 **Wygenerowana notatka z offboardingu:**\n${s.offboarding.generatedNoteMd}`
        : "";
      const transcriptRaw = s.offboarding?.transcript ?? "";
      const transcriptSection = transcriptRaw
        ? `\n\n📝 **Transkrypcja sesji:**\n${transcriptRaw.slice(0, 5000)}${transcriptRaw.length > 5000 ? "\n\n[…transkrypcja skrócona ze względu na długość…]" : ""}`
        : "";
      sessionText = `### Sesja ${totalSessions - i} (${sessionDate}) – NAJNOWSZA\n**Status:** ${s.status}${s.durationMin ? ` | ${s.durationMin} min` : ""}\n\n**Notatki:**\n${s.notesMd || "(brak notatek)"}${s.summaryMd ? `\n\n**Podsumowanie:** ${s.summaryMd}` : ""}${offboardingSection}${transcriptSection}`;
    } else {
      const content = s.summaryMd
        ? `**Podsumowanie:** ${s.summaryMd}`
        : `**Notatki (fragment):** ${s.notesMd.slice(0, 800)}${s.notesMd.length > 800 ? "…" : ""}`;

      const offboardingNote = s.offboarding?.generatedNoteMd ?? "";
      const offboardingSection = offboardingNote
        ? `\n\n📋 **Notatka z offboardingu:**\n${offboardingNote.slice(0, 600)}${offboardingNote.length > 600 ? "…" : ""}`
        : "";

      const transcriptRaw = s.offboarding?.transcript ?? "";
      const transcriptSection = transcriptRaw
        ? `\n\n📝 **Transkrypcja (fragment):** ${transcriptRaw.slice(0, 400)}${transcriptRaw.length > 400 ? "…" : ""}`
        : "";

      sessionText = `### Sesja ${totalSessions - i} (${sessionDate})\n**Status:** ${s.status}${s.durationMin ? ` | ${s.durationMin} min` : ""}\n\n${content}${offboardingSection}${transcriptSection}`;
    }

    const wouldUse = charsUsed + sessionText.length + 10;
    if (i > 0 && wouldUse > MAX_CONTEXT_CHARS) {
      break;
    }

    sessionsBlock += (sessionsBlock ? "\n\n---\n\n" : "") + sessionText;
    charsUsed += sessionText.length;
    sessionsIncluded++;
  }

  const truncationNote =
    sessionsIncluded < totalSessions
      ? `\n\n> **Uwaga systemowa:** Z powodu limitu długości kontekstu uwzględniono tylko ${sessionsIncluded} z ${totalSessions} sesji (od najnowszej). Starsze sesje zostały pominięte.`
      : "";

  const contextBlock = `${headerLines}\n\n## Sesje klienta (od najnowszej)\n\n${sessionsBlock || "(brak sesji)"}${truncationNote}`;

  const contextSummary =
    sessionsIncluded === 0
      ? "Brak sesji w bazie."
      : sessionsIncluded === totalSessions
        ? `Kontekst: ${totalSessions} ${totalSessions === 1 ? "sesja" : totalSessions < 5 ? "sesje" : "sesji"}${newestSessionDate ? ` (najnowsza: ${newestSessionDate})` : ""}.`
        : `Kontekst: ${sessionsIncluded} z ${totalSessions} sesji${newestSessionDate ? ` (najnowsza: ${newestSessionDate})` : ""} — starsze pominięte ze względu na długość.`;

  return { contextBlock, contextSummary, sessionsIncluded, totalSessions, newestSessionDate };
}

// ─── Main Mentor AI Response ──────────────────────────────────────────────────

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export async function generateMentorResponse(
  clientCtx: ClientContext,
  history: ChatMessage[],
  userId?: string
): Promise<string> {
  const client = getClient();
  const { contextBlock } = buildClientContext(clientCtx);

  const coachFraming = `> **Dla Mentora AI:** Rozmawiasz z COACHEM — nie z klientem. Poniżej kontekst coachingowy klienta, z którym coach pracuje.`;
  const systemPrompt = `${MENTOR_SYSTEM_PROMPT}\n\n---\n\n${coachFraming}\n\n## Kontekst coachingowy\n\n${contextBlock}`;

  const recentHistory = history.slice(-30);

  let requestParams: ChatCompletionCreateParamsNonStreaming;

  if (isReasoningModel(MODEL)) {
    const allContent = `[Instrukcja systemowa]\n${systemPrompt}\n\n[Rozmowa]`;
    const msgs: Message[] = [{ role: "user", content: allContent }];
    for (const msg of recentHistory) {
      msgs.push({ role: msg.role, content: msg.content });
    }
    requestParams = { model: MODEL, messages: msgs, max_completion_tokens: 2400 };
  } else {
    requestParams = {
      model: MODEL,
      messages: [
        { role: "system", content: systemPrompt },
        ...recentHistory,
      ],
      temperature: 0.8,
      max_tokens: 2400,
    };
  }

  const response = await client.chat.completions.create(requestParams);
  logUsage(response, userId, "mentor_chat");
  return response.choices[0]?.message?.content ?? "Nie udało się wygenerować odpowiedzi.";
}

// ─── Process Closing Report (EMCC / ICF accreditation) ───────────────────────

export async function generateProcessReport(
  ctx: ClientContext & { sessions: (SessionForContext & { durationMin?: number | null })[] },
  userId?: string
): Promise<{ report: string; truncated: boolean }> {
  const client = getClient();

  const { contextBlock, sessionsIncluded, totalSessions } = buildClientContext(ctx);
  const truncated = sessionsIncluded < totalSessions;

  const totalHours = ctx.sessions
    .filter((s) => s.status === "Odbyta")
    .reduce((sum, s) => sum + (s.durationMin ? s.durationMin / 60 : 0), 0);
  const hoursLabel = totalHours > 0 ? `${Math.round(totalHours * 100) / 100} h` : "brak danych";
  const completedCount = ctx.sessions.filter((s) => s.status === "Odbyta").length;

  const userPrompt = `Jesteś ekspertem od akredytacji coachingowej EMCC i ICF. Wygeneruj RAPORT KOŃCOWY PROCESU COACHINGOWEGO na podstawie poniższych danych. Raport ma służyć jako oficjalna dokumentacja procesu — zarówno do archiwum coacha, jak i jako materiał dowodowy przy wniosku o akredytację lub jej odnowienie.

${contextBlock}

---

## Instrukcja generowania raportu

Raport powinien zawierać następujące sekcje:

### 1. Dane procesu i klienta
- Pełne dane klienta (imię, rola, firma, etap)
- Łączna liczba sesji: ${ctx.sessions.length} (odbytych: ${completedCount})
- Łączny czas coachingu: ${hoursLabel}
- Ogólna notatka i kontekst klienta

### 2. Cel i zakres procesu
- Zidentyfikowany cel główny procesu coachingowego
- Obszary tematyczne objęte procesem
- Punkt startowy klienta

### 3. Przebieg sesji (chronologicznie)
Dla każdej sesji: data, główny temat, kluczowe wnioski/odkrycia klienta, zadania wdrożeniowe. Format tabelaryczny jeśli sesji jest więcej niż 3.

### 4. Postęp i zmiany klienta
- Kluczowe przełomy i momenty w procesie
- Konkretne zmiany zachowań, przekonań, podejścia
- Wyniki i osiągnięcia
- Obszary pozostające do pracy

### 5. Zastosowane metody i narzędzia
- Techniki coachingowe użyte w procesie
- Modele i frameworki (jeśli widoczne z notatek)

### 6. Refleksja coacha
- Osobista nauka coacha z tego procesu
- Co działało szczególnie dobrze
- Co coach zrobiłby inaczej
- Obserwacje o własnym stylu i podejściu

### 7. Wykazane kompetencje ICF/EMCC (dla celów akredytacyjnych)
Odnieś przebieg procesu do kompetencji ICF Core Competencies:
- Fundamenty (etyka, coaching mindset)
- Współtworzenie relacji (zaufanie, obecność)
- Efektywna komunikacja (aktywne słuchanie, silne pytania)
- Pielęgnowanie uczenia się i wzrostu (świadomość, projektowanie działań, odpowiedzialność)

Dla każdej kompetencji: konkretny przykład z tego procesu.

### 8. Dane do dokumentacji akredytacyjnej
- Typ coachingu: indywidualny coaching zawodowy/menedżerski
- Liczba godzin coachingowych: ${hoursLabel}
- Liczba sesji: ${completedCount} (odbytych) z ${ctx.sessions.length} (łącznie)
- Zgodność z Kodeksem Etyki ICF/EMCC: tak
- Pole do uzupełnienia: czy proces był superwizowany (tak/nie + kiedy)

### 9. Podsumowanie i rekomendacje
- Zwięzłe podsumowanie procesu (2–3 zdania)
- Rekomendacje dla klienta na dalszy rozwój
- Rekomendacje dotyczące kontynuacji współpracy

---

Pisz profesjonalnie i konkretnie. Używaj Markdown. Język: wyłącznie polski. Bądź szczegółowy — raport ma wartość dokumentacyjną i akredytacyjną.`;

  const response = await client.chat.completions.create(
    buildRequest(
      [
        { role: "system", content: MENTOR_AI_SYSTEM_PROMPT },
        { role: "user", content: userPrompt },
      ],
      3500,
      0.6
    )
  );

  logUsage(response, userId, "process_report");
  const report =
    response.choices[0]?.message?.content ?? "Nie udało się wygenerować raportu końcowego.";
  return { report, truncated };
}

// ─── Retrospective ────────────────────────────────────────────────────────────

export interface RetrospectiveContext {
  clientName: string;
  clientRole?: string | null;
  clientCompany?: string | null;
  clientStage: string;
  generalNote?: string | null;
  sessions: SessionForContext[];
}

export async function generateRetrospective(
  ctx: RetrospectiveContext,
  userId?: string
): Promise<{ report: string; truncated: boolean }> {
  const client = getClient();

  const clientCtx: ClientContext = {
    name: ctx.clientName,
    role: ctx.clientRole,
    company: ctx.clientCompany,
    stage: ctx.clientStage,
    generalNote: ctx.generalNote,
    sessions: ctx.sessions,
  };

  const { contextBlock, sessionsIncluded, totalSessions } = buildClientContext(clientCtx);
  const truncated = sessionsIncluded < totalSessions;

  const userPrompt = `Wygeneruj szczegółową retrospektywę procesu coachingowego dla poniższego klienta.\n\n${contextBlock}\n\n---\n\nRetrospektywa powinna zawierać:\n\n### Podsumowanie procesu\n(ogólny przebieg, liczba sesji, zakres czasowy)\n\n### Kluczowe tematy i wątki\n(co pojawiało się w kolejnych sesjach, jak ewoluowały tematy)\n\n### Postęp i zmiany\n(co się zmieniło u klienta – możliwa tabela porównawcza)\n\n### Mocne strony klienta\n(zasoby, które ujawniły się w procesie)\n\n### Obszary do dalszej pracy\n(co wymaga kontynuacji lub pogłębienia)\n\n### Pytania do refleksji na dalszy proces\n(3–5 pytań dla coacha)\n\nUżyj formatu Markdown. Pisz po polsku. Zachowaj profesjonalny, refleksyjny ton.`;

  const response = await client.chat.completions.create(
    buildRequest(
      [
        { role: "system", content: MENTOR_AI_SYSTEM_PROMPT },
        { role: "user", content: userPrompt },
      ],
      2500,
      0.7
    )
  );

  logUsage(response, userId, "retrospective");
  const report =
    response.choices[0]?.message?.content ?? "Nie udało się wygenerować retrospektywy.";
  return { report, truncated };
}
