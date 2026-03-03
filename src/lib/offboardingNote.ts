export interface OffboardingData {
  date?: Date | string | null;
  sessionNumber?: number | null;
  hours?: number | null;
  clientLabel?: string | null;
  eventTopic?: string | null;
  learningExperience?: string | null;
  sessionGoals?: string | null;
  homework?: string | null;
  techniques?: string | null;
  keyInsightsClient?: string | null;
  gains?: string | null;
  homeworkDescription?: string | null;
  feedback?: string | null;
  coachReflection?: string | null;
  focusAreas?: string | null;
  additionalNotes?: string | null;
}

function formatDate(d: Date | string | null | undefined): string {
  if (!d) return "";
  const date = new Date(d);
  return date.toLocaleDateString("pl-PL", { day: "numeric", month: "long", year: "numeric" });
}

function section(heading: string, value: string | null | undefined): string {
  const trimmed = value?.trim();
  if (!trimmed) return "";
  return `\n## ${heading}\n${trimmed}`;
}

export function generateOffboardingNote(data: OffboardingData): string {
  const lines: string[] = [];

  lines.push("# Podsumowanie sesji");
  lines.push("");

  const headerParts: string[] = [];
  if (data.date) headerParts.push(`**Data:** ${formatDate(data.date)}`);
  if (data.sessionNumber != null) headerParts.push(`**Numer sesji:** ${data.sessionNumber}`);
  if (data.hours != null) headerParts.push(`**Czas trwania:** ${data.hours} h`);
  if (data.clientLabel?.trim()) headerParts.push(`**Klient:** ${data.clientLabel.trim()}`);

  if (headerParts.length > 0) {
    lines.push(headerParts.join("  \n"));
  }

  const sections = [
    section("Zdarzenie / temat sesji", data.eventTopic),
    section("Cele sesji (zwymiarowane)", data.sessionGoals),
    section("Learning / doświadczenie", data.learningExperience),
    section("Zastosowane ćwiczenia i techniki", data.techniques),
    section("Kluczowe wnioski i odkrycia (słowami klienta)", data.keyInsightsClient),
    section("Uzyskane umiejętności / efekty", data.gains),
    section("Zadania domowe", data.homework),
    section("Zadanie domowe – opis", data.homeworkDescription),
    section("Feedback / uwagi", data.feedback),
    section("Refleksje coacha: learning i zastosowanie w praktyce", data.coachReflection),
    section("Obszary rozwoju / tematy do dalszej superwizji", data.focusAreas),
    section("Dodatkowe przemyślenia / notatki", data.additionalNotes),
  ].filter(Boolean);

  for (const s of sections) {
    lines.push(s);
  }

  return lines.join("\n");
}
