/**
 * Mentor AI — Context Building
 *
 * Replaces the monolithic "inject everything every turn" approach with
 * a compact context pack that is built ONCE per conversation turn, based
 * on the conversation's contextType (PROCESS | SESSION | GENERAL).
 *
 * How context packs are built:
 *  - PROCESS: full client metadata + all completed sessions (newest full,
 *    older sessions as compact bullets). Capped at MAX_CONTEXT_CHARS.
 *  - SESSION: only the single selected completed session (full offboarding
 *    note + transcript excerpt + plan/scratchpad highlights).
 *  - GENERAL: no client/session data injected at all.
 *
 * The system message is then assembled as:
 *   [MENTOR_SYSTEM_PROMPT]
 *   ---
 *   > Dla Mentora AI: Rozmawiasz z COACHEM...
 *   [contextPack]
 *   [conversationSummary if present]
 */

import MENTOR_SYSTEM_PROMPT from "./mentorPrompt";
import { pseudonymizeClientContext, buildPseudonymMap, pseudonymizeSession } from "./pseudonymize";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface SessionData {
  id: string;
  scheduledAt: Date | string;
  durationMin?: number | null;
  status: string;
  notesMd: string;
  planMd?: string;
  scratchpadMd?: string;
  summaryMd?: string | null;
  offboarding?: {
    generatedNoteMd?: string | null;
    transcript?: string | null;
  } | null;
}

export interface ClientData {
  name: string;
  role?: string | null;
  company?: string | null;
  stage: string;
  generalNote?: string | null;
  sessions: SessionData[];
}

// ─── Constants ────────────────────────────────────────────────────────────────

