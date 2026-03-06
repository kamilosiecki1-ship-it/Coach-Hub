"use client";
import { useState, useEffect, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Brain, StickyNote, FileText } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface OffboardingFormData {
  date: string;
  hours: string;
  clientLabel: string;
  eventTopic: string;
  sessionGoals: string;
  techniques: string;
  keyInsightsClient: string;
  gains: string;
  homework: string;
  feedback: string;
  coachReflection: string;
  focusAreas: string;
  additionalNotes: string;
}

interface SessionOffboardingModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sessionId: string;
  sessionEnding?: boolean;
  defaults: {
    scheduledAt: string;
    durationMin?: number | null;
    clientName: string;
    sessionPlanMd?: string;
    sessionScratchpadMd?: string;
  };
  onSaved: () => void;
  onSkip?: () => void;
}

const EMPTY_FORM: OffboardingFormData = {
  date: "",
  hours: "",
  clientLabel: "",
  eventTopic: "",
  sessionGoals: "",
  techniques: "",
  keyInsightsClient: "",
  gains: "",
  homework: "",
  feedback: "",
  coachReflection: "",
  focusAreas: "",
  additionalNotes: "",
};

// Fields that AI can fill from a transcript
const AI_FILLABLE_FIELDS: (keyof OffboardingFormData)[] = [
  "eventTopic", "sessionGoals", "techniques",
  "keyInsightsClient", "gains", "homework",
  "feedback", "coachReflection", "focusAreas", "additionalNotes",
];

