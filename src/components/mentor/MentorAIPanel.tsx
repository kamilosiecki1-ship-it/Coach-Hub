"use client";
/**
 * MentorAIPanel — multi-conversation Mentor AI panel.
 *
 * Three views managed via `panelView`:
 *  - "list"    : conversation history + "Nowa rozmowa" button
 *  - "context" : context type selector (PROCESS / SESSION / GENERAL)
 *  - "chat"    : active conversation with streaming messages
 *
 * Auto-close on exit: when the component unmounts, the active conversation
 * (if any) is archived via a keepalive fetch. Empty conversations are deleted
 * by the archive endpoint.
 */

import { useState, useEffect, useRef, useCallback } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  Loader2, Send, ArrowLeft, Plus, MessageSquare, Calendar, Gem,
  Target, Sparkles, ClipboardList, BookOpen, CheckCircle2, AlertCircle,
  ChevronRight, ArrowDown,
} from "lucide-react";
import { MentorMark } from "@/components/ui/mentor-mark";
import { Button } from "@/components/ui/button";
import { cn, formatDateTime } from "@/lib/utils";
import { useToast } from "@/components/ui/use-toast";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Conversation {
  id: string;
  title: string;
  contextType: string;
  status: string;
  lastMessageAt: string | null;
  createdAt: string;
  _count: { messages: number };
}

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: string;
}

export interface CompletedSession {
  id: string;
  scheduledAt: string;
  sessionNumber: number;
}

export interface PlannedSession {
  id: string;
  scheduledAt: string;
  sessionNumber: number;
}

export interface MentorAIPanelProps {
  clientId: string;
  clientName: string;
  completedSessions: CompletedSession[];
  /** All future planned sessions, sorted earliest-first */
  plannedSessions: PlannedSession[];
  aiEnabled: boolean;
  /** Set when accessed from the session page */
  fromSessionId?: string;
  /** Status of the session this panel was opened from */
  fromSessionStatus?: string;
  /** Auto-open a specific conversation (deep-link from Notatnik) */
  initialConversationId?: string;
}

type PanelView = "list" | "context" | "chat";
type ContextType = "PROCESS" | "SESSION" | "GENERAL";

// ─── Helpers ─────────────────────────────────────────────────────────────────

const CONTEXT_TYPE_LABELS: Record<string, string> = {
  PROCESS: "Cały proces",
  SESSION: "Sesja",
  GENERAL: "Ogólne",
};

const CONTEXT_TYPE_COLORS: Record<string, string> = {
  PROCESS: "bg-blue-50 text-blue-700 dark:bg-blue-950/30 dark:text-blue-300",
  SESSION: "bg-violet-50 text-violet-700 dark:bg-violet-950/30 dark:text-violet-300",
  GENERAL: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400",
};

function buildQuickPrompt(label: string, contextType: string, clientName: string): string {
  switch (label) {
    case "Ogólna refleksja":
      if (contextType === "SESSION") {
        return `Proszę o ogólną refleksję superwizyjną na temat tej sesji. Jakie wzorce widzisz? Co warto pogłębić lub zmienić w moim podejściu?`;
      }
      return `Proszę o ogólną refleksję superwizyjną dotyczącą procesu z klientem ${clientName}. Jakie wzorce widzisz w dotychczasowych sesjach? Co warto pogłębić lub zmienić?`;
    case "Feedback dla coacha":
      if (contextType === "SESSION") {
        return `Proszę o konstruktywny feedback dotyczący tej sesji. Co zadziałało dobrze? Co mogłem zrobić inaczej? Jakie były momenty, gdzie mogłem działać bardziej coachingowo?`;
      }
      return `Proszę o konstruktywny feedback dotyczący mojej pracy z klientem ${clientName}. Co robię dobrze, co mogę poprawić i gdzie mogłem działać inaczej?`;
    default:
      return label;
  }
}

