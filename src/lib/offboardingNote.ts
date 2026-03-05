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

function field(heading: string, value: string | null | undefined): string {
  const trimmed = value?.trim();
  if (!trimmed) return "";
  return `\n### ${heading}\n${trimmed}`;
}

function sectionBlock(title: string, fields: string[]): string {
  const content = fields.filter(Boolean).join("");
  if (!content) return "";
  return `\n## ${title}${content}`;
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

  // Combine homework fields (backwards compat with legacy homeworkDescription)
  const homeworkCombined = [data.homework, data.homeworkDescription].filter(Boolean).join("\n\n") || null;

  const przebieg = sectionBlock("Przebieg sesji", [
    field("Zdarzenie / temat sesji", data.eventTopic),
    field("Cele sesji (zwymiarowane)", data.sessionGoals),
    field("Zastosowane ćwiczenia i techniki", data.techniques),
  ]);

  const efekty = sectionBlock("Efekty i wnioski", [
    field("Kluczowe wnioski i odkrycia (słowami klienta)", data.keyInsightsClient),
    field("Uzyskane umiejętności / efekty", data.gains),
    field("Zadania domowe", homeworkCombined),
    field("Feedback / uwagi", data.feedback),
  ]);

  const refleksje = sectionBlock("Refleksje coacha", [
    field("Refleksje coacha: learning i zastosowanie w praktyce", data.coachReflection),
    field("Obszary rozwoju / tematy do dalszej superwizji", data.focusAreas),
    field("Dodatkowe przemyślenia / notatki", data.additionalNotes),
  ]);

  for (const block of [przebieg, efekty, refleksje]) {
    if (block) lines.push(block);
  }

  return lines.join("\n");
}
