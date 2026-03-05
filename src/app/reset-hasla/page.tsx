"use client";
import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Brain, Loader2, CheckCircle2, AlertCircle } from "lucide-react";

export default function ResetHaslaPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    await fetch("/api/reset-hasla", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    setLoading(false);
    setSent(true);
  };

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
            <h2 className="text-xl font-semibold">Reset hasła</h2>
            <p className="text-sm text-muted-foreground mt-0.5">
              Podaj adres email przypisany do konta.
            </p>
          </div>

          {sent ? (
            <div className="space-y-4">
              <div className="flex items-start gap-2.5 p-3.5 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400 rounded-xl text-sm">
                <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                <span>
                  Jeśli konto istnieje, wysłaliśmy instrukcje resetu.
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                Sprawdź skrzynkę odbiorczą. Link do resetu wygasa po 60 minutach.
              </p>
              <Link href="/logowanie">
                <Button variant="outline" className="w-full">Wróć do logowania</Button>
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="twoj@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? <><Loader2 className="w-4 h-4 animate-spin" />Wysyłanie...</> : "Wyślij link resetujący"}
              </Button>
              <p className="text-xs text-muted-foreground text-center">
                <Link href="/logowanie" className="text-primary hover:underline">
                  Wróć do logowania
                </Link>
              </p>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
