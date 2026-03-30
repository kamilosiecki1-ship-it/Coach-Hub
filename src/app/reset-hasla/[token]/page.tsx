"use client";
import { Suspense, useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Brain, Loader2, CheckCircle2, AlertCircle, Eye, EyeOff } from "lucide-react";

function ResetForm() {
  const router = useRouter();
  const params = useParams<{ token: string }>();
  const token = params.token ?? "";

  const [tokenValid, setTokenValid] = useState<boolean | null>(null);
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    fetch(`/api/reset-hasla/${encodeURIComponent(token)}`)
      .then((r) => r.json())
      .then((d) => setTokenValid(d.valid ?? false))
      .catch(() => setTokenValid(false));
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const res = await fetch(`/api/reset-hasla/${token}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password, passwordConfirm }),
    });
    setLoading(false);
    if (res.ok) {
      setDone(true);
      setTimeout(() => router.push("/logowanie"), 2500);
    } else {
      const data = await res.json();
      setError(data.error ?? "Wystąpił błąd. Spróbuj ponownie.");
    }
  };

  if (tokenValid === null) {
    return <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>;
  }

  if (!tokenValid) {
    return (
      <div className="space-y-4">
        <div className="flex items-start gap-2.5 p-3.5 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 rounded-xl text-sm">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>Link wygasł lub jest nieprawidłowy. Zażądaj nowego linku resetującego.</span>
        </div>
        <Link href="/reset-hasla">
          <Button variant="outline" className="w-full">Zażądaj nowego linku</Button>
        </Link>
      </div>
    );
  }

  if (done) {
    return (
      <div className="flex items-start gap-2.5 p-3.5 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400 rounded-xl text-sm">
        <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
        <span>Hasło zostało zmienione. Przekierowujemy do logowania…</span>
      </div>
    );
  }

  return (
    <>
      {error && (
        <div className="flex items-start gap-2.5 p-3.5 mb-5 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 rounded-xl text-sm">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="password">Nowe hasło</Label>
          <div className="relative">
            <Input
              id="password"
              type={showPwd ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••••"
              required
              className="pr-9"
            />
            <button
              type="button"
              onClick={() => setShowPwd(!showPwd)}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          <p className="text-xs text-muted-foreground">
            Minimum 8 znaków, w tym co najmniej jedna cyfra lub znak specjalny.
          </p>
        </div>
        <div className="space-y-2">
          <Label htmlFor="passwordConfirm">Powtórz hasło</Label>
          <Input
            id="passwordConfirm"
            type="password"
            value={passwordConfirm}
            onChange={(e) => setPasswordConfirm(e.target.value)}
            placeholder="••••••••••"
            required
          />
        </div>
        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? <><Loader2 className="w-4 h-4 animate-spin" />Zapisywanie...</> : "Ustaw nowe hasło"}
        </Button>
      </form>
    </>
  );
}

export default function ResetHaslaTokenPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50/30 to-slate-100 dark:from-slate-950 dark:via-blue-950/20 dark:to-slate-900 p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-primary rounded-2xl mb-4 shadow-lg">
            <Brain className="w-9 h-9 text-white" />
          </div>
          <h1 className="text-2xl font-semibold text-foreground">SessionLab</h1>
          <p className="text-muted-foreground text-sm mt-1">AI Superwizor Coachingu</p>
        </div>
        <div className="bg-white dark:bg-card rounded-2xl border border-slate-200 dark:border-slate-800 shadow-lg p-8">
          <div className="mb-6">
            <h2 className="text-xl font-semibold">Ustaw nowe hasło</h2>
            <p className="text-sm text-muted-foreground mt-0.5">Wprowadź nowe hasło dla swojego konta.</p>
          </div>
          <Suspense fallback={<div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>}>
            <ResetForm />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
