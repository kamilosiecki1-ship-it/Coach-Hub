"use client";
import { useState, useCallback } from "react";
import Link from "next/link";
import { cn, SESSION_STATUS_LABEL } from "@/lib/utils";
import { ChevronLeft, ChevronRight } from "lucide-react";

export type CalendarSession = {
  id: string;
  scheduledAt: string;
  status: string;
  sessionNumber: number;
  client: { id: string; name: string };
};

const DAY_LABELS = ["Pn", "Wt", "Śr", "Cz", "Pt", "Sb", "Nd"];
// col index 0=Mon … 5=Sat, 6=Sun
const WEEKEND_COLS = new Set([5, 6]);

const STATUS_BADGE: Record<string, string> = {
  Zaplanowana: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
  Odbyta: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300",
  Odwołana: "bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400",
};

/** Returns Tailwind classes for the day-number circle based on session statuses. */
function cellHighlight(sessions: CalendarSession[]): string {
  if (!sessions.length) return "";
  const hasPlanned = sessions.some((s) => s.status === "Zaplanowana");
  const hasOdbyta = sessions.some((s) => s.status === "Odbyta");
  if (hasPlanned)
    return "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-200";
  if (hasOdbyta)
    return "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200";
  return "bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400";
}

function monthMeta(year: number, month: number /* 1-based */) {
  const first = new Date(year, month - 1, 1);
  const offset = (first.getDay() + 6) % 7; // Mon=0 … Sun=6
  const totalDays = new Date(year, month, 0).getDate();
  return { offset, totalDays };
}

interface Props {
  initialSessions: CalendarSession[];
  initialYear: number;
  initialMonth: number; // 1-based
  todayYear: number;
  todayMonth: number;
  today: number;
}

