"use client";
import { Suspense, useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Brain, Loader2, AlertCircle, CheckCircle2, Eye, EyeOff } from "lucide-react";

function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";

  const [inviteState, setInviteState] = useState<
    | { status: "loading" }
    | { status: "invalid"; error: string }
    | { status: "valid"; lockedEmail: string | null; role: string }
  >({ status: "loading" });

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Validate invite token on mount
  useEffect(() => {
    if (!token) {
      setInviteState({ status: "invalid", error: "Rejestracja wymaga zaproszenia." });
      return;
    }
    fetch(`/api/rejestracja?token=${encodeURIComponent(token)}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.valid) {
          setInviteState({ status: "valid", lockedEmail: data.email ?? null, role: data.role });
          if (data.email) setEmail(data.email);
        } else {
          setInviteState({ status: "invalid", error: data.error ?? "Zaproszenie jest nieprawidłowe lub wygasło." });
        }
      })
      .catch(() => setInviteState({ status: "invalid", error: "Nie udało się zweryfikować zaproszenia." }));
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const res = await fetch("/api/rejestracja", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, name, email, password, passwordConfirm }),
    });
    setLoading(false);
    if (res.ok) {
      router.push("/logowanie?registered=1");
    } else {
      const data = await res.json();
      setError(data.error ?? "Rejestracja nie powiodła się.");
    }
  };

  return (
    <div className="bg-white dark:bg-card rounded-2xl border border-slate-200 dark:border-slate-800 shadow-lg p-8">
      <div className="mb-6">
        <h2 className="text-xl font-semibold">Rejestracja</h2>
        <p className="text-sm text-muted-foreground mt-0.5">Utwórz konto za pomocą zaproszenia.</p>
      </div>

      {inviteState.status === "loading" && (
        <div className="flex justify-center py-8">
          <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
        </div>
      )}

      {inviteState.status === "invalid" && (
        <div className="space-y-4">
          <div className="flex items-start gap-2.5 p-3.5 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 rounded-xl text-sm">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{inviteState.error}</span>
          </div>
          <p className="text-sm text-muted-foreground">
            Potrzebujesz zaproszenia od administratora, aby założyć konto.
          </p>
          <Link href="/logowanie">
            <Button variant="outline" className="w-full">Wróć do logowania</Button>
          </Link>
        </div>
      )}

      {inviteState.status === "valid" && (
        <>
          {error && (
            <div className="flex items-start gap-2.5 p-3.5 mb-5 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 rounded-xl text-sm">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Imię i nazwisko</Label>
              <Input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Jan Kowalski"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={!!inviteState.lockedEmail}
                placeholder="twoj@email.com"
                required
              />
              {inviteState.lockedEmail && (
                <p className="text-xs text-muted-foreground">
                  To zaproszenie jest przypisane do tego adresu email.
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Hasło</Label>
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
                Minimum 6 znaków.
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
              {loading ? <><Loader2 className="w-4 h-4 animate-spin" />Rejestracja...</> : "Zarejestruj się"}
            </Button>
          </form>

          <p className="text-xs text-muted-foreground text-center mt-5">
            Masz już konto?{" "}
            <Link href="/logowanie" className="text-primary hover:underline">
              Zaloguj się
            </Link>
          </p>
        </>
      )}
    </div>
  );
}

export default function Rejestracja() {
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
        <Suspense
          fallback={
            <div className="bg-white dark:bg-card rounded-2xl border border-slate-200 dark:border-slate-800 shadow-lg p-8 flex justify-center">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          }
        >
          <RegisterForm />
        </Suspense>
      </div>
    </div>
  );
}