const MAX_CONTEXT_CHARS = 30_000;

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmt(date: Date | string): string {
  return new Date(date).toLocaleDateString("pl-PL", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

// ─── Context Pack Builders ───────────────────────────────────────────────────

function buildProcessPack(client: ClientData): string {
  const completed = [...client.sessions]
    .filter((s) => s.status === "Odbyta")
    .sort((a, b) => new Date(b.scheduledAt).getTime() - new Date(a.scheduledAt).getTime());

  const totalSessions = client.sessions.length;
  const completedCount = completed.length;

  const header = [
    `## Dane klienta`,
    `- **Imię i nazwisko:** ${client.name}`,
    client.role ? `- **Rola:** ${client.role}` : null,
    client.company ? `- **Firma:** ${client.company}` : null,
    `- **Etap procesu:** ${client.stage}`,
    client.generalNote ? `- **Notatka ogólna:** ${client.generalNote}` : null,
    `- **Sesje łącznie:** ${totalSessions} (odbytych: ${completedCount})`,
  ]
    .filter(Boolean)
    .join("\n");

  if (completed.length === 0) {
    return `${header}\n\n_Brak odbytych sesji._`;
  }

  let sessionsBlock = "";
  let charsUsed = header.length + 50;

  for (let i = 0; i < completed.length; i++) {
    const s = completed[i];
    const num = totalSessions - client.sessions.indexOf(s);
    const isNewest = i === 0;
    const dateStr = fmt(s.scheduledAt);

    let text: string;

    if (isNewest) {
      const off = s.offboarding;
      const noteSection = off?.generatedNoteMd
        ? `\n\n📋 **Podsumowanie sesji:**\n${off.generatedNoteMd}`
        : "";
      const transcriptRaw = off?.transcript ?? "";
      const transcriptSection = transcriptRaw
        ? `\n\n📝 **Transkrypcja (fragment):**\n${transcriptRaw.slice(0, 3000)}${transcriptRaw.length > 3000 ? "\n\n[…skrócono…]" : ""}`
        : "";
      const planSection =
        s.planMd?.trim()
          ? `\n\n**Plan sesji:**\n${s.planMd.slice(0, 800)}${s.planMd.length > 800 ? "…" : ""}`
          : "";

      text = `### Sesja ${num} (${dateStr}) — NAJNOWSZA\n**Status:** ${s.status}${s.durationMin ? ` | ${s.durationMin} min` : ""}\n\n**Notatki:**\n${s.notesMd || "(brak notatek)"}${planSection}${noteSection}${transcriptSection}`;
    } else {
      const snippet = s.offboarding?.generatedNoteMd
        ? s.offboarding.generatedNoteMd.slice(0, 300)
        : s.notesMd.slice(0, 300);
      text = `### Sesja ${num} (${dateStr})\n**Status:** ${s.status}${s.durationMin ? ` | ${s.durationMin} min` : ""}\n${snippet}${snippet.length >= 300 ? "…" : ""}`;
    }

    if (i > 0 && charsUsed + text.length > MAX_CONTEXT_CHARS) break;

    sessionsBlock += (sessionsBlock ? "\n\n---\n\n" : "") + text;
    charsUsed += text.length;
  }

  return `${header}\n\n## Sesje klienta (od najnowszej)\n\n${sessionsBlock}`;
}

function buildSessionPack(session: SessionData, sessionNumber: number): string {
  const off = session.offboarding;
  const dateStr = fmt(session.scheduledAt);

  const parts: string[] = [
    `## Kontekst: Sesja ${sessionNumber} — ${dateStr}`,
    `**Status:** ${session.status}${session.durationMin ? ` | ${session.durationMin} min` : ""}`,
  ];

  if (off?.generatedNoteMd) {
    parts.push(`\n### Podsumowanie sesji (notatka z offboardingu)\n${off.generatedNoteMd}`);
  } else if (session.notesMd) {
    parts.push(`\n### Notatki z sesji\n${session.notesMd}`);
  }

  if (off?.transcript) {
    const excerpt = off.transcript.slice(0, 4000);
    parts.push(
      `\n### Transkrypcja (fragment)\n${excerpt}${off.transcript.length > 4000 ? "\n\n[…skrócono…]" : ""}`
    );
  }

  if (session.planMd?.trim()) {
    parts.push(`\n### Plan sesji\n${session.planMd.slice(0, 600)}${session.planMd.length > 600 ? "…" : ""}`);
  }
  if (session.scratchpadMd?.trim()) {
    parts.push(`\n### Notatnik sesji\n${session.scratchpadMd.slice(0, 400)}${session.scratchpadMd.length > 400 ? "…" : ""}`);
  }

  return parts.join("\n");
}

// ─── Main Exports ─────────────────────────────────────────────────────────────

export type ContextType = "PROCESS" | "SESSION" | "GENERAL";

/**
 * Build the context block for a Mentor AI conversation turn.
 *
 * @param contextType - PROCESS | SESSION | GENERAL
 * @param client - client data (required for PROCESS; optional for SESSION to provide fallback name)
 * @param session - selected session (required for SESSION context)
 * @param sessionNumber - session ordinal number (required for SESSION context)
 * @returns string to inject into the system message after the system prompt
 */
export function buildContextPack(
  contextType: ContextType,
  client?: ClientData | null,
  session?: SessionData | null,
  sessionNumber?: number
): string {
  if (contextType === "GENERAL") return "";
  if (contextType === "SESSION" && session) {
    // Pseudonymize using client name/company if available, or session content only
    const map = buildPseudonymMap({
      name: client?.name,
      company: client?.company,
      role: client?.role,
    });
    const safeSession = pseudonymizeSession(session, map);
    return buildSessionPack(safeSession, sessionNumber ?? 1);
  }
  if (contextType === "PROCESS" && client) {
    const safeClient = pseudonymizeClientContext(client) as ClientData;
    return buildProcessPack(safeClient);
  }
  return "";
}

/**
 * Assemble the full system message for Mentor AI.
 *
 * @param contextPack - output of buildContextPack()
 * @param conversationSummary - optional rolling summary of the conversation so far
 * @returns system message string to send as the first message in the API call
 */
export function buildSystemMessage(
  contextPack: string,
  conversationSummary?: string | null
): string {
  const framing = `> **Dla Mentora AI:** Rozmawiasz z COACHEM — nie z klientem. Poniżej kontekst klienta i procesu coachingowego.`;

  const parts: string[] = [MENTOR_SYSTEM_PROMPT];

  if (contextPack) {
    parts.push(`---\n\n${framing}\n\n${contextPack}`);
  }

  if (conversationSummary?.trim()) {
    parts.push(
      `---\n\n## Podsumowanie dotychczasowej rozmowy\n\n${conversationSummary}\n\n_(Powyższe to skrót — poniżej masz dostęp do ostatnich wiadomości w pełnej treści.)_`
    );
  }

  return parts.join("\n\n");
}
