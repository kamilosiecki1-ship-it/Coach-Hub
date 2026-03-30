/**
 * GDPR Pseudonymization Utility
 *
 * Replaces PII (client names, company, role) in text content before sending
 * to third-party AI APIs (OpenAI). The mapping token ↔ real value is kept
 * server-side only and NEVER forwarded to OpenAI.
 *
 * Per docs/legal/01-openai-dpa-weryfikacja.md — "Opcja C" (short-term mitigation
 * before Enterprise ZDR agreement).
 */

export interface PseudonymizationMap {
  /** Maps token (e.g. "[KLIENT]") → original value */
  [token: string]: string;
}

/**
 * Build a pseudonymization map from client PII fields.
 * Tokens are stable for a single request; they do not persist across calls.
 */
export function buildPseudonymMap(fields: {
  name?: string | null;
  company?: string | null;
  role?: string | null;
}): PseudonymizationMap {
  const map: PseudonymizationMap = {};
  if (fields.name?.trim()) map["[KLIENT]"] = fields.name.trim();
  if (fields.company?.trim()) map["[FIRMA]"] = fields.company.trim();
  // Role is usually generic (e.g. "CEO") — only pseudonymize if it looks like a name
  // (contains a space or uppercase sequence that could identify someone)
  if (fields.role?.trim() && /\s/.test(fields.role.trim())) {
    map["[ROLA]"] = fields.role.trim();
  }
  return map;
}

/**
 * Replace all occurrences of PII values in `text` with their tokens.
 * Replacement is case-sensitive to avoid false positives.
 */
export function pseudonymizeText(text: string, map: PseudonymizationMap): string {
  let result = text;
  for (const [token, value] of Object.entries(map)) {
    // Escape special regex characters in the value
    const escaped = value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    result = result.replace(new RegExp(escaped, "g"), token);
  }
  return result;
}

/**
 * Pseudonymize all text fields in a session before including them in AI context.
 */
export function pseudonymizeSession<
  T extends {
    notesMd?: string | null;
    planMd?: string | null;
    scratchpadMd?: string | null;
    summaryMd?: string | null;
    offboarding?: {
      generatedNoteMd?: string | null;
      transcript?: string | null;
    } | null;
  }
>(session: T, map: PseudonymizationMap): T {
  if (Object.keys(map).length === 0) return session;

  return {
    ...session,
    notesMd: session.notesMd ? pseudonymizeText(session.notesMd, map) : session.notesMd,
    planMd: session.planMd ? pseudonymizeText(session.planMd, map) : session.planMd,
    scratchpadMd: session.scratchpadMd
      ? pseudonymizeText(session.scratchpadMd, map)
      : session.scratchpadMd,
    summaryMd: session.summaryMd ? pseudonymizeText(session.summaryMd, map) : session.summaryMd,
    offboarding: session.offboarding
      ? {
          ...session.offboarding,
          generatedNoteMd: session.offboarding.generatedNoteMd
            ? pseudonymizeText(session.offboarding.generatedNoteMd, map)
            : session.offboarding.generatedNoteMd,
          transcript: session.offboarding.transcript
            ? pseudonymizeText(session.offboarding.transcript, map)
            : session.offboarding.transcript,
        }
      : session.offboarding,
  };
}

/**
 * Pseudonymize all PII in client name, role, company and all session content.
 * Returns a new object safe to include in OpenAI API calls.
 */
export function pseudonymizeClientContext<
  T extends {
    name: string;
    role?: string | null;
    company?: string | null;
    generalNote?: string | null;
    sessions: Array<{
      notesMd?: string | null;
      planMd?: string | null;
      scratchpadMd?: string | null;
      summaryMd?: string | null;
      offboarding?: { generatedNoteMd?: string | null; transcript?: string | null } | null;
    }>;
  }
>(ctx: T): T {
  const map = buildPseudonymMap({ name: ctx.name, company: ctx.company, role: ctx.role });
  if (Object.keys(map).length === 0) return ctx;

  return {
    ...ctx,
    name: "[KLIENT]",
    company: ctx.company ? "[FIRMA]" : ctx.company,
    role:
      ctx.role && /\s/.test(ctx.role.trim())
        ? "[ROLA]"
        : ctx.role,
    generalNote: ctx.generalNote ? pseudonymizeText(ctx.generalNote, map) : ctx.generalNote,
    sessions: ctx.sessions.map((s) => pseudonymizeSession(s, map)),
  };
}
