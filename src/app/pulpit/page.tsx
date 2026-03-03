import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Calendar, Clock, Users, ArrowRight, ChevronRight, BookMarked, Pin } from "lucide-react";
import Link from "next/link";
import { startOfMonth, endOfMonth } from "date-fns";
import { cn, formatDate, formatDateTime } from "@/lib/utils";

const STATUS_COLORS: Record<string, string> = {
  "Zaplanowana": "bg-blue-50 text-blue-700 dark:bg-blue-950/30 dark:text-blue-300",
  "Odbyta":      "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300",
  "Odwołana":    "bg-red-50 text-red-700 dark:bg-red-950/30 dark:text-red-300",
};

const STAGE_COLORS: Record<string, string> = {
  "Onboarding": "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/30 dark:text-blue-300 dark:border-blue-800",
  "W trakcie":  "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-300 dark:border-emerald-800",
  "Zakończony": "bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700",
  "Zawieszony": "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-300 dark:border-amber-800",
};

export default async function PulpitPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/logowanie");

  const userId = (session.user as { id: string }).id;
  const now = new Date();
  const monthStart = startOfMonth(now);
  const monthEnd = endOfMonth(now);

  const [sessionsThisMonth, recentSessions, recentClients, recentNotes] = await Promise.all([
    prisma.session.findMany({
      where: { client: { userId }, scheduledAt: { gte: monthStart, lte: monthEnd }, status: "Odbyta" },
      select: { durationMin: true },
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
  ]);

  const totalMinutes = sessionsThisMonth.reduce((acc, s) => acc + (s.durationMin ?? 0), 0);
  const totalHours = Math.floor(totalMinutes / 60);
  const remainingMinutes = totalMinutes % 60;

  return (
    <AppLayout>
      <div className="p-8 max-w-5xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-semibold">Pulpit</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Witaj, {session.user.name ?? session.user.email}! Oto Twój przegląd coachingowy.
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          <div className="bg-white dark:bg-card rounded-2xl border shadow-sm p-6 flex items-center gap-4">
            <div className="w-11 h-11 rounded-xl bg-blue-50 dark:bg-blue-950/30 flex items-center justify-center shrink-0">
              <Calendar className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-3xl font-bold leading-none">{sessionsThisMonth.length}</p>
              <p className="text-sm text-muted-foreground mt-1">Sesji w tym miesiącu</p>
            </div>
          </div>

          <div className="bg-white dark:bg-card rounded-2xl border shadow-sm p-6 flex items-center gap-4">
            <div className="w-11 h-11 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 flex items-center justify-center shrink-0">
              <Clock className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <p className="text-3xl font-bold leading-none">
                {totalHours > 0 ? `${totalHours}h` : ""}{remainingMinutes > 0 ? ` ${remainingMinutes}m` : totalMinutes === 0 ? "0h" : ""}
              </p>
              <p className="text-sm text-muted-foreground mt-1">Łączny czas sesji</p>
            </div>
          </div>

          <div className="bg-white dark:bg-card rounded-2xl border shadow-sm p-6 flex items-center gap-4">
            <div className="w-11 h-11 rounded-xl bg-violet-50 dark:bg-violet-950/30 flex items-center justify-center shrink-0">
              <Users className="w-5 h-5 text-violet-600 dark:text-violet-400" />
            </div>
            <div>
              <p className="text-3xl font-bold leading-none">{recentClients.length}</p>
              <p className="text-sm text-muted-foreground mt-1">Aktywni klienci</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* Recent sessions */}
          <div className="bg-white dark:bg-card rounded-2xl border">
            <div className="flex items-center justify-between px-5 py-4 border-b">
              <h2 className="text-sm font-semibold">Ostatnie sesje</h2>
              <Link href="/klienci" className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors">
                Zobacz wszystkie <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
            <div className="divide-y divide-border">
              {recentSessions.length === 0 ? (
                <p className="text-sm text-muted-foreground px-5 py-6">Brak sesji. Dodaj pierwszego klienta.</p>
              ) : (
                recentSessions.map((s) => (
                  <Link
                    key={s.id}
                    href={`/klienci/${s.client.id}/sesje/${s.id}`}
                    className="flex items-center justify-between px-5 py-3.5 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{s.client.name}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{formatDateTime(s.scheduledAt)}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0 ml-3">
                      <span className={cn("text-xs font-medium px-2 py-0.5 rounded-full", STATUS_COLORS[s.status] ?? "bg-slate-100 text-slate-600")}>
                        {s.status}
                      </span>
                      <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/50" />
                    </div>
                  </Link>
                ))
              )}
            </div>
          </div>

          {/* Recent clients */}
          <div className="bg-white dark:bg-card rounded-2xl border">
            <div className="flex items-center justify-between px-5 py-4 border-b">
              <h2 className="text-sm font-semibold">Ostatni klienci</h2>
              <Link href="/klienci" className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors">
                Zobacz wszystkich <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
            <div className="divide-y divide-border">
              {recentClients.length === 0 ? (
                <div className="px-5 py-6">
                  <p className="text-sm text-muted-foreground mb-3">Brak klientów.</p>
                  <Button asChild size="sm">
                    <Link href="/klienci">Dodaj klienta</Link>
                  </Button>
                </div>
              ) : (
                recentClients.map((c) => {
                  const stageColor = STAGE_COLORS[c.stage] ?? "bg-slate-100 text-slate-600 border-slate-200";
                  return (
                    <Link
                      key={c.id}
                      href={`/klienci/${c.id}`}
                      className="flex items-center gap-3 px-5 py-3.5 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-950/30 flex items-center justify-center text-blue-700 dark:text-blue-300 text-sm font-semibold shrink-0">
                        {c.name.charAt(0)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium truncate">{c.name}</p>
                        <p className="text-xs text-muted-foreground truncate">{c.role ?? c.company ?? "—"}</p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className={cn("text-xs font-medium px-2 py-0.5 rounded-full border", stageColor)}>
                          {c.stage}
                        </span>
                        <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/50" />
                      </div>
                    </Link>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Recent notes */}
        <div className="bg-white dark:bg-card rounded-2xl border mt-5">
          <div className="flex items-center justify-between px-5 py-4 border-b">
            <div className="flex items-center gap-2">
              <BookMarked className="w-4 h-4 text-muted-foreground" />
              <h2 className="text-sm font-semibold">Ostatnie notatki</h2>
            </div>
            <Link href="/notatnik" className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors">
              Wszystkie notatki <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="divide-y divide-border">
            {recentNotes.length === 0 ? (
              <p className="text-sm text-muted-foreground px-5 py-6">Brak notatek. Otwórz Notatnik i utwórz pierwszą.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-border">
                {recentNotes.map((note) => (
                  <Link
                    key={note.id}
                    href="/notatnik"
                    className="flex flex-col gap-1.5 px-5 py-4 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors"
                  >
                    <div className="flex items-center gap-1.5">
                      {note.isPinned && <Pin className="w-3 h-3 text-amber-500 fill-amber-400 shrink-0" />}
                      <p className="text-sm font-medium truncate">{note.title}</p>
                    </div>
                    {note.plainText && (
                      <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                        {note.plainText.slice(0, 80)}
                      </p>
                    )}
                    <p className="text-[10px] text-muted-foreground/50 mt-auto pt-1">
                      {new Date(note.updatedAt).toLocaleDateString("pl-PL", { day: "numeric", month: "short" })}
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
