"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
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
  FileText, Building2, Briefcase, ChevronRight,
  AlertCircle, Send, ChevronDown, ChevronUp, Sparkles, Lock,
  Gem, Target, Paperclip, Mic,
} from "lucide-react";
import { MentorMark } from "@/components/ui/mentor-mark";
import Link from "next/link";
import { cn, formatDate, formatDateTime, STAGE_OPTIONS, SESSION_STATUS_OPTIONS } from "@/lib/utils";
import { useToast } from "@/components/ui/use-toast";

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

interface ChatMsg {
  id: string;
  role: "user" | "assistant";
  contentMd: string;
  createdAt: string;
}

const QUICK_PROMPTS = [
  {
    label: "Ogólna refleksja",
    icon: "🔍",
    message: `Chciałbym omówić ogólny postęp i dynamikę pracy z tym klientem. Jakie wzorce widzisz w dotychczasowych sesjach? Co warto pogłębić lub zmienić w moim podejściu jako coacha?`,
  },
  {
    label: "Feedback dla coacha",
    icon: "🎯",
    message: `Proszę o konstruktywny feedback dotyczący mojej pracy z tym klientem. Na podstawie notatek z sesji — co robię dobrze, co mogę poprawić i gdzie mogłem działać inaczej? Mów wprost, jak mentor, nie dyplomatycznie.`,
  },
  {
    label: "Pomóż zaplanować sesję",
    icon: "📋",
    message: `Pomóż mi zaplanować kolejną sesję z tym klientem. Zaproponuj konkretny cel sesji wynikający z historii procesu, strukturę z orientacyjnym czasem, 2–3 techniki lub narzędzia coachingowe oraz 4–6 gotowych pytań do bezpośredniego użycia na sesji.`,
  },
];

function getQuickPromptMeta(label: string): { icon: React.ReactNode; textColorClass: string; hoverClass: string } {
  switch (label) {
    case "Ogólna refleksja":       return { icon: <Gem className="w-3.5 h-3.5" />,      textColorClass: "text-[#224cc0]", hoverClass: "hover:bg-[#224cc0] hover:text-white" };
    case "Feedback dla coacha":    return { icon: <Target className="w-3.5 h-3.5" />,   textColorClass: "text-[#D28B4C]", hoverClass: "hover:bg-[#D28B4C] hover:text-white" };
    case "Pomóż zaplanować sesję": return { icon: <Sparkles className="w-3.5 h-3.5" />, textColorClass: "text-[#8A66BC]", hoverClass: "hover:bg-[#8A66BC] hover:text-white" };
    default:                        return { icon: null, textColorClass: "text-slate-600", hoverClass: "hover:bg-slate-100 hover:text-slate-800" };
  }
}

const STAGE_COLORS: Record<string, string> = {
  "Wstęp":      "bg-orange-50 text-orange-600 border-orange-200 dark:bg-orange-950/30 dark:text-orange-400 dark:border-orange-800",
  "Onboarding": "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/30 dark:text-blue-300 dark:border-blue-800",
  "W trakcie":  "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-300 dark:border-emerald-800",
  "Zakończony": "bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700",
  "Zawieszony": "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-300 dark:border-amber-800",
};

const STATUS_COLORS: Record<string, string> = {
  "Zaplanowana": "bg-blue-50 text-blue-700 dark:bg-blue-950/30 dark:text-blue-300",
  "Odbyta":      "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300",
  "Odwołana":    "bg-red-50 text-red-700 dark:bg-red-950/30 dark:text-red-300",
};

