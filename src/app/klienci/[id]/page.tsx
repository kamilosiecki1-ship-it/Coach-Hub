"use client";
import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useSidebar } from "@/contexts/sidebar-context";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  ArrowLeft, Plus, Edit, Trash2, Loader2, Calendar, Clock,
  Building2, Briefcase, ChevronRight,
  ChevronDown, ChevronUp, Sparkles, Lock,
  FileDown, TriangleAlert,
} from "lucide-react";
import Link from "next/link";
import { cn, formatDate, formatDateTime, STAGE_OPTIONS } from "@/lib/utils";
import { useToast } from "@/components/ui/use-toast";
import { MentorAIPanel } from "@/components/mentor/MentorAIPanel";

interface Session {
  id: string;
  scheduledAt: string;
  durationMin?: number | null;
  status: string;
  summaryMd?: string | null;
}

interface Retrospective {
  id: string;
  createdAt: string;
  reportMd: string;
  truncated: boolean;
}

interface Client {
  id: string;
  name: string;
  company?: string | null;
  role?: string | null;
  stage: string;
  generalNote?: string | null;
  sessions: Session[];
  retrospectives: Retrospective[];
  finalReportMd?: string | null;
  closedAt?: string | null;
}

const STAGE_COLORS: Record<string, string> = {
  "Wstęp":      "bg-orange-50 text-orange-600 border-orange-200 dark:bg-orange-950/30 dark:text-orange-400 dark:border-orange-800",
  "Onboarding": "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/30 dark:text-blue-300 dark:border-blue-800",
  "W trakcie":  "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-300 dark:border-emerald-800",
  "Zakończony": "bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700",
  "Zawieszony": "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-300 dark:border-amber-800",
};

// Colors for the gradient header (dark background)
const STAGE_COLORS_HEADER: Record<string, string> = {
  "Wstęp":      "bg-orange-400/30 border-orange-300/50 text-orange-100",
  "Onboarding": "bg-sky-400/30 border-sky-300/50 text-sky-100",
  "W trakcie":  "bg-emerald-400/30 border-emerald-300/50 text-emerald-100",
  "Zakończony": "bg-slate-400/30 border-slate-300/50 text-slate-100",
  "Zawieszony": "bg-amber-400/30 border-amber-300/50 text-amber-100",
};

const STATUS_COLORS: Record<string, string> = {
  "Zaplanowana": "bg-blue-50 text-blue-700 dark:bg-blue-950/30 dark:text-blue-300",
  "Odbyta":      "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300",
  "Odwołana":    "bg-red-50 text-red-700 dark:bg-red-950/30 dark:text-red-300",
};