function formatRelativeDate(dateStr: string | null): string {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffDays = Math.floor(diffMs / 86400000);
  if (diffDays === 0) return "Dzisiaj";
  if (diffDays === 1) return "Wczoraj";
  if (diffDays < 7) return `${diffDays} dni temu`;
  return d.toLocaleDateString("pl-PL", { day: "numeric", month: "short" });
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function MentorAIPanel({
  clientId,
  clientName,
  completedSessions,
  plannedSessions,
  aiEnabled,
  fromSessionId,
  fromSessionStatus,
  initialConversationId,
}: MentorAIPanelProps) {
  const { toast } = useToast();

  const [panelView, setPanelView] = useState<PanelView>("list");
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loadingList, setLoadingList] = useState(true);

  // Context selection
  const [selectedContextType, setSelectedContextType] = useState<ContextType | null>(null);
  const [selectedSessionId, setSelectedSessionId] = useState<string>("");
  const [creatingConv, setCreatingConv] = useState(false);

  // Chat state
  const [activeConversation, setActiveConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [chatInput, setChatInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingContent, setStreamingContent] = useState("");
  const [pendingUserContent, setPendingUserContent] = useState("");

  // Scroll behavior
  const [userScrolledUp, setUserScrolledUp] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Message actions
  const [addingToPlan, setAddingToPlan] = useState<string | null>(null);
  const [addingToNote, setAddingToNote] = useState<string | null>(null);

  // Session picker (for "Dodaj do Planu Sesji" message action)
  const [sessionPickerMsgId, setSessionPickerMsgId] = useState<string | null>(null);
  // Session picker (for "Pomóż zaplanować sesję" quick action)
  const [planPromptPickerOpen, setPlanPromptPickerOpen] = useState(false);

  const chatBottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const activeConvRef = useRef<string | null>(null);

  // Keep ref in sync so cleanup can access latest value
  useEffect(() => {
    activeConvRef.current = activeConversation?.id ?? null;
  }, [activeConversation]);

  // Auto-archive on unmount
  useEffect(() => {
    return () => {
      if (activeConvRef.current) {
        fetch(`/api/mentor/conversations/${activeConvRef.current}/archive`, {
          method: "POST",
          keepalive: true,
        }).catch(() => {});
      }
    };
  }, []);

  // Fetch conversation list
  const fetchConversations = useCallback(async () => {
    setLoadingList(true);
    try {
      const res = await fetch(`/api/mentor/conversations?clientId=${clientId}`);
      if (res.ok) {
        const data = await res.json();
        setConversations(data);
        return data as Conversation[];
      }
    } finally {
      setLoadingList(false);
    }
    return [] as Conversation[];
  }, [clientId]);

  // Open a specific conversation on mount if initialConversationId is provided
  const openConversation = useCallback(async (conv: Conversation) => {
    setActiveConversation(conv);
    setMessages([]);
    setStreamingContent("");
    setUserScrolledUp(false);
    setPanelView("chat");
    setLoadingMessages(true);
    try {
      const res = await fetch(`/api/mentor/conversations/${conv.id}/messages`);
      if (res.ok) {
        const data = await res.json();
        setMessages(data);
      }
    } finally {
      setLoadingMessages(false);
    }
  }, []);

  useEffect(() => {
    fetchConversations().then((convList) => {
      if (initialConversationId && convList.length > 0) {
        const target = convList.find((c) => c.id === initialConversationId);
        if (target) openConversation(target);
      }
    });
  }, [fetchConversations, initialConversationId, openConversation]);

  // Scroll behavior: auto-scroll only when user is at bottom
  const handleScroll = useCallback(() => {
    const el = scrollContainerRef.current;
    if (!el) return;
    const distFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    setUserScrolledUp(distFromBottom > 50);
  }, []);

  useEffect(() => {
    if (!userScrolledUp) {
      chatBottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, streamingContent, userScrolledUp]);

  // ─── Conversation management ────────────────────────────────────────────────

  const createConversation = useCallback(async (contextType: ContextType, contextSessionId?: string) => {
    setCreatingConv(true);
    try {
      const body: Record<string, string> = { clientId, contextType };
      if (contextSessionId) body.contextSessionId = contextSessionId;

      const res = await fetch("/api/mentor/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const err = await res.json();
        toast({ title: "Błąd tworzenia rozmowy", description: err.error, variant: "destructive" });
        return;
      }
      const conv = await res.json();
      await openConversation({ ...conv, _count: { messages: 0 } });
    } finally {
      setCreatingConv(false);
    }
  }, [clientId, toast, openConversation]);

  const archiveConversation = useCallback(async () => {
    if (!activeConversation) return;
    await fetch(`/api/mentor/conversations/${activeConversation.id}/archive`, { method: "POST" });
    activeConvRef.current = null;
    setActiveConversation(null);
    setMessages([]);
    setStreamingContent("");
    setPanelView("list");
    fetchConversations();
  }, [activeConversation, fetchConversations]);

  // ─── Streaming send ─────────────────────────────────────────────────────────

  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim() || isStreaming || !activeConversation || !aiEnabled) return;

    const trimmedText = text.trim();
    setPendingUserContent(trimmedText);
    setChatInput("");
    setIsStreaming(true);
    setStreamingContent("");

    if (textareaRef.current) textareaRef.current.style.height = "auto";

    try {
      const res = await fetch(`/api/mentor/conversations/${activeConversation.id}/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: trimmedText }),
      });

      if (res.status === 503) {
        toast({ title: "AI niedostępne", description: "Brak klucza OPENAI_API_KEY.", variant: "destructive" });
        setIsStreaming(false);
        setPendingUserContent("");
        return;
      }

      if (!res.ok || !res.body) {
        const errText = await res.text().catch(() => "Nieznany błąd");
        toast({ title: "Błąd AI", description: errText, variant: "destructive" });
        setIsStreaming(false);
        setPendingUserContent("");
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let accumulated = "";
      let finalUserMsgId = `user-${Date.now()}`;
      let finalAssistantMsgId: string | null = null;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const events = buffer.split("\n\n");
        buffer = events.pop() ?? "";

        for (const event of events) {
          if (!event.startsWith("data: ")) continue;
          try {
            const data = JSON.parse(event.slice(6)) as {
              delta?: string;
              done?: boolean;
              messageId?: string;
              userMessageId?: string;
              error?: string;
            };

            if (data.error) {
              toast({ title: "Błąd AI", description: data.error, variant: "destructive" });
              setIsStreaming(false);
              setPendingUserContent("");
              return;
            }

            if (data.delta) {
              accumulated += data.delta;
              setStreamingContent(accumulated);
            }

            if (data.done) {
              finalAssistantMsgId = data.messageId ?? null;
              if (data.userMessageId) finalUserMsgId = data.userMessageId;
            }
          } catch {
            // ignore malformed SSE lines
          }
        }
      }

      // Finalize: replace streaming state with persisted messages
      setMessages((prev) => [
        ...prev,
        {
          id: finalUserMsgId,
          role: "user" as const,
          content: trimmedText,
          createdAt: new Date().toISOString(),
        },
        {
          id: finalAssistantMsgId ?? `assistant-${Date.now()}`,
          role: "assistant" as const,
          content: accumulated || "Nie udało się wygenerować odpowiedzi.",
          createdAt: new Date().toISOString(),
        },
      ]);
    } catch {
      toast({ title: "Błąd połączenia", variant: "destructive" });
    } finally {
      setIsStreaming(false);
      setPendingUserContent("");
      setStreamingContent("");
    }
  }, [activeConversation, aiEnabled, isStreaming, toast]);

  // ─── Message actions ────────────────────────────────────────────────────────

  const doAddToPlan = useCallback(async (messageId: string, sessionId: string) => {
    setAddingToPlan(messageId);
    setSessionPickerMsgId(null);
    try {
      const res = await fetch(`/api/mentor/messages/${messageId}/add-to-plan`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId }),
      });
      if (res.ok) {
        const data = await res.json();
        const date = data.sessionScheduledAt
          ? new Date(data.sessionScheduledAt).toLocaleDateString("pl-PL", { day: "numeric", month: "long" })
          : "";
        toast({ title: "Dodano do Planu Sesji", description: date ? `Sesja: ${date}` : undefined });
      } else {
        const err = await res.json();
        toast({
          title: err.noSession ? "Brak zaplanowanej sesji" : "Błąd",
          description: err.error,
          variant: "destructive",
        });
      }
    } catch {
      toast({ title: "Błąd połączenia", variant: "destructive" });
    } finally {
      setAddingToPlan(null);
    }
  }, [toast]);

  const handleAddToPlan = useCallback((messageId: string) => {
    if (plannedSessions.length === 0) {
      toast({
        title: "Brak zaplanowanej sesji",
        description: "Dodaj sesję do kalendarza, aby zaplanować jej przebieg.",
        variant: "destructive",
      });
      return;
    }
    if (plannedSessions.length === 1) {
      doAddToPlan(messageId, plannedSessions[0].id);
      return;
    }
    // Multiple planned sessions — show picker
    setSessionPickerMsgId(messageId);
  }, [plannedSessions, doAddToPlan, toast]);

  const handleAddToNotebook = useCallback(async (messageId: string) => {
    setAddingToNote(messageId);
    try {
      const res = await fetch(`/api/mentor/messages/${messageId}/add-to-notebook`, { method: "POST" });
      if (res.ok) {
        toast({ title: "Zapisano do Notatnika" });
      } else {
        const err = await res.json();
        toast({ title: "Błąd zapisu", description: err.error, variant: "destructive" });
      }
    } catch {
      toast({ title: "Błąd połączenia", variant: "destructive" });
    } finally {
      setAddingToNote(null);
    }
  }, [toast]);

  // ─── Views ───────────────────────────────────────────────────────────────────

  // Whether SESSION context option should be shown
  const showSessionContext =
    !fromSessionStatus || fromSessionStatus === "Odbyta" || completedSessions.length > 0;
  const allowSessionContext =
    completedSessions.length > 0 &&
    (!fromSessionStatus || fromSessionStatus === "Odbyta");

  // ── LIST VIEW ───────────────────────────────────────────────────────────────
  if (panelView === "list") {
    return (
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="relative overflow-hidden shrink-0 header-gradient">
          <div className="absolute -top-6 -right-6 w-36 h-36 rounded-full bg-white/20 blur-2xl pointer-events-none" />
          <div className="absolute bottom-0 -left-4 w-28 h-28 rounded-full bg-blue-300/20 blur-2xl pointer-events-none" />
          <div className="relative z-10 pl-5 pr-14 pt-4 pb-4">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-white/20 border border-white/30 shadow-sm flex items-center justify-center shrink-0">
                  <MentorMark className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="text-base font-semibold text-white leading-tight">Mentor AI</p>
                  <p className="text-xs text-white/70">Superwizja i refleksja</p>
                </div>
              </div>
              <button
                onClick={() => setPanelView("context")}
                disabled={!aiEnabled}
                className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-xl bg-white/20 border border-white/30 text-white hover:bg-white/30 transition-colors disabled:opacity-50"
              >
                <Plus className="w-3.5 h-3.5" />
                Nowa rozmowa
              </button>
            </div>
          </div>
        </div>

        {/* Session shortcut (when accessed from a completed session) */}
        {fromSessionId && fromSessionStatus === "Odbyta" && (
          <div className="px-4 pt-3">
            <button
              onClick={() => createConversation("SESSION", fromSessionId)}
              disabled={!aiEnabled || creatingConv}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-violet-50 dark:bg-violet-950/20 border border-violet-200 dark:border-violet-800 hover:bg-violet-100 dark:hover:bg-violet-950/40 transition-colors text-left"
            >
              {creatingConv ? (
                <Loader2 className="w-4 h-4 text-violet-500 animate-spin shrink-0" />
              ) : (
                <Sparkles className="w-4 h-4 text-violet-500 shrink-0" />
              )}
              <div>
                <p className="text-sm font-medium text-violet-700 dark:text-violet-300">
                  Nowa rozmowa w kontekście tej sesji
                </p>
                <p className="text-xs text-violet-500 dark:text-violet-400 mt-0.5">
                  Sesja zostanie automatycznie wybrana jako kontekst
                </p>
              </div>
            </button>
          </div>
        )}

        {/* Conversation list */}
        <div className="flex-1 overflow-y-auto px-4 py-3 panel-bg space-y-2">
          {loadingList ? (
            <div className="flex justify-center items-center py-10">
              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
            </div>
          ) : conversations.length === 0 ? (
            <div className="flex flex-col items-center justify-center text-center py-12 gap-3">
              <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-950/30 flex items-center justify-center">
                <MessageSquare className="w-6 h-6 text-blue-400 dark:text-blue-500" />
              </div>
              <div>
                <p className="font-medium text-sm text-foreground">Brak rozmów</p>
                <p className="text-xs text-muted-foreground mt-1 max-w-[200px] leading-relaxed">
                  Kliknij &ldquo;Nowa rozmowa&rdquo;, aby zacząć sesję superwizyjną.
                </p>
              </div>
            </div>
          ) : (
            conversations.map((conv) => (
              <button
                key={conv.id}
                onClick={() => openConversation(conv)}
                className="w-full flex items-center gap-3 px-3 py-3 rounded-xl bg-white dark:bg-card border border-slate-200 dark:border-slate-700 hover:border-blue-200 dark:hover:border-slate-600 hover:shadow-sm transition-all text-left"
              >
                <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0">
                  <MessageSquare className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{conv.title}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className={cn("text-xs px-1.5 py-0.5 rounded-full font-medium", CONTEXT_TYPE_COLORS[conv.contextType])}>
                      {CONTEXT_TYPE_LABELS[conv.contextType] ?? conv.contextType}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {conv._count.messages} wiad.
                    </span>
                    {conv.lastMessageAt && (
                      <span className="text-xs text-muted-foreground">
                        · {formatRelativeDate(conv.lastMessageAt)}
                      </span>
                    )}
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
              </button>
            ))
          )}
        </div>
      </div>
    );
  }

  // ── CONTEXT SELECTOR VIEW ───────────────────────────────────────────────────
  if (panelView === "context") {
    return (
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="relative overflow-hidden shrink-0 header-gradient">
          <div className="absolute -top-6 -right-6 w-36 h-36 rounded-full bg-white/20 blur-2xl pointer-events-none" />
          <div className="relative z-10 pl-5 pr-14 pt-4 pb-4">
            <button
              onClick={() => { setPanelView("list"); setSelectedContextType(null); setSelectedSessionId(""); }}
              className="flex items-center gap-1.5 text-xs text-white/80 hover:text-white mb-3 transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Wróć
            </button>
            <p className="text-base font-semibold text-white">Wybierz kontekst rozmowy</p>
            <p className="text-xs text-white/70 mt-0.5">
              Kontekst określa, jakie informacje Mentor AI zobaczy podczas naszej rozmowy.
            </p>
          </div>
        </div>

        {/* Options */}
        <div className="flex-1 overflow-y-auto px-4 py-4 panel-bg space-y-3">
          {/* PROCESS */}
          <button
            onClick={() => setSelectedContextType("PROCESS")}
            className={cn(
              "w-full flex items-start gap-3 p-4 rounded-xl border transition-all text-left",
              selectedContextType === "PROCESS"
                ? "border-blue-400 bg-blue-50 dark:bg-blue-950/30 dark:border-blue-600"
                : "border-slate-200 dark:border-slate-700 bg-white dark:bg-card hover:border-blue-200 hover:bg-blue-50/50"
            )}
          >
            <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5", selectedContextType === "PROCESS" ? "bg-blue-100 dark:bg-blue-900/50" : "bg-slate-100 dark:bg-slate-800")}>
              <Gem className={cn("w-4.5 h-4.5", selectedContextType === "PROCESS" ? "text-blue-600 dark:text-blue-400" : "text-slate-500")} />
            </div>
            <div>
              <p className={cn("text-sm font-semibold", selectedContextType === "PROCESS" ? "text-blue-700 dark:text-blue-300" : "text-foreground")}>
                Cały proces
              </p>
              <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                Pełen kontekst procesu z {clientName}: historia sesji, notatki, wyniki. Idealne do refleksji i planowania.
              </p>
            </div>
          </button>

          {/* SESSION */}
          {showSessionContext && (
            <button
              onClick={() => allowSessionContext ? setSelectedContextType("SESSION") : undefined}
              disabled={!allowSessionContext}
              className={cn(
                "w-full flex items-start gap-3 p-4 rounded-xl border transition-all text-left",
                !allowSessionContext && "opacity-50 cursor-not-allowed",
                selectedContextType === "SESSION"
                  ? "border-violet-400 bg-violet-50 dark:bg-violet-950/30 dark:border-violet-600"
                  : allowSessionContext
                    ? "border-slate-200 dark:border-slate-700 bg-white dark:bg-card hover:border-violet-200 hover:bg-violet-50/50"
                    : "border-slate-200 dark:border-slate-700 bg-white dark:bg-card"
              )}
            >
              <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5", selectedContextType === "SESSION" ? "bg-violet-100 dark:bg-violet-900/50" : "bg-slate-100 dark:bg-slate-800")}>
                <Calendar className={cn("w-4.5 h-4.5", selectedContextType === "SESSION" ? "text-violet-600 dark:text-violet-400" : "text-slate-500")} />
              </div>
              <div className="flex-1">
                <p className={cn("text-sm font-semibold", selectedContextType === "SESSION" ? "text-violet-700 dark:text-violet-300" : "text-foreground")}>
                  Konkretna sesja
                </p>
                <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                  {allowSessionContext
                    ? "Skupiona refleksja na wybranej, zakończonej sesji."
                    : "Brak odbytych sesji do wyboru."}
                </p>

                {/* Session picker */}
                {selectedContextType === "SESSION" && allowSessionContext && (
                  <div className="mt-3">
                    <select
                      value={selectedSessionId}
                      onChange={(e) => setSelectedSessionId(e.target.value)}
                      className="w-full text-xs border border-violet-200 dark:border-violet-700 rounded-lg px-2.5 py-1.5 bg-white dark:bg-slate-800 text-foreground focus:outline-none focus:ring-1 focus:ring-violet-400"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <option value="">— Wybierz sesję —</option>
                      {completedSessions.map((s) => (
                        <option key={s.id} value={s.id}>
                          Sesja {s.sessionNumber} · {new Date(s.scheduledAt).toLocaleDateString("pl-PL", { day: "numeric", month: "long", year: "numeric" })}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            </button>
          )}

          {/* GENERAL */}
          <button
            onClick={() => setSelectedContextType("GENERAL")}
            className={cn(
              "w-full flex items-start gap-3 p-4 rounded-xl border transition-all text-left",
              selectedContextType === "GENERAL"
                ? "border-slate-400 bg-slate-100 dark:bg-slate-800 dark:border-slate-600"
                : "border-slate-200 dark:border-slate-700 bg-white dark:bg-card hover:border-slate-300 hover:bg-slate-50"
            )}
          >
            <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5", selectedContextType === "GENERAL" ? "bg-slate-200 dark:bg-slate-700" : "bg-slate-100 dark:bg-slate-800")}>
              <MessageSquare className={cn("w-4.5 h-4.5", selectedContextType === "GENERAL" ? "text-slate-700 dark:text-slate-300" : "text-slate-500")} />
            </div>
            <div>
              <p className={cn("text-sm font-semibold", selectedContextType === "GENERAL" ? "text-slate-700 dark:text-slate-300" : "text-foreground")}>
                Ogólne pytanie o coaching
              </p>
              <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                Pytanie niezwiązane z konkretnym klientem. Brak danych klienta — tylko wiedza mentorska.
              </p>
            </div>
          </button>

          {/* Confirm button */}
          <Button
            className="w-full mt-2"
            disabled={
              !selectedContextType ||
              creatingConv ||
              (selectedContextType === "SESSION" && !selectedSessionId)
            }
            onClick={() => {
              if (!selectedContextType) return;
              createConversation(
                selectedContextType,
                selectedContextType === "SESSION" ? selectedSessionId : undefined
              );
            }}
          >
            {creatingConv ? (
              <><Loader2 className="w-4 h-4 animate-spin" />Tworzenie rozmowy…</>
            ) : (
              <>Rozpocznij rozmowę</>
            )}
          </Button>
        </div>
      </div>
    );
  }

  // ── CHAT VIEW ───────────────────────────────────────────────────────────────

  const conv = activeConversation;
  if (!conv) return null;

  const quickActions = [
    { label: "Ogólna refleksja", icon: <Gem className="w-3.5 h-3.5" />, color: "text-[#224cc0] dark:text-white/90", hover: "hover:bg-[#224cc0]/15 hover:border-[#224cc0]/35 dark:hover:bg-white/15 dark:hover:border-white/25" },
    { label: "Feedback dla coacha", icon: <Target className="w-3.5 h-3.5" />, color: "text-[#D28B4C] dark:text-white/90", hover: "hover:bg-[#D28B4C]/15 hover:border-[#D28B4C]/40 dark:hover:bg-white/15 dark:hover:border-white/25" },
    { label: "Pomóż zaplanować sesję", icon: <Sparkles className="w-3.5 h-3.5" />, color: "text-[#8A66BC] dark:text-white/90", hover: "hover:bg-[#8A66BC]/15 hover:border-[#8A66BC]/40 dark:hover:bg-white/15 dark:hover:border-white/25" },
  ];

  return (
    <div className="flex flex-col h-full relative">
      {/* Chat header */}
      <div className="relative overflow-hidden shrink-0 header-gradient">
        <div className="absolute -top-6 -right-6 w-36 h-36 rounded-full bg-white/20 blur-2xl pointer-events-none" />
        <div className="absolute bottom-0 -left-4 w-28 h-28 rounded-full bg-blue-300/20 blur-2xl pointer-events-none" />
        <div className="relative z-10 px-4 pt-3 pb-2">
          {/* Top row: back + title + close — pr-10 avoids overlap with Sheet's close X button */}
          <div className="flex items-start justify-between gap-2 pr-10">
            <button
              onClick={() => {
                activeConvRef.current = null; // prevent auto-archive on unmount
                setActiveConversation(null);
                setMessages([]);
                setStreamingContent("");
                setPanelView("list");
                fetchConversations();
              }}
              className="flex items-center gap-1 text-xs text-white/80 hover:text-white transition-colors mt-0.5 shrink-0"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Rozmowy
            </button>
            <div className="flex-1 min-w-0 text-center px-2">
              <p className="text-sm font-semibold text-white truncate leading-tight">{conv.title}</p>
              <span className={cn("inline-block text-xs px-1.5 py-0.5 rounded-full font-medium mt-0.5 bg-white/20 text-white/90")}>
                {CONTEXT_TYPE_LABELS[conv.contextType] ?? conv.contextType}
              </span>
            </div>
            <button
              onClick={archiveConversation}
              className="flex items-center gap-1 text-xs text-white/70 hover:text-white transition-colors mt-0.5 shrink-0"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              Zakończ
            </button>
          </div>

          {/* Quick actions */}
          <div className="flex gap-2 mt-2.5 pb-1">
            {quickActions.map((qa) => (
              <button
                key={qa.label}
                disabled={isStreaming || !aiEnabled}
                onClick={() => {
                  if (qa.label === "Pomóż zaplanować sesję") {
                    if (plannedSessions.length === 0) {
                      toast({
                        title: "Brak zaplanowanej sesji",
                        description: "Dodaj sesję do kalendarza, aby zaplanować jej przebieg.",
                        variant: "destructive",
                      });
                      return;
                    }
                    if (plannedSessions.length === 1) {
                      const s = plannedSessions[0];
                      const dateStr = new Date(s.scheduledAt).toLocaleDateString("pl-PL", { day: "numeric", month: "long" });
                      sendMessage(`Pomóż mi zaplanować sesję ${s.sessionNumber} z klientem ${clientName} (zaplanowaną na ${dateStr}). Zaproponuj konkretny cel sesji wynikający z historii procesu, strukturę z orientacyjnym czasem, 2–3 techniki lub narzędzia coachingowe oraz 4–6 gotowych pytań do bezpośredniego użycia na sesji.`);
                      return;
                    }
                    // Multiple planned sessions — show picker
                    setPlanPromptPickerOpen(true);
                  } else {
                    sendMessage(buildQuickPrompt(qa.label, conv.contextType, clientName));
                  }
                }}
                className={cn(
                  "flex-1 flex flex-col items-center justify-center gap-1 py-2 px-1 rounded-xl text-xs font-medium",
                  "bg-white/85 border border-transparent dark:bg-white/10 dark:border-white/20 shadow-sm transition-all",
                  qa.color, qa.hover,
                  "disabled:opacity-50 disabled:cursor-not-allowed"
                )}
              >
                {qa.icon}
                <span className="leading-tight text-center text-[10px]">{qa.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Messages */}
      <div
        ref={scrollContainerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto px-4 py-3 space-y-4 panel-bg relative"
      >
        {loadingMessages ? (
          <div className="flex justify-center items-center py-10">
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            {messages.length === 0 && !isStreaming && (
              <div className="flex flex-col items-center justify-center h-full text-center gap-3 py-10">
                <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-950/30 flex items-center justify-center">
                  <MentorMark className="w-6 h-6 text-blue-400 dark:text-blue-500" />
                </div>
                <div>
                  <p className="font-medium text-sm text-foreground">Gotowy do rozmowy</p>
                  <p className="text-xs text-muted-foreground mt-1 max-w-[200px] leading-relaxed">
                    Zadaj pytanie lub użyj szybkich akcji powyżej.
                  </p>
                </div>
              </div>
            )}

            {messages.map((msg) => (
              <div key={msg.id} className={cn("flex gap-2", msg.role === "user" ? "justify-end" : "justify-start")}>
                {msg.role === "assistant" && (
                  <div className="w-7 h-7 rounded-full bg-[#85b5f7] flex items-center justify-center shrink-0 mt-0.5">
                    <MentorMark className="w-3.5 h-3.5 text-white" />
                  </div>
                )}
                <div className="max-w-[85%]">
                  {msg.role === "user" ? (
                    <div className="bg-gradient-to-br from-[#7aaef5] via-[#5a8ae8] to-[#3d6fd4] text-white rounded-3xl rounded-br-md px-4 py-2.5 text-sm">
                      <p className="whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                    </div>
                  ) : (
                    <div>
                      <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm rounded-2xl rounded-tl-sm px-3.5 py-2.5 text-sm text-foreground">
                        <div className="prose-coach">
                          <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.content}</ReactMarkdown>
                        </div>
                      </div>
                      {/* Message actions */}
                      <div className="flex gap-1.5 mt-1.5 ml-1">
                        <button
                          onClick={() => handleAddToPlan(msg.id)}
                          disabled={addingToPlan === msg.id}
                          className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-blue-600 dark:hover:text-blue-400 transition-colors px-2 py-1 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-950/20"
                        >
                          {addingToPlan === msg.id
                            ? <Loader2 className="w-3 h-3 animate-spin" />
                            : <ClipboardList className="w-3 h-3" />
                          }
                          Dodaj do Planu Sesji
                        </button>
                        <button
                          onClick={() => handleAddToNotebook(msg.id)}
                          disabled={addingToNote === msg.id}
                          className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors px-2 py-1 rounded-lg hover:bg-emerald-50 dark:hover:bg-emerald-950/20"
                        >
                          {addingToNote === msg.id
                            ? <Loader2 className="w-3 h-3 animate-spin" />
                            : <BookOpen className="w-3 h-3" />
                          }
                          Do Notatnika
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}

            {/* Pending user message (optimistic) */}
            {isStreaming && pendingUserContent && (
              <div className="flex gap-2 justify-end">
                <div className="max-w-[85%]">
                  <div className="bg-gradient-to-br from-[#7aaef5] via-[#5a8ae8] to-[#3d6fd4] text-white rounded-3xl rounded-br-md px-4 py-2.5 text-sm">
                    <p className="whitespace-pre-wrap leading-relaxed">{pendingUserContent}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Streaming assistant message */}
            {isStreaming && (
              <div className="flex gap-2 justify-start">
                <div className="w-7 h-7 rounded-full bg-[#85b5f7] flex items-center justify-center shrink-0 mt-0.5">
                  <MentorMark className="w-3.5 h-3.5 text-white" />
                </div>
                <div className="max-w-[85%]">
                  <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm rounded-2xl rounded-tl-sm px-3.5 py-2.5 text-sm text-foreground">
                    {streamingContent ? (
                      <div className="prose-coach">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>{streamingContent}</ReactMarkdown>
                      </div>
                    ) : (
                      <div className="flex gap-1 items-center h-5">
                        <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce [animation-delay:0ms]" />
                        <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce [animation-delay:150ms]" />
                        <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce [animation-delay:300ms]" />
                      </div>
                    )}
                    {streamingContent && (
                      <span className="inline-block w-1.5 h-4 bg-blue-500/80 ml-0.5 animate-pulse align-middle" />
                    )}
                  </div>
                  {isStreaming && streamingContent && (
                    <p className="text-[10px] text-muted-foreground mt-1 ml-1">Mentor AI pisze…</p>
                  )}
                </div>
              </div>
            )}
          </>
        )}

        {!aiEnabled && (
          <div className="flex items-center gap-1.5 text-xs text-amber-700 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg px-3 py-2 mx-2">
            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
            AI niedostępne – brak klucza OPENAI_API_KEY.
          </div>
        )}

        <div ref={chatBottomRef} />
      </div>

      {/* Scroll-to-bottom button — shown when user scrolled up during streaming */}
      {userScrolledUp && isStreaming && (
        <div className="absolute bottom-[72px] left-1/2 -translate-x-1/2 z-10 pointer-events-none w-full flex justify-center">
          <button
            onClick={() => {
              setUserScrolledUp(false);
              chatBottomRef.current?.scrollIntoView({ behavior: "smooth" });
            }}
            className="pointer-events-auto flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full bg-blue-600 text-white shadow-lg hover:bg-blue-700 transition-colors"
          >
            <ArrowDown className="w-3 h-3" />
            Przejdź do najnowszej wiadomości
          </button>
        </div>
      )}

      {/* Input */}
      <div className="border-t px-3 pt-3 pb-3 shrink-0 bg-white dark:bg-card">
        <div className="flex items-end gap-2 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-2xl px-3 py-2 shadow-sm">
          <textarea
            ref={textareaRef}
            className="flex-1 resize-none bg-transparent text-sm focus:outline-none min-h-[36px] max-h-[120px] py-1 text-foreground placeholder:text-muted-foreground"
            placeholder={aiEnabled ? "Napisz do Mentora AI..." : "AI niedostępne"}
            value={chatInput}
            disabled={!aiEnabled || isStreaming}
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
          <Button
            size="sm"
            className="h-8 w-8 p-0 rounded-xl bg-blue-600 hover:bg-blue-700 border-0 shrink-0 mb-0.5"
            onClick={() => sendMessage(chatInput)}
            disabled={!chatInput.trim() || isStreaming || !aiEnabled}
          >
            {isStreaming ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </Button>
        </div>
        <p className="text-xs text-muted-foreground mt-1.5 ml-1">Enter – wyślij · Shift+Enter – nowa linia</p>
      </div>

      {/* Session picker modal — for "Dodaj do Planu Sesji" message action */}
      <Dialog open={sessionPickerMsgId !== null} onOpenChange={(open) => { if (!open) setSessionPickerMsgId(null); }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Wybierz sesję, do której dodać Plan Sesji</DialogTitle>
          </DialogHeader>
          <div className="space-y-2 py-2">
            {plannedSessions.map((s) => (
              <button
                key={s.id}
                onClick={() => sessionPickerMsgId && doAddToPlan(sessionPickerMsgId, s.id)}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/20 transition-colors text-left"
              >
                <Calendar className="w-4 h-4 text-blue-500 shrink-0" />
                <div>
                  <p className="text-sm font-medium">Sesja {s.sessionNumber}</p>
                  <p className="text-xs text-muted-foreground">{formatDateTime(s.scheduledAt)}</p>
                </div>
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* Session picker modal — for "Pomóż zaplanować sesję" quick action */}
      <Dialog open={planPromptPickerOpen} onOpenChange={setPlanPromptPickerOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Wybierz sesję do zaplanowania</DialogTitle>
          </DialogHeader>
          <div className="space-y-2 py-2">
            {plannedSessions.map((s) => (
              <button
                key={s.id}
                onClick={() => {
                  setPlanPromptPickerOpen(false);
                  const dateStr = new Date(s.scheduledAt).toLocaleDateString("pl-PL", { day: "numeric", month: "long" });
                  sendMessage(`Pomóż mi zaplanować sesję ${s.sessionNumber} z klientem ${clientName} (zaplanowaną na ${dateStr}). Zaproponuj konkretny cel sesji wynikający z historii procesu, strukturę z orientacyjnym czasem, 2–3 techniki lub narzędzia coachingowe oraz 4–6 gotowych pytań do bezpośredniego użycia na sesji.`);
                }}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/20 transition-colors text-left"
              >
                <Calendar className="w-4 h-4 text-blue-500 shrink-0" />
                <div>
                  <p className="text-sm font-medium">Sesja {s.sessionNumber}</p>
                  <p className="text-xs text-muted-foreground">{formatDateTime(s.scheduledAt)}</p>
                </div>
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