export function MonthCalendar({
  initialSessions,
  initialYear,
  initialMonth,
  todayYear,
  todayMonth,
  today,
}: Props) {
  const [year, setYear] = useState(initialYear);
  const [month, setMonth] = useState(initialMonth);
  const [sessions, setSessions] = useState<CalendarSession[]>(initialSessions);
  const [loading, setLoading] = useState(false);
  const [selectedDay, setSelectedDay] = useState<number | null>(null);

  const navigate = useCallback(
    async (newYear: number, newMonth: number) => {
      setLoading(true);
      setSelectedDay(null);
      setYear(newYear);
      setMonth(newMonth);
      try {
        const res = await fetch(
          `/api/pulpit/calendar?year=${newYear}&month=${newMonth}`
        );
        if (res.ok) setSessions(await res.json());
      } finally {
        setLoading(false);
      }
    },
    []
  );

  const goToPrev = () => {
    const nm = month === 1 ? 12 : month - 1;
    const ny = month === 1 ? year - 1 : year;
    navigate(ny, nm);
  };

  const goToNext = () => {
    const nm = month === 12 ? 1 : month + 1;
    const ny = month === 12 ? year + 1 : year;
    navigate(ny, nm);
  };

  const { offset, totalDays } = monthMeta(year, month);
  const monthLabel = new Date(year, month - 1, 1).toLocaleDateString("pl-PL", {
    month: "long",
    year: "numeric",
  });

  // Group sessions by day-of-month
  const byDay = new Map<number, CalendarSession[]>();
  for (const s of sessions) {
    const d = new Date(s.scheduledAt).getDate();
    const list = byDay.get(d) ?? [];
    list.push(s);
    byDay.set(d, list);
  }

  // Build flat cell array: nulls for leading offset, then 1..totalDays, then trailing nulls
  const cells: (number | null)[] = [
    ...Array<null>(offset).fill(null),
    ...Array.from({ length: totalDays }, (_, i) => i + 1),
  ];
  const rem = cells.length % 7;
  if (rem > 0) for (let i = 0; i < 7 - rem; i++) cells.push(null);

  const selectedSessions = selectedDay ? (byDay.get(selectedDay) ?? []) : [];

  return (
    <div className="bg-white dark:bg-card rounded-2xl border flex flex-col h-full">
      {/* ── Header ─────────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-4 py-3.5 border-b shrink-0">
        <div className="flex items-center gap-1.5">
          <button
            onClick={goToPrev}
            disabled={loading}
            className="w-6 h-6 rounded-md flex items-center justify-center text-muted-foreground hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors disabled:opacity-40"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>
          <h2 className="text-sm font-semibold capitalize w-36 text-center">
            {monthLabel}
          </h2>
          <button
            onClick={goToNext}
            disabled={loading}
            className="w-6 h-6 rounded-md flex items-center justify-center text-muted-foreground hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors disabled:opacity-40"
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
        <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-100 dark:bg-blue-900/40 border border-blue-300 dark:border-blue-700 inline-block" />
            Zaplanowane
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-100 dark:bg-emerald-900/40 border border-emerald-300 dark:border-emerald-700 inline-block" />
            Zakończone
          </span>
        </div>
      </div>

      {/* ── Grid ───────────────────────────────────────────────── */}
      <div className={cn("px-3 pt-2 pb-1 transition-opacity", loading && "opacity-40 pointer-events-none")}>
        {/* Day-of-week header row */}
        <div className="grid grid-cols-7 mb-0.5">
          {DAY_LABELS.map((d, i) => (
            <div
              key={d}
              className={cn(
                "text-center text-[10px] font-semibold py-1",
                WEEKEND_COLS.has(i)
                  ? "text-slate-400 dark:text-slate-500"
                  : "text-muted-foreground"
              )}
            >
              {d}
            </div>
          ))}
        </div>

        {/* Day cells */}
        <div className="grid grid-cols-7">
          {cells.map((day, i) => {
            const col = i % 7;
            const isWeekend = WEEKEND_COLS.has(col);

            if (day === null) {
              return (
                <div
                  key={i}
                  className={cn(
                    "h-9",
                    isWeekend && "bg-slate-50 dark:bg-slate-800/25"
                  )}
                />
              );
            }

            const daySessions = byDay.get(day) ?? [];
            const highlight = cellHighlight(daySessions);
            const isToday = day === today && year === todayYear && month === todayMonth;
            const isSelected = day === selectedDay;

            return (
              <div
                key={i}
                className={cn(
                  "h-9 flex items-center justify-center",
                  // weekend background only when no session highlight and not selected
                  isWeekend && !highlight && !isSelected
                    ? "bg-slate-50 dark:bg-slate-800/25"
                    : undefined
                )}
              >
                <button
                  onClick={() => setSelectedDay(isSelected ? null : day)}
                  className={cn(
                    "w-7 h-7 flex items-center justify-center rounded-full text-xs transition-all",
                    // Priority: selected > highlight > today > default
                    isSelected
                      ? "ring-2 ring-primary ring-offset-1 font-semibold text-primary"
                      : highlight
                      ? cn(highlight, "font-medium")
                      : isToday
                      ? "bg-primary/10 text-primary font-bold"
                      : "hover:bg-slate-100 dark:hover:bg-slate-800 text-foreground"
                  )}
                >
                  {day}
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Selected-day session list ───────────────────────────── */}
      {selectedDay !== null && (
        <div className="border-t mx-3 mb-3 pt-2">
          {selectedSessions.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-2">
              Brak sesji w tym dniu
            </p>
          ) : (
            <div className="space-y-0.5">
              {selectedSessions.map((s) => (
                <Link
                  key={s.id}
                  href={`/klienci/${s.client.id}/sesje/${s.id}`}
                  className="flex items-center justify-between px-3 py-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold truncate">
                      Sesja {s.sessionNumber} — {s.client.name}
                    </p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      {new Date(s.scheduledAt).toLocaleTimeString("pl-PL", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0 ml-2">
                    <span
                      className={cn(
                        "text-[10px] font-medium px-1.5 py-0.5 rounded-full",
                        STATUS_BADGE[s.status] ?? "bg-slate-100 text-slate-600"
                      )}
                    >
                      {SESSION_STATUS_LABEL[s.status] ?? s.status}
                    </span>
                    <ChevronRight className="w-3 h-3 text-muted-foreground/50" />
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
