import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { ArrowRight, ChevronRight, BookMarked, Pin, Brain } from "lucide-react";
import Link from "next/link";
import { startOfMonth, endOfMonth, getDaysInMonth, getDay } from "date-fns";
import { cn, formatDateTime, SESSION_STATUS_LABEL } from "@/lib/utils";
import { MonthCalendar } from "@/components/dashboard/MonthCalendar";

const STATUS_COLORS: Record<string, string> = {
  Zaplanowana: "bg-blue-50 text-blue-700 dark:bg-blue-950/30 dark:text-blue-300",
  Odbyta: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300",
  Odwołana: "bg-red-50 text-red-700 dark:bg-red-950/30 dark:text-red-300",
};

const STAGE_COLORS: Record<string, string> = {
  Onboarding:
    "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/30 dark:text-blue-300 dark:border-blue-800",
  "W trakcie":
    "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-300 dark:border-emerald-800",
  Zakończony:
    "bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700",
  Zawieszony:
    "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-300 dark:border-amber-800",
};

function relativeTime(date: Date): string {
  const diffMs = Date.now() - date.getTime();
  const mins = Math.floor(diffMs / 60_000);
  if (mins < 1) return "przed chwilą";
  if (mins < 60) return `${mins} min temu`;
  const h = Math.floor(mins / 60);
  if (h < 24) return `${h} godz. temu`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d} ${d === 1 ? "dzień" : "dni"} temu`;
  const w = Math.floor(d / 7);
  if (w < 5) return `${w} tyg. temu`;
  return date.toLocaleDateString("pl-PL", { day: "numeric", month: "short" });
}

export default async function PulpitPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/logowanie");

  const userId = (session.user as { id: string }).id;
  const now = new Date();
  const monthStart = startOfMonth(now);
  const monthEnd = endOfMonth(now);

  const [
    sessionsThisMonth,
    calendarSessions,
    recentSessions,
    recentClients,
    recentNotes,
    recentMentorConvs,
  ] = await Promise.all([
    // Hero stats (only completed sessions)
    prisma.session.findMany({
      where: { client: { userId }, scheduledAt: { gte: monthStart, lte: monthEnd }, status: "Odbyta" },
      select: { durationMin: true },
    }),
    // Calendar: all statuses for current month
    prisma.session.findMany({
      where: { client: { userId }, scheduledAt: { gte: monthStart, lte: monthEnd } },
      select: {
        id: true,
        scheduledAt: true,
        status: true,
        clientId: true,
        client: { select: { id: true, name: true } },
      },
      orderBy: { scheduledAt: "asc" },
    }),
    prisma.session.findMany({
      where: { client: { userId } },
      orderBy: { scheduledAt: "desc" },
      take: 5,
      include: { client: { select: { id: true, name: true } } },
    }),
    prisma.client.findMany({
      where: { userId },
      orderBy: { updatedAt: "desc" },
      take: 5,
    }),
    prisma.note.findMany({
      where: { userId },
      orderBy: [{ isPinned: "desc" }, { updatedAt: "desc" }],
      take: 4,
      select: { id: true, title: true, plainText: true, isPinned: true, updatedAt: true },
    }),
    prisma.mentorConversation.findMany({
      where: { userId },
      orderBy: [{ lastMessageAt: "desc" }, { createdAt: "desc" }],
      take: 4,
      include: { client: { select: { id: true, name: true } } },
    }),
  ]);

  // Hero stats
  const totalMinutes = sessionsThisMonth.reduce((acc, s) => acc + (s.durationMin ?? 0), 0);
  const totalHours = Math.floor(totalMinutes / 60);
  const remainingMinutes = totalMinutes % 60;

  // Calendar metadata for current month
  const monthOffset = (getDay(monthStart) + 6) % 7; // Mon=0 … Sun=6
  const totalDays = getDaysInMonth(now);
  const today = now.getDate();
  const todayYear = now.getFullYear();
  const todayMonth = now.getMonth() + 1;

  // Compute session numbers for initial calendar data
  const uniqueClientIds = Array.from(new Set(calendarSessions.map((s) => s.clientId)));
  const allClientSessions =
    uniqueClientIds.length > 0
      ? await prisma.session.findMany({
          where: { clientId: { in: uniqueClientIds } },
          select: { id: true, clientId: true, scheduledAt: true },
          orderBy: { scheduledAt: "asc" },
        })
      : [];
  const clientOrder = new Map<string, string[]>();
  for (const s of allClientSessions) {
    const list = clientOrder.get(s.clientId) ?? [];
    list.push(s.id);
    clientOrder.set(s.clientId, list);
  }
  const calendarSessionsWithNumbers = calendarSessions.map((s) => ({
    id: s.id,
    scheduledAt: s.scheduledAt.toISOString(),
    status: s.status,
    sessionNumber: (clientOrder.get(s.clientId)?.indexOf(s.id) ?? -1) + 1,
    client: s.client,
  }));

  return (
    <AppLayout>
      <div className="p-8 max-w-6xl mx-auto">
        {/* ── Hero ──────────────────────────────────────────────── */}
        <div className="relative overflow-hidden rounded-2xl header-gradient mb-6">
          <div className="absolute -top-8 -right-8 w-56 h-56 rounded-full bg-white/20 blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 -left-6 w-44 h-44 rounded-full bg-blue-300/20 blur-2xl pointer-events-none" />
          <div className="relative z-10 px-8 py-7">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
              <div>
                <h1 className="text-2xl font-semibold text-white">Pulpit</h1>
                <p className="text-sm text-white/70 mt-0.5">
                  Witaj, {session.user.name ?? session.user.email}! Oto Twój przegląd coachingowy.
                </p>
              </div>
              <div className="flex items-center gap-8">
                <div className="text-center">
                  <p className="text-3xl font-bold text-white leading-none">{sessionsThisMonth.length}</p>
                  <p className="text-xs text-white/60 mt-1.5">Sesji w miesiącu</p>
                </div>
                <div className="w-px h-12 bg-white/20" />
                <div className="text-center">
                  <p className="text-3xl font-bold text-white leading-none">
                    {totalHours > 0 ? `${totalHours}h` : ""}
                    {remainingMinutes > 0
                      ? ` ${remainingMinutes}m`
                      : totalMinutes === 0
                      ? "0h"
                      : ""}
                  </p>
                  <p className="text-xs text-white/60 mt-1.5">Łączny czas</p>
                </div>
                <div className="w-px h-12 bg-white/20" />
                <div className="text-center">
                  <p className="text-3xl font-bold text-white leading-none">{recentClients.length}</p>
                  <p className="text-xs text-white/60 mt-1.5">Aktywni klienci</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── Top row: Klienci | Sesje | Kalendarz ──────────────── */}
        {/* Grid: klienci (2fr) + sesje (2fr) + calendar (3fr) */}
        <div className="grid grid-cols-1 lg:grid-cols-[2fr_2fr_3fr] gap-5 mb-5">
          {/* Ostatni klienci */}
          <div className="bg-white dark:bg-card rounded-2xl border flex flex-col">
            <div className="flex items-center justify-between px-5 py-4 border-b shrink-0">
              <h2 className="text-sm font-semibold">Ostatni klienci</h2>
              <Link
                href="/klienci"
                className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
              >
                Wszyscy <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
            <div className="divide-y divide-border flex-1">
              {recentClients.length === 0 ? (
                <div className="px-5 py-6">
                  <p className="text-sm text-muted-foreground mb-3">Brak klientów.</p>
                  <Button asChild size="sm">
                    <Link href="/klienci">Dodaj klienta</Link>
                  </Button>
                </div>
              ) : (
                recentClients.map((c) => {
                  const stageColor =
                    STAGE_COLORS[c.stage] ?? "bg-slate-100 text-slate-600 border-slate-200";
                  return (
                    <Link
                      key={c.id}
                      href={`/klienci/${c.id}`}
                      className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      <div className="w-7 h-7 rounded-xl bg-blue-50 dark:bg-blue-950/30 flex items-center justify-center text-blue-700 dark:text-blue-300 text-xs font-semibold shrink-0">
                        {c.name.charAt(0)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium truncate leading-none">{c.name}</p>
                        <p className="text-xs text-muted-foreground truncate mt-0.5">
                          {c.role ?? c.company ?? "—"}
                        </p>
                      </div>
                      <span
                        className={cn(
                          "text-[10px] font-medium px-1.5 py-0.5 rounded-full border shrink-0",
                          stageColor
                        )}
                      >
                        {c.stage}
                      </span>
                    </Link>
                  );
                })
              )}
            </div>
          </div>

          {/* Ostatnie sesje */}
          <div className="bg-white dark:bg-card rounded-2xl border flex flex-col">
            <div className="flex items-center justify-between px-5 py-4 border-b shrink-0">
              <h2 className="text-sm font-semibold">Ostatnie sesje</h2>
              <Link
                href="/klienci"
                className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
              >
                Wszystkie <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
            <div className="divide-y divide-border flex-1">
              {recentSessions.length === 0 ? (
                <p className="text-sm text-muted-foreground px-5 py-6">
                  Brak sesji. Dodaj pierwszego klienta.
                </p>
              ) : (
                recentSessions.map((s) => (
                  <Link
                    key={s.id}
                    href={`/klienci/${s.client.id}/sesje/${s.id}`}
                    className="flex items-center justify-between px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate leading-none">{s.client.name}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {formatDateTime(s.scheduledAt)}
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0 ml-2">
                      <span
                        className={cn(
                          "text-[10px] font-medium px-1.5 py-0.5 rounded-full",
                          STATUS_COLORS[s.status] ?? "bg-slate-100 text-slate-600"
                        )}
                      >
                        {SESSION_STATUS_LABEL[s.status] ?? s.status}
                      </span>
                      <ChevronRight className="w-3 h-3 text-muted-foreground/50" />
                    </div>
                  </Link>
                ))
              )}
            </div>
          </div>

          {/* Kalendarz */}
          <MonthCalendar
            initialSessions={calendarSessionsWithNumbers}
            initialYear={todayYear}
            initialMonth={todayMonth}
            todayYear={todayYear}
            todayMonth={todayMonth}
            today={today}
          />
        </div>

        {/* ── Ostatnie rozmowy z Mentorem AI ────────────────────── */}
        <div className="rounded-2xl border overflow-hidden mb-5">
          {/* Subtle blue-tinted header */}
          <div className="bg-gradient-to-r from-blue-100 to-blue-50/60 dark:from-blue-900/30 dark:to-blue-950/10 border-b px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Brain className="w-4 h-4 text-primary" />
                </div>
                <h2 className="text-sm font-semibold text-foreground">
                  Ostatnie rozmowy z Mentorem AI
                </h2>
              </div>
              <Link
                href="/mentor"
                className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
              >
                Wszystkie rozmowy <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
          </div>
          {/* Body */}
          <div className="bg-white dark:bg-card">
            {recentMentorConvs.length === 0 ? (
              <p className="text-sm text-muted-foreground px-6 py-6">
                Brak rozmów. Otwórz kartę klienta i rozpocznij rozmowę z Mentorem AI.
              </p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 divide-y sm:divide-y-0">
                {recentMentorConvs.map((conv, idx) => {
                  const ts = conv.lastMessageAt ?? conv.createdAt;
                  const isRightCol = idx % 2 === 1;
                  const convHref = `/mentor?convId=${conv.id}`;
                  return (
                    <Link
                      key={conv.id}
                      href={convHref}
                      className={cn(
                        "flex items-center gap-3 px-5 py-3.5 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors",
                        // vertical divider between left/right columns
                        isRightCol && "sm:border-l sm:border-border"
                      )}
                    >
                      <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                        <Brain className="w-3.5 h-3.5 text-primary" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium truncate leading-none">{conv.title}</p>
                        <p className="text-xs text-muted-foreground mt-0.5 truncate">
                          {conv.client?.name ?? "Ogólne"}
                        </p>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                          {relativeTime(ts)}
                        </span>
                        <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/50" />
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* ── Ostatnie notatki ──────────────────────────────────── */}
        <div className="rounded-2xl border overflow-hidden">
          {/* Subtle orange-tinted header */}
          <div className="bg-gradient-to-r from-orange-100 to-orange-50/60 dark:from-amber-900/30 dark:to-amber-950/10 border-b px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-orange-100 dark:bg-amber-900/20 flex items-center justify-center">
                  <BookMarked className="w-4 h-4 text-orange-600 dark:text-amber-400" />
                </div>
                <h2 className="text-sm font-semibold text-foreground">Ostatnie notatki</h2>
              </div>
              <Link
                href="/notatnik"
                className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
              >
                Wszystkie notatki <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
          </div>
          {/* Body */}
          <div className="bg-white dark:bg-card">
            {recentNotes.length === 0 ? (
              <p className="text-sm text-muted-foreground px-6 py-6">
                Brak notatek. Otwórz Notatnik i utwórz pierwszą.
              </p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-border">
                {recentNotes.map((note) => (
                  <Link
                    key={note.id}
                    href="/notatnik"
                    className="flex flex-col gap-1.5 px-5 py-4 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors"
                  >
                    <div className="flex items-center gap-1.5">
                      {note.isPinned && (
                        <Pin className="w-3 h-3 text-amber-500 fill-amber-400 shrink-0" />
                      )}
                      <p className="text-sm font-medium truncate">{note.title}</p>
                    </div>
                    {note.plainText && (
                      <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                        {note.plainText.slice(0, 80)}
                      </p>
                    )}
                    <p className="text-[10px] text-muted-foreground/50 mt-auto pt-1">
                      {new Date(note.updatedAt).toLocaleDateString("pl-PL", {
                        day: "numeric",
                        month: "short",
                      })}
                    </p>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
