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
  FileDown, TriangleAlert, AlertCircle,
} from "lucide-react";
import Link from "next/link";
import { cn, formatDate, formatDateTime, STAGE_OPTIONS, SESSION_STATUS_LABEL } from "@/lib/utils";
import { useToast } from "@/components/ui/use-toast";
import { MentorAIPanel } from "@/components/mentor/MentorAIPanel";

interface Session {
  id: string;
  scheduledAt: string;
  durationMin?: number | null;
  status: string;
  summaryMd?: string | null;
}

interface RetroSectionItem { heading: string; content: string[] }
interface RetroSection {
  id: string; title: string;
  toneColor: "blue" | "green" | "purple" | "orange" | "amber";
  items: RetroSectionItem[];
}
interface RetrospectiveReportV1 {
  title: string;
  summary: { oneLiner: string; processSnapshot: string[] };
  sections: RetroSection[];
  reflectionQuestions: string[];
  dataQuality: { truncated: boolean; coverageNote: string };
}

interface Retrospective {
  id: string;
  createdAt: string;
  reportJson?: RetrospectiveReportV1 | null;
  reportMd?: string | null;  // legacy
  truncated: boolean;
  version?: string;
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

// ─── Retrospective JSON renderer ─────────────────────────────────────────────

const RETRO_TONE: Record<string, { bg: string; border: string; title: string; dot: string }> = {
  blue:   { bg: "bg-blue-50/50 dark:bg-blue-950/10",    border: "border-blue-200/60 dark:border-blue-800/30",   title: "text-blue-700 dark:text-blue-300",     dot: "bg-blue-400" },
  green:  { bg: "bg-emerald-50/50 dark:bg-emerald-950/10", border: "border-emerald-200/60 dark:border-emerald-800/30", title: "text-emerald-700 dark:text-emerald-300", dot: "bg-emerald-400" },
  purple: { bg: "bg-violet-50/50 dark:bg-violet-950/10", border: "border-violet-200/60 dark:border-violet-800/30", title: "text-violet-700 dark:text-violet-300",   dot: "bg-violet-400" },
  orange: { bg: "bg-orange-50/50 dark:bg-orange-950/10", border: "border-orange-200/60 dark:border-orange-800/30", title: "text-orange-700 dark:text-orange-300",   dot: "bg-orange-400" },
  amber:  { bg: "bg-amber-50/50 dark:bg-amber-950/10",   border: "border-amber-200/60 dark:border-amber-800/30",  title: "text-amber-700 dark:text-amber-300",    dot: "bg-amber-400" },
};

function RetrospectiveReport({ report }: { report: RetrospectiveReportV1 }) {
  return (
    <div className="space-y-4">
      {/* Summary pill row */}
      <div className="bg-slate-50 dark:bg-slate-800/30 rounded-xl p-4 border border-slate-200 dark:border-slate-700">
        <p className="text-sm font-medium text-foreground leading-relaxed">{report.summary?.oneLiner}</p>
        {report.summary?.processSnapshot?.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-3">
            {report.summary.processSnapshot.map((item, i) => (
              <span key={i} className="text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-full px-2.5 py-1 text-slate-600 dark:text-slate-400">
                {item}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Sections */}
      {report.sections?.map((section) => {
        const colors = RETRO_TONE[section.toneColor] ?? RETRO_TONE.blue;
        return (
          <div key={section.id} className={cn("rounded-xl border p-4", colors.bg, colors.border)}>
            <h4 className={cn("text-sm font-semibold mb-3", colors.title)}>{section.title}</h4>
            <div className="space-y-3">
              {section.items?.map((item, idx) => (
                <div key={idx}>
                  <p className="text-sm font-semibold text-foreground mb-1">{item.heading}</p>
                  <ul className="space-y-1.5">
                    {item.content?.map((line, j) => (
                      <li key={j} className="flex items-start gap-2 text-sm text-foreground/80">
                        <span className={cn("w-1.5 h-1.5 rounded-full mt-2 shrink-0", colors.dot)} />
                        <span>{line}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        );
      })}

      {/* Reflection questions */}
      {report.reflectionQuestions?.length > 0 && (
        <div className="rounded-xl border border-slate-200 dark:border-slate-700 p-4 bg-white dark:bg-card">
          <h4 className="text-sm font-semibold text-foreground mb-3">Pytania do refleksji</h4>
          <ol className="space-y-2.5">
            {report.reflectionQuestions.map((q, i) => (
              <li key={i} className="flex items-start gap-2.5 text-sm text-foreground/80">
                <span className="text-xs font-bold text-muted-foreground mt-0.5 w-4 shrink-0 tabular-nums">{i + 1}.</span>
                <span className="italic leading-relaxed">{q}</span>
              </li>
            ))}
          </ol>
        </div>
      )}

      {/* Data quality note */}
      {report.dataQuality?.coverageNote && (
        <p className="text-xs text-muted-foreground/60 px-1">{report.dataQuality.coverageNote}</p>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

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
  const [retroInsufficientData, setRetroInsufficientData] = useState<string[] | null>(null);
  const [deleteRetroId, setDeleteRetroId] = useState<string | null>(null);
  const [deletingRetro, setDeletingRetro] = useState(false);
  const [retroEditState, setRetroEditState] = useState<
    | { retroId: string; json: RetrospectiveReportV1 }
    | { retroId: string; md: string }
    | null
  >(null);
  const [savingRetro, setSavingRetro] = useState(false);

  const updateRetroJson = (updater: (d: RetrospectiveReportV1) => void) => {
    setRetroEditState((prev) => {
      if (!prev || !("json" in prev)) return prev;
      const d = JSON.parse(JSON.stringify(prev.json)) as RetrospectiveReportV1;
      updater(d);
      return { ...prev, json: d };
    });
  };
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
    setRetroInsufficientData(null);
    try {
      const res = await fetch("/api/ai/retrospective", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientId }),
      });
      if (res.ok) {
        toast({ title: "Retrospektywa wygenerowana" });
        fetchClient();
        setRetroExpanded(true);
        setExpandedRetro(null);
      } else {
        const body = await res.json().catch(() => ({})) as { error?: { code?: string; missing?: string[] } | string };
        if (res.status === 503) { setAiEnabled(false); return; }
        if (res.status === 400 && typeof body.error === "object" && body.error?.code === "INSUFFICIENT_DATA") {
          setRetroInsufficientData(body.error.missing ?? []);
          setRetroExpanded(true);
          return;
        }
        const msg = typeof body.error === "string" ? body.error : (body.error as { message?: string })?.message ?? "Nieznany błąd";
        toast({ title: "Błąd generowania", description: msg, variant: "destructive" });
      }
    } catch {
      toast({ title: "Błąd generowania", description: "Nie można połączyć się z serwerem.", variant: "destructive" });
    } finally {
      setRetroLoading(false);
    }
  };

  const handleDeleteRetro = async (id: string) => {
    setDeletingRetro(true);
    const res = await fetch(`/api/ai/retrospective/${id}`, { method: "DELETE" });
    setDeletingRetro(false);
    setDeleteRetroId(null);
    if (res.ok) {
      fetchClient();
      if (expandedRetro === id) setExpandedRetro(null);
    } else {
      toast({ title: "Błąd usuwania", description: "Nie udało się usunąć retrospektywy.", variant: "destructive" });
    }
  };

  const handleSaveRetro = async () => {
    if (!retroEditState) return;
    setSavingRetro(true);
    const bodyData = "json" in retroEditState
      ? { reportJson: retroEditState.json }
      : { reportMd: retroEditState.md };
    const res = await fetch(`/api/ai/retrospective/${retroEditState.retroId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(bodyData),
    });
    setSavingRetro(false);
    if (res.ok) {
      const { retroId } = retroEditState;
      setClient((prev) => prev ? {
        ...prev,
        retrospectives: prev.retrospectives.map((r) => {
          if (r.id !== retroId) return r;
          return "json" in retroEditState
            ? { ...r, reportJson: retroEditState.json, reportMd: null }
            : { ...r, reportJson: null, reportMd: retroEditState.md };
        }),
      } : prev);
      setRetroEditState(null);
    } else {
      toast({ title: "Błąd zapisu", description: "Nie udało się zapisać zmian.", variant: "destructive" });
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
      toast({ title: "Sesja dodana" });
      setSessionDialogOpen(false);
      fetchClient();
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
                        {SESSION_STATUS_LABEL[s.status] ?? s.status}
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
                {retroExpanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
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
              <div className="space-y-3">
                {/* Insufficient data alert */}
                {retroInsufficientData && (
                  <div className="rounded-xl border border-amber-200 dark:border-amber-800/60 bg-amber-50 dark:bg-amber-950/20 p-4">
                    <div className="flex items-start gap-3">
                      <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
                      <div>
                        <p className="text-sm font-medium text-amber-900 dark:text-amber-200 mb-2">
                          Za mało danych — uzupełnij poniższe, aby retrospektywa miała wartość:
                        </p>
                        <ul className="space-y-1.5">
                          {retroInsufficientData.map((item, i) => (
                            <li key={i} className="flex items-start gap-2 text-xs text-amber-700 dark:text-amber-300">
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0 mt-1" />
                              {item}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                )}

                {client.retrospectives.length === 0 && !retroInsufficientData ? (
                  <div className="text-center py-8 border-2 border-dashed border-blue-200/60 dark:border-slate-700 rounded-xl bg-blue-50/30 dark:bg-transparent">
                    <p className="text-sm text-muted-foreground">Brak retrospektyw. Kliknij „Wygeneruj retrospektywę".</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {client.retrospectives.map((r) => (
                      <div key={r.id} className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
                        {/* Row header */}
                        <div className="flex items-center justify-between px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                          <button
                            className="flex items-center gap-2 flex-1 text-left min-w-0"
                            onClick={() => setExpandedRetro(expandedRetro === r.id ? null : r.id)}
                          >
                            <span className="font-medium text-sm">{formatDate(r.createdAt)}</span>
                            {r.truncated && (
                              <span className="text-xs bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-300 px-2 py-0.5 rounded-full border border-amber-200 dark:border-amber-800 shrink-0">
                                Skrócona
                              </span>
                            )}
                            {r.reportJson && (
                              <span className="text-xs bg-violet-50 text-violet-600 dark:bg-violet-950/30 dark:text-violet-400 px-2 py-0.5 rounded-full border border-violet-200 dark:border-violet-800 shrink-0">
                                AI v2
                              </span>
                            )}
                          </button>
                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              onClick={() => {
                                setExpandedRetro(r.id);
                                if (r.reportJson) {
                                  setRetroEditState({ retroId: r.id, json: JSON.parse(JSON.stringify(r.reportJson)) as RetrospectiveReportV1 });
                                } else {
                                  setRetroEditState({ retroId: r.id, md: r.reportMd ?? "" });
                                }
                              }}
                              className="p-1.5 rounded-lg text-muted-foreground/40 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-950/20 transition-colors"
                              title="Edytuj retrospektywę"
                            >
                              <Edit className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => setDeleteRetroId(r.id)}
                              className="p-1.5 rounded-lg text-muted-foreground/40 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors"
                              title="Usuń retrospektywę"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                            <ChevronRight
                              className={cn("w-4 h-4 text-muted-foreground transition-transform", expandedRetro === r.id && "rotate-90")}
                              onClick={() => setExpandedRetro(expandedRetro === r.id ? null : r.id)}
                            />
                          </div>
                        </div>

                        {/* Expanded body */}
                        {expandedRetro === r.id && (() => {
                          const activeEdit = retroEditState?.retroId === r.id ? retroEditState : null;
                          const F = "w-full text-sm px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-400/40 resize-none";
                          return (
                            <div className="border-t border-slate-200 dark:border-slate-700 px-4 pb-5 pt-4">
                              {activeEdit ? (
                                <div className="space-y-4">
                                  {"json" in activeEdit ? (
                                    <>
                                      {/* Summary */}
                                      <div className="bg-slate-50 dark:bg-slate-800/30 rounded-xl p-3 border border-slate-200 dark:border-slate-700 space-y-2">
                                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Podsumowanie</p>
                                        <textarea className={F} rows={2}
                                          value={activeEdit.json.summary?.oneLiner ?? ""}
                                          onChange={(e) => updateRetroJson(d => { d.summary.oneLiner = e.target.value; })}
                                        />
                                        <p className="text-xs text-muted-foreground">Przebieg procesu <span className="font-normal">(każdy etap w nowej linii)</span></p>
                                        <textarea className={F} rows={3}
                                          value={(activeEdit.json.summary?.processSnapshot ?? []).join("\n")}
                                          onChange={(e) => updateRetroJson(d => { d.summary.processSnapshot = e.target.value.split("\n").filter(l => l.trim()); })}
                                        />
                                      </div>

                                      {/* Sections */}
                                      {(activeEdit.json.sections ?? []).map((section, sIdx) => {
                                        const colors = RETRO_TONE[section.toneColor] ?? RETRO_TONE.blue;
                                        return (
                                          <div key={section.id} className={cn("rounded-xl border p-3 space-y-2.5", colors.bg, colors.border)}>
                                            <input
                                              className={cn("w-full text-sm font-semibold bg-transparent border-none focus:outline-none focus:bg-white/60 dark:focus:bg-slate-800/60 rounded px-1 -ml-1", colors.title)}
                                              value={section.title}
                                              onChange={(e) => updateRetroJson(d => { d.sections[sIdx].title = e.target.value; })}
                                            />
                                            {(section.items ?? []).map((item, iIdx) => (
                                              <div key={iIdx} className="pl-2 border-l-2 border-black/10 dark:border-white/10 space-y-1.5">
                                                <input
                                                  className="w-full text-sm font-medium bg-white/60 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700/70 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-300/50"
                                                  value={item.heading}
                                                  placeholder="Nagłówek punktu"
                                                  onChange={(e) => updateRetroJson(d => { d.sections[sIdx].items[iIdx].heading = e.target.value; })}
                                                />
                                                <textarea
                                                  className="w-full text-sm bg-white/60 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700/70 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-300/50 resize-none"
                                                  rows={Math.max(2, (item.content ?? []).length)}
                                                  value={(item.content ?? []).join("\n")}
                                                  placeholder="Punkty (każdy w nowej linii)"
                                                  onChange={(e) => updateRetroJson(d => { d.sections[sIdx].items[iIdx].content = e.target.value.split("\n"); })}
                                                />
                                              </div>
                                            ))}
                                          </div>
                                        );
                                      })}

                                      {/* Reflection questions */}
                                      <div className="rounded-xl border border-slate-200 dark:border-slate-700 p-3 bg-white dark:bg-card space-y-1.5">
                                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Pytania do refleksji <span className="normal-case font-normal">(każde w nowej linii)</span></p>
                                        <textarea className={F} rows={3}
                                          value={(activeEdit.json.reflectionQuestions ?? []).join("\n")}
                                          onChange={(e) => updateRetroJson(d => { d.reflectionQuestions = e.target.value.split("\n").filter(l => l.trim()); })}
                                        />
                                      </div>
                                    </>
                                  ) : (
                                    /* Legacy markdown edit */
                                    <textarea
                                      className={cn(F, "font-mono min-h-[280px]")}
                                      value={activeEdit.md}
                                      onChange={(e) => setRetroEditState(prev => prev && "md" in prev ? { ...prev, md: e.target.value } : prev)}
                                    />
                                  )}

                                  <div className="flex justify-end gap-2 pt-1">
                                    <Button variant="outline" size="sm" disabled={savingRetro} onClick={() => setRetroEditState(null)}>Anuluj</Button>
                                    <Button size="sm" disabled={savingRetro} onClick={handleSaveRetro}>
                                      {savingRetro ? <><Loader2 className="w-3.5 h-3.5 animate-spin mr-1" />Zapisywanie…</> : "Zapisz"}
                                    </Button>
                                  </div>
                                </div>
                              ) : r.reportJson ? (
                                <RetrospectiveReport report={r.reportJson} />
                              ) : r.reportMd ? (
                                <>
                                  {r.truncated && (
                                    <p className="text-xs text-amber-600 dark:text-amber-400 mb-3 italic">
                                      Część starszych notatek została pominięta ze względu na limit długości.
                                    </p>
                                  )}
                                  <div className="prose-coach">
                                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{r.reportMd}</ReactMarkdown>
                                  </div>
                                </>
                              ) : (
                                <p className="text-sm text-muted-foreground">Brak treści raportu.</p>
                              )}
                            </div>
                          );
                        })()}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Delete retrospective confirm */}
          <Dialog open={!!deleteRetroId} onOpenChange={(open) => { if (!open) setDeleteRetroId(null); }}>
            <DialogContent className="sm:max-w-sm">
              <DialogHeader>
                <DialogTitle>Usuń retrospektywę</DialogTitle>
              </DialogHeader>
              <p className="text-sm text-muted-foreground py-2">
                Czy na pewno chcesz usunąć tę retrospektywę? Tej operacji nie da się cofnąć.
              </p>
              <DialogFooter>
                <Button variant="outline" onClick={() => setDeleteRetroId(null)} disabled={deletingRetro}>Anuluj</Button>
                <Button variant="destructive" onClick={() => deleteRetroId && handleDeleteRetro(deleteRetroId)} disabled={deletingRetro}>
                  {deletingRetro ? <><Loader2 className="w-3.5 h-3.5 animate-spin" />Usuwanie…</> : "Usuń"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
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