export default function KlientPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const clientId = params.id as string;
  const initialConvId = searchParams.get("mentorConvId") ?? undefined;

  const [client, setClient] = useState<Client | null>(null);
  const [loading, setLoading] = useState(true);
  const [editOpen, setEditOpen] = useState(false);
  const [sessionDialogOpen, setSessionDialogOpen] = useState(false);
  const [expandedRetro, setExpandedRetro] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const [editForm, setEditForm] = useState({ name: "", company: "", role: "", stage: "", generalNote: "" });
  const [sessionForm, setSessionForm] = useState({
    scheduledAt: new Date().toISOString().slice(0, 16),
    durationMin: "60",
  });

  // Auto-collapse sidebar while on client view for more horizontal space
  const { setCollapsed } = useSidebar();
  useEffect(() => {
    const wasCollapsed = localStorage.getItem("sidebarCollapsed") === "true";
    if (!wasCollapsed) setCollapsed(true);
    return () => {
      if (!wasCollapsed) setCollapsed(false);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [aiEnabled, setAiEnabled] = useState(true);
  const [retroLoading, setRetroLoading] = useState(false);
  const [retroExpanded, setRetroExpanded] = useState(true);
  const [closeProcessOpen, setCloseProcessOpen] = useState(false);
  const [closingProcess, setClosingProcess] = useState(false);
  const [finalReportExpanded, setFinalReportExpanded] = useState(true);

  const fetchClient = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/klienci/${clientId}`);
    if (!res.ok) { router.push("/klienci"); return; }
    const data = await res.json();
    setClient(data);
    setEditForm({ name: data.name, company: data.company ?? "", role: data.role ?? "", stage: data.stage, generalNote: data.generalNote ?? "" });
    setLoading(false);
  }, [clientId, router]);

  useEffect(() => { fetchClient(); }, [fetchClient]);

  useEffect(() => {
    fetch("/api/ai/status")
      .then((res) => res.json())
      .then((data) => { if (!data.configured) setAiEnabled(false); })
      .catch(() => {});
  }, []);

  const handleGenerateRetro = async () => {
    setRetroLoading(true);
    const res = await fetch("/api/ai/retrospective", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ clientId }),
    });
    setRetroLoading(false);
    if (res.ok) {
      toast({ title: "Retrospektywa wygenerowana" });
      fetchClient();
      setRetroExpanded(true);
      setExpandedRetro(null);
    } else {
      const err = await res.json();
      if (res.status === 503) setAiEnabled(false);
      toast({ title: "Błąd generowania", description: err.error, variant: "destructive" });
    }
  };

  const handleCloseProcess = async () => {
    setClosingProcess(true);
    const res = await fetch(`/api/klienci/${clientId}/zamknij`, { method: "POST" });
    setClosingProcess(false);
    setCloseProcessOpen(false);
    if (res.ok) {
      const data = await res.json();
      setClient(data.client);
      setEditForm({ name: data.client.name, company: data.client.company ?? "", role: data.client.role ?? "", stage: data.client.stage, generalNote: data.client.generalNote ?? "" });
      setFinalReportExpanded(true);
      toast({ title: "Proces zamknięty", description: "Raport końcowy został wygenerowany." });
    } else {
      const err = await res.json();
      if (res.status === 503) setAiEnabled(false);
      toast({ title: "Błąd zamykania procesu", description: err.error, variant: "destructive" });
    }
  };

  const handleEdit = async () => {
    const res = await fetch(`/api/klienci/${clientId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(editForm),
    });
    if (res.ok) {
      toast({ title: "Zapisano zmiany" });
      setEditOpen(false);
      fetchClient();
    } else {
      toast({ title: "Błąd zapisu", variant: "destructive" });
    }
  };

  const handleDelete = async () => {
    if (!confirm(`Czy na pewno chcesz usunąć klienta ${client?.name}? Tej operacji nie można cofnąć.`)) return;
    setDeleting(true);
    const res = await fetch(`/api/klienci/${clientId}`, { method: "DELETE" });
    if (res.ok) {
      toast({ title: "Klient usunięty" });
      router.push("/klienci");
    } else {
      toast({ title: "Błąd usunięcia", variant: "destructive" });
      setDeleting(false);
    }
  };

  const handleAddSession = async () => {
    const res = await fetch("/api/sesje", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ clientId, ...sessionForm }),
    });
    if (res.ok) {
      const newSession = await res.json();
      toast({ title: "Sesja dodana" });
      setSessionDialogOpen(false);
      router.push(`/klienci/${clientId}/sesje/${newSession.id}`);
    } else {
      toast({ title: "Błąd dodawania sesji", variant: "destructive" });
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

  if (!client) return null;

  const stageHeaderColor = STAGE_COLORS_HEADER[client.stage] ?? "bg-white/20 border-white/30 text-white";

  const completedSessions = client.sessions
    .map((s, idx) => ({ id: s.id, scheduledAt: s.scheduledAt, sessionNumber: client.sessions.length - idx, status: s.status }))
    .filter((s) => s.status === "Odbyta");

  const plannedSessions = [...client.sessions]
    .map((s, idx) => ({ id: s.id, scheduledAt: s.scheduledAt, sessionNumber: client.sessions.length - idx, status: s.status }))
    .filter((s) => s.status === "Zaplanowana" && new Date(s.scheduledAt) >= new Date())
    .sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime());

  return (
    <AppLayout>
      <div className="flex h-screen overflow-hidden p-4 gap-4 panel-bg">
        {/* ── Left column ── */}
        <div className="flex-1 min-w-0 overflow-y-auto p-6 space-y-4 bg-white dark:bg-card rounded-2xl shadow-sm">

          {/* Back */}
          <Button variant="ghost" size="sm" asChild className="-ml-2">
            <Link href="/klienci">
              <ArrowLeft className="w-4 h-4 mr-1" />
              Klienci
            </Link>
          </Button>

          {/* Client header card — gradient matching AI panel */}
          <div className="relative overflow-hidden rounded-2xl header-gradient">
            <div className="absolute -top-6 -right-6 w-36 h-36 rounded-full bg-white/20 blur-2xl pointer-events-none" />
            <div className="absolute bottom-0 -left-4 w-28 h-28 rounded-full bg-blue-300/20 blur-2xl pointer-events-none" />

            <div className="relative z-10 p-6">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-white/20 border border-white/30 shadow-sm flex items-center justify-center text-white text-2xl font-bold shrink-0">
                    {client.name.charAt(0)}
                  </div>
                  <div>
                    <h1 className="text-2xl font-semibold leading-tight text-white">{client.name}</h1>
                    <div className="flex items-center gap-3 mt-1 text-sm text-white/80">
                      {client.role && (
                        <span className="flex items-center gap-1">
                          <Briefcase className="w-3.5 h-3.5" />{client.role}
                        </span>
                      )}
                      {client.company && (
                        <span className="flex items-center gap-1">
                          <Building2 className="w-3.5 h-3.5" />{client.company}
                        </span>
                      )}
                    </div>
                    <span className={cn("inline-flex items-center text-xs font-semibold px-2.5 py-0.5 rounded-full border mt-2", stageHeaderColor)}>
                      {client.stage}
                    </span>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 shrink-0 justify-end">
                  {client.stage !== "Zakończony" && (
                    <button
                      onClick={() => setCloseProcessOpen(true)}
                      className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg bg-white/15 border border-white/30 text-white hover:bg-emerald-400/30 transition-colors"
                    >
                      <Lock className="w-3.5 h-3.5" />
                      Zamknij
                    </button>
                  )}
                  <a
                    href={`/api/klienci/${clientId}/export`}
                    download
                    className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg bg-white/15 border border-white/30 text-white hover:bg-blue-400/30 transition-colors"
                  >
                    <FileDown className="w-3.5 h-3.5" />
                    Eksportuj PDF
                  </a>
                  <button
                    onClick={() => setEditOpen(true)}
                    className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg bg-white/15 border border-white/30 text-white hover:bg-orange-400/30 transition-colors"
                  >
                    <Edit className="w-3.5 h-3.5" />
                    Edytuj
                  </button>
                  <button
                    onClick={handleDelete}
                    disabled={deleting}
                    className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg bg-white/15 border border-white/30 text-white hover:bg-red-400/30 transition-colors disabled:opacity-50"
                  >
                    {deleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              {client.generalNote && (
                <div className="mt-4 bg-white/15 rounded-xl p-3 text-sm text-white/90 whitespace-pre-wrap">
                  {client.generalNote}
                </div>
              )}
            </div>
          </div>

          {/* Sessions card */}
          <div className="bg-white dark:bg-card rounded-2xl border border-blue-100/60 dark:border-slate-700 shadow-sm p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-semibold">Sesje
                <span className="ml-1.5 text-xs font-normal text-muted-foreground">({client.sessions.length})</span>
              </h2>
              <Button size="sm" onClick={() => setSessionDialogOpen(true)}>
                <Plus className="w-4 h-4" />
                Nowa sesja
              </Button>
            </div>

            {client.sessions.length === 0 ? (
              <div className="text-center py-10 border-2 border-dashed border-blue-200/60 dark:border-slate-700 rounded-xl bg-blue-50/30 dark:bg-transparent">
                <Calendar className="w-8 h-8 text-blue-300 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">Brak sesji. Dodaj pierwszą sesję.</p>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {client.sessions.map((s, idx) => (
                  <Link key={s.id} href={`/klienci/${clientId}/sesje/${s.id}`} className="group flex items-center gap-3 py-3 px-2 rounded-xl hover:bg-blue-50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer -mx-2">
                    <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-950/30 flex items-center justify-center shrink-0">
                      <span className="text-xs font-bold text-blue-500 dark:text-blue-400">{client.sessions.length - idx}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">Sesja {client.sessions.length - idx} · {formatDateTime(s.scheduledAt)}</p>
                      {s.durationMin && (
                        <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                          <Clock className="w-3 h-3" />{s.durationMin} min
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {s.status === "Zaplanowana" && new Date(s.scheduledAt) < new Date() && (
                        <span className="shrink-0 flex items-center gap-1 text-xs font-medium text-amber-600 dark:text-amber-400">
                          <TriangleAlert className="w-3.5 h-3.5 shrink-0" />
                          Zaplanowana w przeszłości
                        </span>
                      )}
                      <span className={cn("text-xs font-medium px-2 py-0.5 rounded-full", STATUS_COLORS[s.status] ?? "bg-slate-100 text-slate-600")}>
                        {s.status}
                      </span>
                      <ChevronRight className="w-4 h-4 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-blue-400" />
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Retrospectives card */}
          <div className="bg-white dark:bg-card rounded-2xl border border-blue-100/60 dark:border-slate-700 shadow-sm p-5">
            <div className="flex items-center justify-between mb-3">
              <button
                className="flex items-center gap-2 text-left"
                onClick={() => setRetroExpanded(!retroExpanded)}
              >
                <h2 className="text-base font-semibold">Retrospektywy
                  <span className="ml-1.5 text-xs font-normal text-muted-foreground">({client.retrospectives.length})</span>
                </h2>
                {retroExpanded
                  ? <ChevronUp className="w-4 h-4 text-muted-foreground" />
                  : <ChevronDown className="w-4 h-4 text-muted-foreground" />
                }
              </button>
              <Button
                size="sm"
                variant="outline"
                onClick={handleGenerateRetro}
                disabled={retroLoading || !aiEnabled || client.sessions.length === 0}
              >
                {retroLoading
                  ? <><Loader2 className="w-3.5 h-3.5 animate-spin" />Generowanie…</>
                  : <><Sparkles className="w-3.5 h-3.5" />Wygeneruj retrospektywę</>
                }
              </Button>
            </div>

            {retroExpanded && (
              <>
                {client.retrospectives.length === 0 ? (
                  <div className="text-center py-8 border-2 border-dashed border-blue-200/60 dark:border-slate-700 rounded-xl bg-blue-50/30 dark:bg-transparent">
                    <p className="text-sm text-muted-foreground">Brak retrospektyw. Kliknij „Wygeneruj retrospektywę" lub użyj Mentora AI.</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {client.retrospectives.map((r) => (
                      <div key={r.id} className="border rounded-xl overflow-hidden">
                        <button
                          className="w-full text-left py-3 px-4 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors flex items-center justify-between"
                          onClick={() => setExpandedRetro(expandedRetro === r.id ? null : r.id)}
                        >
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-sm">{formatDate(r.createdAt)}</span>
                            {r.truncated && (
                              <span className="text-xs bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-300 px-2 py-0.5 rounded-full border border-amber-200 dark:border-amber-800">
                                Skrócona
                              </span>
                            )}
                          </div>
                          <ChevronRight className={cn("w-4 h-4 text-muted-foreground transition-transform", expandedRetro === r.id && "rotate-90")} />
                        </button>
                        {expandedRetro === r.id && (
                          <div className="px-4 pb-4 pt-1 border-t">
                            {r.truncated && (
                              <p className="text-xs text-amber-600 dark:text-amber-400 mb-3 italic">
                                Część starszych notatek została pominięta ze względu na limit długości.
                              </p>
                            )}
                            <div className="prose-coach">
                              <ReactMarkdown remarkPlugins={[remarkGfm]}>{r.reportMd}</ReactMarkdown>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
          {/* Final report card — shown when process is closed */}
          {client.finalReportMd && (
            <div className="bg-white dark:bg-card rounded-2xl border border-emerald-200 dark:border-emerald-800 p-5">
              <button
                className="flex items-center justify-between w-full text-left"
                onClick={() => setFinalReportExpanded(!finalReportExpanded)}
              >
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 flex items-center justify-center">
                    <Lock className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <div>
                    <h2 className="text-base font-semibold">Raport końcowy procesu</h2>
                    {client.closedAt && (
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Zamknięto: {formatDate(client.closedAt)}
                      </p>
                    )}
                  </div>
                </div>
                {finalReportExpanded
                  ? <ChevronUp className="w-4 h-4 text-muted-foreground" />
                  : <ChevronDown className="w-4 h-4 text-muted-foreground" />
                }
              </button>
              {finalReportExpanded && (
                <div className="mt-4 pt-4 border-t border-emerald-100 dark:border-emerald-900/50">
                  <div className="prose-coach">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{client.finalReportMd}</ReactMarkdown>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── Right column: Mentor AI ── */}
        <div className="w-[560px] shrink-0 flex flex-col bg-white dark:bg-card rounded-2xl shadow-sm overflow-hidden">
          <MentorAIPanel
            clientId={clientId}
            clientName={client.name}
            completedSessions={completedSessions}
            plannedSessions={plannedSessions}
            aiEnabled={aiEnabled}
            initialConversationId={initialConvId}
          />
        </div>
      </div>

      {/* Edit dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader><DialogTitle>Edytuj klienta</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Imię i nazwisko *</Label>
              <Input value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Firma</Label>
                <Input value={editForm.company} onChange={(e) => setEditForm({ ...editForm, company: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Rola</Label>
                <Input value={editForm.role} onChange={(e) => setEditForm({ ...editForm, role: e.target.value })} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Etap</Label>
              <Select value={editForm.stage} onValueChange={(v) => setEditForm({ ...editForm, stage: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {STAGE_OPTIONS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Notatka ogólna</Label>
              <Textarea rows={3} value={editForm.generalNote} onChange={(e) => setEditForm({ ...editForm, generalNote: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>Anuluj</Button>
            <Button onClick={handleEdit}>Zapisz</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Close process dialog */}
      <Dialog open={closeProcessOpen} onOpenChange={setCloseProcessOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Lock className="w-4 h-4 text-slate-600" />
              Zamknij proces coachingowy
            </DialogTitle>
          </DialogHeader>
          <div className="py-2 space-y-3">
            <p className="text-sm text-muted-foreground">
              Czy na pewno chcesz zamknąć proces coachingowy dla klienta <strong className="text-foreground">{client.name}</strong>?
            </p>
            <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-xl px-4 py-3 text-sm text-blue-800 dark:text-blue-300 space-y-1">
              <p className="font-medium">Co się stanie po zamknięciu:</p>
              <ul className="list-disc list-inside space-y-1 text-blue-700 dark:text-blue-400">
                <li>Etap klienta zostanie zmieniony na <strong>Zakończony</strong></li>
                <li>AI wygeneruje <strong>raport końcowy procesu</strong> (EMCC/ICF) na podstawie wszystkich sesji i notatek</li>
                <li>Raport będzie dostępny w karcie klienta jako dokumentacja akredytacyjna</li>
              </ul>
            </div>
            <p className="text-xs text-muted-foreground italic">
              Zamknięcie procesu można edytować ręcznie przez formularz edycji klienta.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCloseProcessOpen(false)} disabled={closingProcess}>
              Anuluj
            </Button>
            <Button onClick={handleCloseProcess} disabled={closingProcess}>
              {closingProcess
                ? <><Loader2 className="w-4 h-4 animate-spin" />Generowanie raportu…</>
                : <><Lock className="w-4 h-4" />Zamknij i wygeneruj raport</>
              }
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* New session dialog */}
      <Dialog open={sessionDialogOpen} onOpenChange={setSessionDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Nowa sesja</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Data i godzina *</Label>
              <Input
                type="datetime-local"
                value={sessionForm.scheduledAt}
                onChange={(e) => setSessionForm({ ...sessionForm, scheduledAt: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Czas trwania (min)</Label>
              <Input
                type="number"
                value={sessionForm.durationMin}
                onChange={(e) => setSessionForm({ ...sessionForm, durationMin: e.target.value })}
                min={15}
                step={15}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSessionDialogOpen(false)}>Anuluj</Button>
            <Button onClick={handleAddSession}>Utwórz sesję</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