export default function KlientPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const clientId = params.id as string;

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
    status: "Zaplanowana",
  });

  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [chatLoading, setChatLoading] = useState(false);
  const [chatInput, setChatInput] = useState("");
  const [contextSummary, setContextSummary] = useState<string>("");
  const [aiEnabled, setAiEnabled] = useState(true);
  const [retroLoading, setRetroLoading] = useState(false);
  const [retroExpanded, setRetroExpanded] = useState(true);
  const [closeProcessOpen, setCloseProcessOpen] = useState(false);
  const [closingProcess, setClosingProcess] = useState(false);
  const [finalReportExpanded, setFinalReportExpanded] = useState(true);
  const chatBottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const fetchClient = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/klienci/${clientId}`);
    if (!res.ok) { router.push("/klienci"); return; }
    const data = await res.json();
    setClient(data);
    setEditForm({ name: data.name, company: data.company ?? "", role: data.role ?? "", stage: data.stage, generalNote: data.generalNote ?? "" });
    setLoading(false);
  }, [clientId, router]);

  const fetchThread = useCallback(async () => {
    const res = await fetch(`/api/chat/thread?clientId=${clientId}`);
    if (!res.ok) return;
    const data = await res.json();
    setMessages(data.messages ?? []);
    setContextSummary(data.contextSummary ?? "");
  }, [clientId]);

  useEffect(() => { fetchClient(); }, [fetchClient]);
  useEffect(() => { fetchThread(); }, [fetchThread]);

  useEffect(() => {
    fetch("/api/ai/status")
      .then((res) => res.json())
      .then((data) => { if (!data.configured) setAiEnabled(false); })
      .catch(() => {});
  }, []);

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = async (messageText: string) => {
    if (!messageText.trim() || chatLoading) return;

    const optimisticMsg: ChatMsg = {
      id: `tmp-${Date.now()}`,
      role: "user",
      contentMd: messageText,
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, optimisticMsg]);
    setChatInput("");
    setChatLoading(true);

    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }

    try {
      const res = await fetch("/api/ai/mentor/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientId, message: messageText }),
      });

      if (res.status === 503) {
        setAiEnabled(false);
        setMessages((prev) => prev.filter((m) => m.id !== optimisticMsg.id));
        toast({ title: "AI niedostępne", description: "Brak klucza OPENAI_API_KEY.", variant: "destructive" });
        return;
      }

      if (!res.ok) {
        const err = await res.json();
        setMessages((prev) => prev.filter((m) => m.id !== optimisticMsg.id));
        toast({ title: "Błąd AI", description: err.error, variant: "destructive" });
        return;
      }

      const data = await res.json();
      setContextSummary(data.contextSummary ?? contextSummary);

      setMessages((prev) => {
        const without = prev.filter((m) => m.id !== optimisticMsg.id);
        return [
          ...without,
          { ...optimisticMsg, id: `user-${Date.now()}` },
          {
            id: data.message.id,
            role: "assistant",
            contentMd: data.message.contentMd,
            createdAt: data.message.createdAt,
          },
        ];
      });
    } catch {
      setMessages((prev) => prev.filter((m) => m.id !== optimisticMsg.id));
      toast({ title: "Błąd połączenia", variant: "destructive" });
    } finally {
      setChatLoading(false);
    }
  };

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

  const stageColor = STAGE_COLORS[client.stage] ?? "bg-slate-100 text-slate-600 border-slate-200";

  return (
    <AppLayout>
      <div className="flex h-screen overflow-hidden">
        {/* ── Left column ── */}
        <div className="flex-1 min-w-0 overflow-y-auto p-6 space-y-4 panel-bg">

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
                    <span className="inline-flex items-center text-xs font-medium px-2.5 py-0.5 rounded-full bg-white/20 border border-white/30 text-white mt-2">
                      {client.stage}
                    </span>
                  </div>
                </div>
                <div className="flex gap-2 shrink-0">
                  {client.stage !== "Zakończony" && (
                    <button
                      onClick={() => setCloseProcessOpen(true)}
                      className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg bg-white/15 border border-white/30 text-white hover:bg-white/25 transition-colors"
                    >
                      <Lock className="w-3.5 h-3.5" />
                      Zamknij
                    </button>
                  )}
                  <button
                    onClick={() => setEditOpen(true)}
                    className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg bg-white/15 border border-white/30 text-white hover:bg-white/25 transition-colors"
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
                {client.sessions.map((s) => (
                  <Link key={s.id} href={`/klienci/${clientId}/sesje/${s.id}`} className="flex items-center gap-3 py-3 px-2 rounded-xl hover:bg-blue-50/50 dark:hover:bg-slate-800/40 transition-colors cursor-pointer -mx-2">
                    <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-950/30 flex items-center justify-center shrink-0">
                      <FileText className="w-4 h-4 text-blue-400 dark:text-blue-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{formatDateTime(s.scheduledAt)}</p>
                      {s.durationMin && (
                        <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                          <Clock className="w-3 h-3" />{s.durationMin} min
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className={cn("text-xs font-medium px-2 py-0.5 rounded-full", STATUS_COLORS[s.status] ?? "bg-slate-100 text-slate-600")}>
                        {s.status}
                      </span>
                      <ChevronRight className="w-4 h-4 text-muted-foreground" />
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
        <div className="w-[420px] shrink-0 flex flex-col border-l bg-white dark:bg-card overflow-hidden">

          {/* Header + quick prompts — single blue gradient block */}
          <div className="relative overflow-hidden shrink-0 header-gradient">
            {/* Subtle blur circles */}
            <div className="absolute -top-6 -right-6 w-36 h-36 rounded-full bg-white/20 blur-2xl pointer-events-none" />
            <div className="absolute bottom-0 -left-4 w-28 h-28 rounded-full bg-blue-300/20 blur-2xl pointer-events-none" />

            {/* Title row */}
            <div className="relative z-10 px-5 pt-4 pb-3">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-white/20 border border-white/30 shadow-sm flex items-center justify-center shrink-0">
                  <MentorMark className="w-6 h-6 text-white" />
                </div>
                <div>
                  <p className="text-base font-semibold text-white leading-tight">Mentor AI</p>
                  <p className="text-xs text-white/80 mt-0.5">Superwizja i refleksja</p>
                </div>
              </div>
              {contextSummary && (
                <p className="text-xs text-white/70 mt-2.5 leading-relaxed line-clamp-2">
                  {contextSummary}
                </p>
              )}
              {!aiEnabled && (
                <div className="flex items-center gap-1.5 mt-2 text-xs text-amber-700 bg-amber-50/90 border border-amber-200 rounded-lg px-2.5 py-1.5">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  AI niedostępne – brak klucza OPENAI_API_KEY.
                </div>
              )}
            </div>

            {/* Quick prompts inside the gradient */}
            <div className="relative z-10 px-3 pb-3 flex gap-2">
              {QUICK_PROMPTS.map((qp) => {
                const meta = getQuickPromptMeta(qp.label);
                return (
                  <button
                    key={qp.label}
                    onClick={() => sendMessage(qp.message)}
                    disabled={chatLoading || !aiEnabled}
                    className={cn(
                      "flex-1 flex flex-col items-center justify-center gap-1 py-2 px-1.5 rounded-xl text-xs font-medium",
                      "bg-white/85 shadow-sm transition-all",
                      meta.textColorClass,
                      meta.hoverClass,
                      "disabled:opacity-50 disabled:cursor-not-allowed"
                    )}
                  >
                    {meta.icon}
                    <span className="leading-tight text-center">{qp.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4 panel-bg">

            {/* Date separator — inside chat box so it inherits the background */}
            <div className="flex items-center gap-3 pt-0 pb-1">
              <div className="flex-1 border-t border-dashed border-blue-200/70" />
              <span className="text-xs text-blue-300 whitespace-nowrap">
                {new Date().toLocaleDateString("pl-PL", { day: "numeric", month: "long" })}
              </span>
              <div className="flex-1 border-t border-dashed border-blue-200/70" />
            </div>

            {messages.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full text-center gap-3 py-8">
                <div className="w-14 h-14 rounded-2xl bg-blue-50 dark:bg-blue-950/30 flex items-center justify-center">
                  <MentorMark className="w-7 h-7 text-blue-400 dark:text-blue-500" />
                </div>
                <div>
                  <p className="font-medium text-sm text-foreground">Witaj w Mentor AI</p>
                  <p className="text-xs text-muted-foreground mt-1 max-w-[220px] leading-relaxed">
                    Zadaj pytanie lub użyj szybkich akcji powyżej.
                  </p>
                </div>
              </div>
            )}

            {messages.map((msg) => (
              <div
                key={msg.id}
                className={cn("flex gap-2", msg.role === "user" ? "justify-end" : "justify-start")}
              >
                {msg.role === "assistant" && (
                  <div className="w-7 h-7 rounded-full bg-[#85b5f7] flex items-center justify-center shrink-0 mt-0.5">
                    <MentorMark className="w-3.5 h-3.5 text-white" />
                  </div>
                )}
                <div className="max-w-[85%]">
                  {msg.role === "user" ? (
                    <div className="bg-gradient-to-br from-[#7aaef5] via-[#5a8ae8] to-[#3d6fd4] text-white rounded-3xl rounded-br-md px-4 py-2.5 text-sm">
                      <p className="whitespace-pre-wrap leading-relaxed">{msg.contentMd}</p>
                    </div>
                  ) : (
                    <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm rounded-2xl rounded-tl-sm px-3.5 py-2.5 text-sm text-foreground">
                      <div className="prose-coach">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.contentMd}</ReactMarkdown>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}

            {chatLoading && (
              <div className="flex gap-2 justify-start">
                <div className="w-7 h-7 rounded-full bg-[#85b5f7] flex items-center justify-center shrink-0 mt-0.5">
                  <MentorMark className="w-3.5 h-3.5 text-white" />
                </div>
                <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm rounded-2xl rounded-tl-sm px-3.5 py-2.5">
                  <div className="flex gap-1 items-center h-5">
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce [animation-delay:0ms]" />
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce [animation-delay:150ms]" />
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce [animation-delay:300ms]" />
                  </div>
                </div>
              </div>
            )}

            <div ref={chatBottomRef} />
          </div>

          {/* Input */}
          <div className="border-t px-3 pt-3 pb-3 shrink-0 bg-white dark:bg-card">
            <div className="flex items-end gap-2 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-2xl px-3 py-2 shadow-sm">
              <button className="shrink-0 p-1.5 mb-0.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors">
                <Paperclip className="w-4 h-4" />
              </button>
              <textarea
                ref={textareaRef}
                className="flex-1 resize-none bg-transparent text-sm focus:outline-none min-h-[36px] max-h-[120px] py-1 text-foreground placeholder:text-muted-foreground"
                placeholder={aiEnabled ? "Napisz do Mentora AI..." : "AI niedostępne"}
                value={chatInput}
                disabled={!aiEnabled || chatLoading}
                rows={1}
                onChange={(e) => {
                  setChatInput(e.target.value);
                  e.target.style.height = "auto";
                  e.target.style.height = `${e.target.scrollHeight}px`;
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    sendMessage(chatInput);
                  }
                }}
              />
              <div className="flex items-center gap-1 shrink-0 mb-0.5">
                <button className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors">
                  <Mic className="w-4 h-4" />
                </button>
                <Button
                  size="sm"
                  className="h-8 w-8 p-0 rounded-xl bg-blue-600 hover:bg-blue-700 border-0 shrink-0"
                  onClick={() => sendMessage(chatInput)}
                  disabled={!chatInput.trim() || chatLoading || !aiEnabled}
                >
                  {chatLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                </Button>
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-1.5 ml-1">Enter – wyślij · Shift+Enter – nowa linia</p>
          </div>
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
            <div className="grid grid-cols-2 gap-3">
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
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={sessionForm.status} onValueChange={(v) => setSessionForm({ ...sessionForm, status: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {SESSION_STATUS_OPTIONS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
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