export function SessionOffboardingModal({
  open,
  onOpenChange,
  sessionId,
  sessionEnding,
  defaults,
  onSaved,
  onSkip,
}: SessionOffboardingModalProps) {
  const { toast } = useToast();
  const [form, setForm] = useState<OffboardingFormData>(EMPTY_FORM);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [processing, setProcessing] = useState(false);

  const initializedRef = useRef<string | null>(null);

  const hasScratchpad = sessionEnding || !!(defaults.sessionScratchpadMd?.trim());
  const hasPlan = !!(defaults.sessionPlanMd?.trim());

  useEffect(() => {
    if (!open) {
      initializedRef.current = null;
      return;
    }
    if (initializedRef.current === sessionId) return;
    initializedRef.current = sessionId;

    setLoading(true);

    const scheduledAt = defaults.scheduledAt;
    const durationMin = defaults.durationMin;
    const clientName = defaults.clientName;

    fetch(`/api/sesje/${sessionId}/offboarding`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data) {
          // Load existing — merge legacy homework fields
          const mergedHomework = [data.homework, data.homeworkDescription].filter(Boolean).join("\n\n");
          setForm({
            date: data.date ? new Date(data.date).toISOString().slice(0, 10) : "",
            hours: data.hours != null ? String(data.hours) : "",
            clientLabel: data.clientLabel ?? "",
            eventTopic: data.eventTopic ?? "",
            sessionGoals: data.sessionGoals ?? "",
            techniques: data.techniques ?? "",
            keyInsightsClient: data.keyInsightsClient ?? "",
            gains: data.gains ?? "",
            homework: mergedHomework || (data.homework ?? ""),
            feedback: data.feedback ?? "",
            coachReflection: data.coachReflection ?? "",
            focusAreas: data.focusAreas ?? "",
            additionalNotes: data.additionalNotes ?? "",
          });
          setTranscript(data.transcript ?? "");
        } else {
          // New offboarding — pre-populate transcript from plan + scratchpad
          const parts: string[] = [];
          if (defaults.sessionPlanMd?.trim()) parts.push(`## Plan sesji\n\n${defaults.sessionPlanMd.trim()}`);
          if (defaults.sessionScratchpadMd?.trim()) parts.push(`## Notatki robocze\n\n${defaults.sessionScratchpadMd.trim()}`);
          setTranscript(parts.join("\n\n---\n\n"));

          const dateDefault = scheduledAt ? new Date(scheduledAt).toISOString().slice(0, 10) : "";
          const hoursDefault = durationMin != null
            ? String(Math.round((durationMin / 60) * 100) / 100)
            : "";
          setForm({ ...EMPTY_FORM, date: dateDefault, hours: hoursDefault, clientLabel: clientName });
        }
      })
      .catch(() => {
        const parts: string[] = [];
        if (defaults.sessionPlanMd?.trim()) parts.push(`## Plan sesji\n\n${defaults.sessionPlanMd.trim()}`);
        if (defaults.sessionScratchpadMd?.trim()) parts.push(`## Notatki robocze\n\n${defaults.sessionScratchpadMd.trim()}`);
        setTranscript(parts.join("\n\n---\n\n"));

        const dateDefault = scheduledAt ? new Date(scheduledAt).toISOString().slice(0, 10) : "";
        const hoursDefault = durationMin != null
          ? String(Math.round((durationMin / 60) * 100) / 100)
          : "";
        setForm({ ...EMPTY_FORM, date: dateDefault, hours: hoursDefault, clientLabel: clientName });
      })
      .finally(() => setLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, sessionId]);

  const set = (field: keyof OffboardingFormData) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => setForm((f) => ({ ...f, [field]: e.target.value }));

  const handleProcessTranscript = async () => {
    if (!transcript.trim()) {
      toast({ title: "Brak treści do przetworzenia", variant: "destructive" });
      return;
    }
    setProcessing(true);
    try {
      const res = await fetch(`/api/sesje/${sessionId}/offboarding/process-transcript`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transcript }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        toast({ title: "Błąd przetwarzania", description: err.detail ?? err.error ?? `HTTP ${res.status}`, variant: "destructive" });
        return;
      }
      const { fields } = await res.json();
      setForm((prev) => {
        const next = { ...prev };
        for (const key of AI_FILLABLE_FIELDS) {
          const val = fields[key];
          if (val != null && String(val).trim() !== "") {
            next[key] = String(val);
          }
        }
        return next;
      });
      toast({ title: "Pola uzupełnione przez AI", description: "Sprawdź i popraw w razie potrzeby." });
    } catch (e) {
      toast({ title: "Błąd połączenia", description: e instanceof Error ? e.message : String(e), variant: "destructive" });
    } finally {
      setProcessing(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/sesje/${sessionId}/offboarding`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date: form.date || null,
          hours: form.hours !== "" ? Number(form.hours) : null,
          clientLabel: form.clientLabel || null,
          eventTopic: form.eventTopic || null,
          sessionGoals: form.sessionGoals || null,
          techniques: form.techniques || null,
          keyInsightsClient: form.keyInsightsClient || null,
          gains: form.gains || null,
          homework: form.homework || null,
          homeworkDescription: null,
          feedback: form.feedback || null,
          coachReflection: form.coachReflection || null,
          focusAreas: form.focusAreas || null,
          additionalNotes: form.additionalNotes || null,
          transcript: transcript || null,
        }),
      });
      if (res.ok) {
        toast({ title: "Podsumowanie zapisane" });
        onSaved();
        onOpenChange(false);
      } else {
        let description = `HTTP ${res.status}`;
        try {
          const errBody = await res.json();
          if (errBody?.detail) description = errBody.detail;
          else if (errBody?.error) description = errBody.error;
        } catch { /* ignore */ }
        toast({ title: "Błąd zapisu", description, variant: "destructive" });
      }
    } catch (e) {
      toast({ title: "Błąd połączenia", description: e instanceof Error ? e.message : String(e), variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const formContent = (
    <div className="space-y-5">
      {/* Podstawowe informacje */}
      <div className="bg-slate-50 dark:bg-slate-800/40 rounded-xl p-4 space-y-3">
        <div className="flex items-center gap-2">
          <div className="w-0.5 h-3.5 rounded-full bg-blue-500 shrink-0" />
          <p className="text-xs font-semibold text-blue-700 dark:text-blue-400 uppercase tracking-widest">
            Podstawowe informacje
          </p>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label className="text-xs">Data</Label>
            <Input type="date" value={form.date} onChange={set("date")} className="h-8 text-sm" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Liczba godzin</Label>
            <Input type="number" value={form.hours} onChange={set("hours")} className="h-8 text-sm" min={0} step={0.25} placeholder="np. 1.5" />
          </div>
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Klient (imię / inicjały)</Label>
          <Input value={form.clientLabel} onChange={set("clientLabel")} className="h-8 text-sm" placeholder="np. M.N." />
        </div>
      </div>

      {/* Przebieg sesji */}
      <div className="bg-slate-50 dark:bg-slate-800/40 rounded-xl p-4 space-y-3">
        <div className="flex items-center gap-2">
          <div className="w-0.5 h-3.5 rounded-full bg-blue-500 shrink-0" />
          <p className="text-xs font-semibold text-blue-700 dark:text-blue-400 uppercase tracking-widest">
            Przebieg sesji
          </p>
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Zdarzenie / temat sesji</Label>
          <Textarea value={form.eventTopic} onChange={set("eventTopic")} className="text-sm min-h-[60px]" placeholder="Główny temat lub zdarzenie omawiane na sesji…" />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Zwymiarowane cele na konkretną sesję</Label>
          <Textarea value={form.sessionGoals} onChange={set("sessionGoals")} className="text-sm min-h-[60px]" placeholder="Cele sesji z mierzalnymi wskaźnikami…" />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Zastosowane ćwiczenia i techniki</Label>
          <Textarea value={form.techniques} onChange={set("techniques")} className="text-sm min-h-[60px]" placeholder="np. koło życia, linia czasu, pytania skalujące…" />
        </div>
      </div>

      {/* Efekty i wnioski */}
      <div className="bg-slate-50 dark:bg-slate-800/40 rounded-xl p-4 space-y-3">
        <div className="flex items-center gap-2">
          <div className="w-0.5 h-3.5 rounded-full bg-emerald-500 shrink-0" />
          <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 uppercase tracking-widest">
            Efekty i wnioski
          </p>
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Kluczowe wnioski i odkrycia (zwerbalizowane przez klienta)</Label>
          <Textarea value={form.keyInsightsClient} onChange={set("keyInsightsClient")} className="text-sm min-h-[60px]" placeholder="Co klient powiedział lub odkrył…" />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Uzyskane umiejętności / konkretne efekty</Label>
          <Textarea value={form.gains} onChange={set("gains")} className="text-sm min-h-[60px]" placeholder="Co klient zyska, czego się nauczył…" />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Zadania domowe</Label>
          <Textarea value={form.homework} onChange={set("homework")} className="text-sm min-h-[70px]" placeholder="Lista i opis zadań między sesjami…" />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Uwagi / udzielony feedback</Label>
          <Textarea value={form.feedback} onChange={set("feedback")} className="text-sm min-h-[60px]" placeholder="Feedback wzajemny lub uwagi coacha…" />
        </div>
      </div>

      {/* Refleksje coacha */}
      <div className="bg-slate-50 dark:bg-slate-800/40 rounded-xl p-4 space-y-3">
        <div className="flex items-center gap-2">
          <div className="w-0.5 h-3.5 rounded-full bg-violet-500 shrink-0" />
          <p className="text-xs font-semibold text-violet-700 dark:text-violet-400 uppercase tracking-widest">
            Refleksje coacha
          </p>
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Refleksje coacha: learning i zastosowanie w praktyce</Label>
          <Textarea value={form.coachReflection} onChange={set("coachReflection")} className="text-sm min-h-[70px]" placeholder="Co jako coach zauważam, czego się uczę, co zastosuję…" />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Obszary rozwoju / tematy do dalszej superwizji</Label>
          <Textarea value={form.focusAreas} onChange={set("focusAreas")} className="text-sm min-h-[60px]" placeholder="Na co chcę zwrócić uwagę w kolejnej sesji lub superwizji…" />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Dodatkowe przemyślenia / notatki</Label>
          <Textarea value={form.additionalNotes} onChange={set("additionalNotes")} className="text-sm min-h-[80px]" placeholder="Wolna przestrzeń na dowolne przemyślenia…" />
        </div>
      </div>

      {/* Transkrypcja — na dole */}
      <div className="bg-slate-50 dark:bg-slate-800/40 rounded-xl p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-0.5 h-3.5 rounded-full bg-slate-400 shrink-0" />
            <p className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-widest">
              Transkrypcja / notatki źródłowe
            </p>
          </div>
          <Button size="sm" onClick={handleProcessTranscript} disabled={processing || !transcript.trim()} className="h-7 text-xs">
            {processing
              ? <><Loader2 className="w-3 h-3 mr-1 animate-spin" />Przetwarzanie…</>
              : <><Brain className="w-3 h-3 mr-1" />Uzupełnij przez AI</>
            }
          </Button>
        </div>
        <Textarea
          value={transcript}
          onChange={(e) => setTranscript(e.target.value)}
          className="text-sm min-h-[90px] font-mono bg-white dark:bg-card"
          placeholder="Transkrypcja, notatki z sesji lub plan — AI uzupełni pola formularza."
        />
        <p className="text-xs text-muted-foreground">
          AI przeanalizuje treść i wypełni odpowiednie pola. Możesz edytować wyniki ręcznie.
        </p>
      </div>
    </div>
  );

  const footerButtons = (
    <>
      {onSkip && (
        <Button variant="ghost" onClick={() => { onSkip(); onOpenChange(false); }} disabled={saving}>
          Pomiń na teraz
        </Button>
      )}
      <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
        Anuluj
      </Button>
      <Button onClick={handleSave} disabled={saving || loading}>
        {saving ? <><Loader2 className="w-4 h-4 mr-1 animate-spin" />Zapisywanie…</> : "Zapisz podsumowanie"}
      </Button>
    </>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {hasScratchpad ? (
        /* ── Wide layout with scratchpad (and optionally plan) reference ── */
        <DialogContent className={hasPlan ? "max-w-[1400px] p-0 gap-0" : "max-w-[1050px] p-0 gap-0"}>
          <div className="flex flex-col" style={{ maxHeight: "90vh" }}>
            <div className="flex items-center px-6 py-4 border-b shrink-0">
              <DialogTitle>Podsumowanie po sesji</DialogTitle>
            </div>
            <div className="flex flex-1 overflow-hidden min-h-0">
              {/* Optional leftmost: Plan sesji reference */}
              {hasPlan && (
                <div className="w-[380px] shrink-0 border-r flex flex-col bg-white dark:bg-card overflow-hidden">
                  <div className="header-gradient px-4 py-3 shrink-0 flex items-center gap-2">
                    <FileText className="w-4 h-4 text-white/80 shrink-0" />
                    <div>
                      <p className="text-sm font-semibold text-white leading-none">Plan sesji</p>
                      <p className="text-xs text-white/70 mt-0.5">przygotowanie — tylko odczyt</p>
                    </div>
                  </div>
                  <div className="flex-1 overflow-y-auto p-4">
                    <div className="prose-coach text-sm">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>{defaults.sessionPlanMd!}</ReactMarkdown>
                    </div>
                  </div>
                </div>
              )}
              {/* Scratchpad reference */}
              <div className="w-[380px] shrink-0 border-r flex flex-col bg-white dark:bg-card overflow-hidden">
                <div className="header-gradient-scratchpad px-4 py-3 shrink-0 flex items-center gap-2">
                  <StickyNote className="w-4 h-4 text-white/80 shrink-0" />
                  <div>
                    <p className="text-sm font-semibold text-white leading-none">Brudnopis</p>
                    <p className="text-xs text-white/70 mt-0.5">notatki z sesji — tylko odczyt</p>
                  </div>
                </div>
                <div className="flex-1 overflow-y-auto p-4">
                  {defaults.sessionScratchpadMd?.trim() ? (
                    <div className="prose-coach text-sm">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>{defaults.sessionScratchpadMd}</ReactMarkdown>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground italic">Brudnopis jest pusty.</p>
                  )}
                </div>
              </div>
              {/* Right: Form */}
              <div className="flex-1 overflow-y-auto px-6 py-5 min-w-0">
                {loading ? (
                  <div className="flex justify-center py-10">
                    <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                  </div>
                ) : formContent}
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 px-6 py-4 border-t shrink-0">
              {footerButtons}
            </div>
          </div>
        </DialogContent>
      ) : (
        /* ── Standard single-column layout ── */
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Podsumowanie po sesji</DialogTitle>
          </DialogHeader>

          {loading ? (
            <div className="flex justify-center py-10">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="space-y-5 py-2">
              {formContent}
            </div>
          )}

          <DialogFooter className="flex-wrap gap-2 pt-2">
            {footerButtons}
          </DialogFooter>
        </DialogContent>
      )}
    </Dialog>
  );
}
