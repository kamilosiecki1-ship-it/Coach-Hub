"use client";
import { useTheme } from "next-themes";
import { AppLayout } from "@/components/layout/AppLayout";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Moon, Sun, Brain, CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";

export default function UstawieniaPage() {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [aiStatus, setAiStatus] = useState<"loading" | "ok" | "missing">("loading");

  useEffect(() => {
    setMounted(true);
    fetch("/api/ai/mentor", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId: "check", mode: "coaching", action: "refleksja" }),
    })
      .then(async (res) => {
        if (res.status === 503) {
          setAiStatus("missing");
        } else {
          setAiStatus("ok");
        }
      })
      .catch(() => setAiStatus("ok"));
  }, []);

  const isDark = resolvedTheme === "dark";

  return (
    <AppLayout>
      <div className="p-8 max-w-2xl mx-auto">
        <div className="mb-8">
          <h1 className="text-2xl font-semibold">Ustawienia</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Konfiguracja aplikacji SessionLab.</p>
        </div>

        <div className="space-y-4">
          {/* Theme */}
          <div className="bg-white dark:bg-card rounded-2xl border p-6">
            <div className="flex items-center gap-2 mb-1">
              {mounted && (isDark ? <Moon className="w-4 h-4 text-muted-foreground" /> : <Sun className="w-4 h-4 text-muted-foreground" />)}
              <h2 className="text-sm font-semibold">Wygląd</h2>
            </div>
            <p className="text-xs text-muted-foreground mb-4">Wybierz tryb jasny lub ciemny.</p>
            <div className="flex items-center gap-3">
              <Sun className="w-4 h-4 text-muted-foreground" />
              <Switch
                checked={mounted ? isDark : false}
                onCheckedChange={(checked) => setTheme(checked ? "dark" : "light")}
                disabled={!mounted}
              />
              <Moon className="w-4 h-4 text-muted-foreground" />
              <Label className="text-sm text-muted-foreground">
                {mounted ? (isDark ? "Tryb ciemny" : "Tryb jasny") : "Ładowanie..."}
              </Label>
            </div>
          </div>

          {/* AI status */}
          <div className="bg-white dark:bg-card rounded-2xl border p-6">
            <div className="flex items-center gap-2 mb-1">
              <Brain className="w-4 h-4 text-muted-foreground" />
              <h2 className="text-sm font-semibold">Integracja z AI</h2>
            </div>
            <p className="text-xs text-muted-foreground mb-4">Status połączenia z OpenAI API.</p>

            <div className="space-y-3">
              {aiStatus === "loading" && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Sprawdzanie konfiguracji...
                </div>
              )}
              {aiStatus === "ok" && (
                <div className="flex items-center gap-2.5 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-xl px-3.5 py-2.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <span className="text-sm font-medium text-emerald-700 dark:text-emerald-300">
                    AI jest skonfigurowane i aktywne
                  </span>
                </div>
              )}
              {aiStatus === "missing" && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2.5 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-xl px-3.5 py-2.5">
                    <XCircle className="w-4 h-4 text-red-600 dark:text-red-400 shrink-0" />
                    <span className="text-sm font-medium text-red-700 dark:text-red-300">
                      Integracja z AI nie została skonfigurowana.
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Dodaj zmienną środowiskową{" "}
                    <code className="bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded text-xs font-mono">OPENAI_API_KEY</code>{" "}
                    w pliku <code className="bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded text-xs font-mono">.env</code>.
                  </p>
                </div>
              )}

              <div className="pt-3 border-t space-y-1.5 text-xs text-muted-foreground">
                <p>Model: <code className="bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded font-mono">{process.env.NEXT_PUBLIC_OPENAI_MODEL ?? "gpt-4o"}</code></p>
                <p>Ustaw zmienną <code className="bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded font-mono">OPENAI_MODEL</code> aby zmienić model.</p>
              </div>
            </div>
          </div>

          {/* About */}
          <div className="bg-white dark:bg-card rounded-2xl border p-6">
            <h2 className="text-sm font-semibold mb-3">O aplikacji</h2>
            <div className="text-sm text-muted-foreground space-y-1">
              <p><strong className="text-foreground">SessionLab</strong> – AI Superwizor Coachingu</p>
              <p>Wersja: 1.0.0 MVP</p>
              <p>Narzędzie wspierające refleksję i superwizję coachingową zgodnie ze standardami ICF i EMCC.</p>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
