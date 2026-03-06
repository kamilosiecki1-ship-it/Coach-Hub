import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { format, formatDistanceToNow } from "date-fns";
import { pl } from "date-fns/locale";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: Date | string) {
  return format(new Date(date), "d MMM yyyy", { locale: pl });
}

export function formatDateTime(date: Date | string) {
  return format(new Date(date), "d MMM yyyy, HH:mm", { locale: pl });
}

export function formatRelative(date: Date | string) {
  return formatDistanceToNow(new Date(date), { addSuffix: true, locale: pl });
}

export const SESSION_TEMPLATE = `## Kontrakt / cel sesji

(opisz cel sesji, ustalenia, kontekst)

---

## Co powiedział klient (transkrypcja / cytaty)

(wklej transkrypcję lub kluczowe fragmenty wypowiedzi)

---

## Obserwacje coacha

(co zauważyłeś jako coach – emocje, energia, wzorce)

---

## Hipotezy

(jakie możliwe mechanizmy, przekonania, zależności)

---

## Ustalenia / działania

(co klient postanowił zrobić, zobowiązania, następne kroki)
`;

export const STAGE_OPTIONS = ["Wstęp", "W trakcie", "Zakończony"] as const;
export const SESSION_STATUS_OPTIONS = ["Zaplanowana", "Odbyta", "Anulowana"] as const;

export type Stage = (typeof STAGE_OPTIONS)[number];
export type SessionStatus = (typeof SESSION_STATUS_OPTIONS)[number];

export const stageBadgeVariant: Record<Stage, "default" | "secondary" | "outline"> = {
  Wstęp: "outline",
  "W trakcie": "default",
  Zakończony: "secondary",
};

export const statusBadgeVariant: Record<SessionStatus, "default" | "secondary" | "destructive" | "outline"> = {
  Zaplanowana: "outline",
  Odbyta: "default",
  Anulowana: "destructive",
};

/** Maps DB status values to user-facing display labels (DB values are never changed). */
export const SESSION_STATUS_LABEL: Record<string, string> = {
  Zaplanowana: "Zaplanowana",
  Odbyta: "Zakończona",
  Anulowana: "Anulowana",
};
