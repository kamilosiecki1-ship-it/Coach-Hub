"use client";
import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Loader2, RefreshCw, Zap } from "lucide-react";
import { cn } from "@/lib/utils";

interface UsageRow {
  userId: string;
  email: string;
  name: string | null;
  role: string;
  tokens7Days: number;
  tokens30Days: number;
  tokensTotal: number;
  inputTokensTotal: number;
  outputTokensTotal: number;
}

function fmt(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return String(n);
}

export default function AdminAiUsagePage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [rows, setRows] = useState<UsageRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === "unauthenticated") router.replace("/logowanie");
    if (status === "authenticated" && session.user.role !== "ADMIN") router.replace("/pulpit");
  }, [status, session, router]);

  const fetchUsage = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/ai-usage");
      if (res.ok) setRows(await res.json());
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (status === "authenticated") fetchUsage();
  }, [status]);

  const totalTokens = rows.reduce((s, r) => s + r.tokensTotal, 0);
  const total30 = rows.reduce((s, r) => s + r.tokens30Days, 0);

  if (status === "loading") {
    return <AppLayout><div className="flex items-center justify-center py-32"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div></AppLayout>;
  }
  if (status !== "authenticated" || session.user.role !== "ADMIN") return null;

  return (
    <AppLayout>
      <div className="p-8 max-w-4xl mx-auto">

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/30 flex items-center justify-center">
              <Zap className="w-5 h-5 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <h1 className="text-2xl font-semibold">Użycie AI</h1>
              <p className="text-sm text-muted-foreground mt-0.5">Zużycie tokenów OpenAI per użytkownik</p>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={fetchUsage} disabled={loading}>
            <RefreshCw className={cn("w-4 h-4 mr-1.5", loading && "animate-spin")} />
            Odśwież
          </Button>
        </div>

        {/* KPI cards */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          {[
            { label: "Tokeny łącznie", value: fmt(totalTokens), color: "bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-300" },
            { label: "Tokeny (30 dni)", value: fmt(total30), color: "bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-300" },
            { label: "Aktywni użytkownicy", value: rows.length, color: "bg-slate-50 dark:bg-slate-800/50 text-slate-700 dark:text-slate-300" },
          ].map((k) => (
            <div key={k.label} className={cn("rounded-2xl border px-5 py-4", k.color)}>
              <p className="text-2xl font-bold">{k.value}</p>
              <p className="text-xs mt-0.5 opacity-70">{k.label}</p>
            </div>
          ))}
        </div>

        {/* Table */}
        <div className="bg-white dark:bg-card rounded-2xl border overflow-hidden">
          <div className="grid grid-cols-[1fr_auto_auto_auto_auto] gap-4 px-5 py-3 border-b bg-slate-50 dark:bg-slate-800/30 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            <span>Użytkownik</span>
            <span className="text-right">7 dni</span>
            <span className="text-right">30 dni</span>
            <span className="text-right">Łącznie</span>
            <span className="text-right">Input / Output</span>
          </div>

          {loading ? (
            <div className="flex justify-center py-16">
              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
            </div>
          ) : rows.length === 0 ? (
            <div className="text-center py-16">
              <Zap className="w-10 h-10 text-muted-foreground/30 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">Brak danych o użyciu AI</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {rows.map((row) => (
                <div
                  key={row.userId}
                  className="grid grid-cols-[1fr_auto_auto_auto_auto] gap-4 items-center px-5 py-3.5 hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-amber-50 dark:bg-amber-950/30 flex items-center justify-center text-amber-700 dark:text-amber-400 font-semibold text-sm shrink-0">
                      {(row.name ?? row.email).charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{row.name ?? "—"}</p>
                      <p className="text-xs text-muted-foreground truncate">{row.email}</p>
                    </div>
                  </div>
                  <p className="text-sm font-mono text-right">{fmt(row.tokens7Days)}</p>
                  <p className="text-sm font-mono text-right">{fmt(row.tokens30Days)}</p>
                  <p className="text-sm font-mono font-semibold text-right">{fmt(row.tokensTotal)}</p>
                  <p className="text-xs font-mono text-muted-foreground text-right whitespace-nowrap">
                    {fmt(row.inputTokensTotal)} / {fmt(row.outputTokensTotal)}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
