"use client";
import { Suspense, useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Link from "next/link";
import { Brain, Loader2, AlertCircle, CheckCircle2 } from "lucide-react";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const callbackUrl = searchParams.get("callbackUrl") || "/pulpit";
  const urlError = searchParams.get("error");
  const registered = searchParams.get("registered") === "1";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const result = await signIn("credentials", { email, password, redirect: false });
    setLoading(false);
    if (result?.error) {
      if (result.error === "ACCOUNT_BLOCKED") {
        setError("Twoje konto jest zablokowane. Skontaktuj się z administratorem.");
      } else {
        setError("Nieprawidłowy email lub hasło. Sprawdź dane logowania.");
      }
    } else {
      router.push(callbackUrl);
      router.refresh();
    }
  };

  return (
    <div className="bg-white dark:bg-card rounded-2xl border border-slate-200 dark:border-slate-800 shadow-lg p-8">
      <div className="mb-6">
        <h2 className="text-xl font-semibold">Logowanie</h2>
        <p className="text-sm text-muted-foreground mt-0.5">Wpisz swoje dane, aby kontynuować.</p>
      </div>

      {registered && (
        <div className="flex items-start gap-2.5 p-3.5 mb-5 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400 rounded-xl text-sm">
          <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
          <span>Konto zostało utworzone. Możesz się teraz zalogować.</span>
        </div>
      )}

      {(error || urlError) && (
        <div className="flex items-start gap-2.5 p-3.5 mb-5 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 rounded-xl text-sm">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{error || "Błąd uwierzytelnienia. Spróbuj ponownie."}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            placeholder="coach@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="password">Hasło</Label>
          <Input
            id="password"
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="current-password"
          />
        </div>
        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? (
            <><Loader2 className="w-4 h-4 animate-spin" />Logowanie...</>
          ) : (
            "Zaloguj się"
          )}
        </Button>
        <div className="text-center mt-3">
          <Link href="/reset-hasla" className="text-xs text-muted-foreground hover:text-foreground transition-colors">
            Zapomniałem hasła
          </Link>
        </div>
      </form>

    </div>
  );
}

export default function LoginPage() {
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
          <LoginForm />
        </Suspense>
      </div>
    </div>
  );
}
