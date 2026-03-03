"use client";
import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { AppLayout } from "@/components/layout/AppLayout";
import { MarkdownEditor } from "@/components/sessions/MarkdownEditor";
import { SessionOffboardingModal } from "@/components/sessions/SessionOffboardingModal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  ArrowLeft, Loader2, Clock, Calendar, Brain, Save, ClipboardList, Trash2, CheckCircle2,
} from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import Link from "next/link";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { cn, formatDateTime } from "@/lib/utils";
import { useToast } from "@/components/ui/use-toast";

interface Session {
  id: string;
  clientId: string;
  scheduledAt: string;
  durationMin?: number | null;
  status: string;
  notesMd: string;
  client: {
    id: string;
    name: string;
    role?: string | null;
    company?: string | null;
  };
}

interface Offboarding {
  id: string;
  generatedNoteMd: string;
}

export default function SesjaPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const clientId = params.id as string;
  const sessionId = params.sessionId as string;

  const [session, setSession] = useState<Session | null>(null);
  const [offboarding, setOffboarding] = useState<Offboarding | null>(null);
  const [loading, setLoading] = useState(true);

  const [scheduledAt, setScheduledAt] = useState("");
  const [durationMin, setDurationMin] = useState("");
  const [metaSaving, setMetaSaving] = useState(false);

  const [offboardingOpen, setOffboardingOpen] = useState(false);

  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const fetchOffboarding = useCallback(async () => {
    const res = await fetch(`/api/sesje/${sessionId}/offboarding`);
    if (res.ok) {
      const data = await res.json();
      setOffboarding(data);
    }
  }, [sessionId]);

  const fetchSession = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/sesje/${sessionId}`);
    if (!res.ok) { router.push(`/klienci/${clientId}`); return; }
    const data: Session = await res.json();
    setSession(data);
    setScheduledAt(new Date(data.scheduledAt).toISOString().slice(0, 16));
    setDurationMin(data.durationMin?.toString() ?? "");
    setLoading(false);
  }, [sessionId, clientId, router]);

  useEffect(() => {
    fetchSession();
    fetchOffboarding();
  }, [fetchSession, fetchOffboarding]);

  const saveMetadata = async () => {
    setMetaSaving(true);
    const res = await fetch(`/api/sesje/${sessionId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ scheduledAt, durationMin: durationMin || null }),
    });
    setMetaSaving(false);
    if (res.ok) {
      toast({ title: "Metadata zapisana" });
      fetchSession();
    } else {
      toast({ title: "Błąd zapisu", variant: "destructive" });
    }
  };

  const handleEndSession = async () => {
    const res = await fetch(`/api/sesje/${sessionId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "Odbyta", scheduledAt, durationMin: durationMin || null }),
    });
    if (res.ok) {
      setSession((prev) => prev ? { ...prev, status: "Odbyta" } : prev);
      setOffboardingOpen(true);
    } else {
      toast({ title: "Błąd zapisu", variant: "destructive" });
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    const res = await fetch(`/api/sesje/${sessionId}`, { method: "DELETE" });
    setDeleting(false);
    if (res.ok) {
      toast({ title: "Sesja została usunięta" });
      router.push(`/klienci/${clientId}`);
    } else {
      toast({ title: "Błąd podczas usuwania sesji", variant: "destructive" });
    }
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="flex justify-center items-center min-h-96">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      </AppLayout>
    );
  }

  if (!session) return null;


  return (
    <AppLayout>
      <div className="flex flex-col h-screen">
        {/* Top bar — premium gradient */}
        <div className="relative overflow-hidden shrink-0 header-gradient">
          <div className="absolute -top-4 -right-4 w-36 h-36 rounded-full bg-white/20 blur-2xl pointer-events-none" />
          <div className="absolute bottom-0 -left-3 w-28 h-28 rounded-full bg-blue-300/20 blur-2xl pointer-events-none" />
          <div className="relative z-10 px-6 py-4">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3 min-w-0">
                <Link
                  href={`/klienci/${clientId}`}
                  className="flex items-center gap-1.5 text-white/80 hover:text-white transition-colors shrink-0 text-sm group"
                >
                  <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
                  <span className="font-medium">{session.client.name}</span>
                </Link>
                <div className="w-px h-4 bg-white/30 shrink-0" />
                <div className="flex items-center gap-2 text-sm text-white/80 min-w-0">
                  <Calendar className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">{formatDateTime(session.scheduledAt)}</span>
                  {session.durationMin && (
                    <>
                      <Clock className="w-3.5 h-3.5 ml-1 shrink-0" />
                      <span>{session.durationMin} min</span>
                    </>
                  )}
                </div>
                <span className={cn(
                  "text-xs font-medium px-2.5 py-0.5 rounded-full border shrink-0",
                  session.status === "Odbyta"
                    ? "bg-emerald-400/20 text-emerald-200 border-emerald-300/30"
                    : session.status === "Zaplanowana"
                    ? "bg-white/20 text-white/90 border-white/20"
                    : "bg-red-400/20 text-red-200 border-red-300/30"
                )}>
                  {session.status}
                </span>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {session.status !== "Odbyta" ? (
                  <button
                    onClick={handleEndSession}
                    className="flex items-center gap-1.5 h-8 px-3 text-xs font-semibold bg-white text-blue-700 hover:bg-blue-50 rounded-xl shadow-sm transition-colors"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Zakończ sesję
                  </button>
                ) : (
                  <button
                    onClick={() => setOffboardingOpen(true)}
                    className="flex items-center gap-1.5 h-8 px-3 text-xs font-medium bg-white/20 border border-white/20 text-white/90 hover:bg-white/30 rounded-xl transition-colors"
                  >
                    <ClipboardList className="w-3.5 h-3.5" />
                    {offboarding ? "Edytuj podsumowanie" : "Uzupełnij podsumowanie"}
                  </button>
                )}
                <Link
                  href={`/klienci/${clientId}`}
                  className="flex items-center gap-1.5 h-8 px-3 text-xs font-medium bg-white/15 border border-white/20 text-white/80 hover:bg-white/25 hover:text-white rounded-xl transition-colors"
                >
                  <Brain className="w-3.5 h-3.5" />
                  Mentor AI
                </Link>
                <button
                  onClick={() => setDeleteConfirmOpen(true)}
                  className="p-1.5 rounded-lg text-white/50 hover:bg-white/10 hover:text-red-300 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Session metadata bar */}
        <div className="border-b bg-white dark:bg-card px-6 py-3 shrink-0">
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-2">
              <Label className="text-xs text-muted-foreground">Data</Label>
              <Input
                type="datetime-local"
                value={scheduledAt}
                onChange={(e) => setScheduledAt(e.target.value)}
                className="h-7 text-xs w-44"
              />
            </div>
            <div className="flex items-center gap-2">
              <Label className="text-xs text-muted-foreground">Czas (min)</Label>
              <Input
                type="number"
                value={durationMin}
                onChange={(e) => setDurationMin(e.target.value)}
                className="h-7 text-xs w-20"
                min={15}
                step={15}
              />
            </div>
            <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={saveMetadata} disabled={metaSaving}>
              {metaSaving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
              Zapisz
            </Button>
          </div>
        </div>

        {/* Scrollable content area */}
        <div className="flex-1 overflow-y-auto">
          {/* Generated note */}
          <div className="px-6 pt-5 pb-4">
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-xs font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wide">Notatka wygenerowana</p>
                <p className="text-xs text-muted-foreground mt-0.5">Automatycznie stworzona na podstawie formularza podsumowania sesji</p>
              </div>
              <Button
                size="sm"
                variant="ghost"
                className="h-7 text-xs"
                onClick={() => setOffboardingOpen(true)}
              >
                <ClipboardList className="w-3 h-3 mr-1" />
                {offboarding ? "Edytuj" : "Uzupełnij"}
              </Button>
            </div>

            {offboarding?.generatedNoteMd ? (
              <div className="bg-blue-50/60 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/50 rounded-xl px-5 py-4 prose-coach overflow-auto">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {offboarding.generatedNoteMd}
                </ReactMarkdown>
              </div>
            ) : (
              <div className="border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-xl px-5 py-6 text-center text-sm text-muted-foreground">
                Brak podsumowania po sesji.{" "}
                Możesz je uzupełnić, aby automatycznie stworzyć ustrukturyzowaną notatkę.{" "}
                <button
                  className="underline hover:text-foreground transition-colors"
                  onClick={() => setOffboardingOpen(true)}
                >
                  Uzupełnij teraz
                </button>
              </div>
            )}
          </div>

          <Separator />

          {/* Raw notes editor */}
          <div className="px-6 pt-5 pb-6" style={{ minHeight: "420px" }}>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Notatki własne</p>
            <div className="bg-white dark:bg-card border rounded-xl overflow-hidden">
              <MarkdownEditor sessionId={sessionId} initialValue={session.notesMd} />
            </div>
          </div>
        </div>
      </div>

      {/* Delete confirmation dialog */}
      <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Usuń sesję</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Czy na pewno chcesz usunąć sesję z{" "}
            <span className="font-medium text-foreground">{formatDateTime(session.scheduledAt)}</span>?
            Wraz z sesją zostaną usunięte wszystkie notatki i formularz podsumowania.
            Tej operacji nie można cofnąć.
          </p>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDeleteConfirmOpen(false)} disabled={deleting}>
              Anuluj
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
              {deleting ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Trash2 className="w-4 h-4 mr-1" />}
              Usuń sesję
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Offboarding modal */}
      <SessionOffboardingModal
        open={offboardingOpen}
        onOpenChange={setOffboardingOpen}
        sessionId={sessionId}
        defaults={{
          scheduledAt: session.scheduledAt,
          durationMin: session.durationMin,
          clientName: session.client.name,
          sessionNotesMd: session.notesMd,
        }}
        onSaved={fetchOffboarding}
      />
    </AppLayout>
  );
}
