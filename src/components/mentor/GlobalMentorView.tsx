"use client";
/**
 * GlobalMentorView — full-page Mentor AI workspace.
 *
 * Layout: left sidebar (conversation list, ~320px) + right pane (chat).
 *
 * New-conversation flow (modal, step-based):
 *   GENERAL  → create immediately (no client required)
 *   PROCESS  → pick client → create
 *   SESSION  → pick client → pick completed session → create
 *
 * "Dodaj do Planu Sesji" for GENERAL conversations (no clientId):
 *   → global picker: pick client → pick planned session → add
 */

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useSidebar } from "@/contexts/sidebar-context";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  Loader2, Send, Plus, MessageSquare, Calendar, Gem, Target, Sparkles,
  ClipboardList, BookOpen, CheckCircle2, AlertCircle, ChevronRight, ArrowDown,
  ArrowLeft, Users, Brain,
} from "lucide-react";
import { MentorMark } from "@/components/ui/mentor-mark";
import { Button } from "@/components/ui/button";
import { cn, formatDateTime } from "@/lib/utils";
import { useToast } from "@/components/ui/use-toast";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";

// ─── Types ───────────────────────────────────────────────────────────────────

interface GlobalConversation {
  id: string;
  title: string;
  contextType: string;
  status: string;
  lastMessageAt: string | null;
  createdAt: string;
  clientId: string | null;
  client: { id: string; name: string } | null;
  _count: { messages: number };
}

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: string;
}

interface ClientOption {
  id: string;
  name: string;
}

interface SessionOption {
  id: string;
  scheduledAt: string;
  sessionNumber: number;
}

export interface GlobalMentorViewProps {
  aiEnabled: boolean;
  initialConvId?: string;
}

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

function formatRelativeDate(dateStr: string | null): string {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  const diffDays = Math.floor((Date.now() - d.getTime()) / 86400000);
  if (diffDays === 0) return "Dzisiaj";
  if (diffDays === 1) return "Wczoraj";
  if (diffDays < 7) return `${diffDays} dni temu`;
  return d.toLocaleDateString("pl-PL", { day: "numeric", month: "short" });
}

async function parseApiError(res: Response): Promise<string> {
  try {
    const text = await res.text();
    if (!text) return `Błąd serwera (${res.status})`;
    const json = JSON.parse(text) as { error?: string };
    return json.error ?? text.slice(0, 200);
  } catch {
    return `Błąd serwera (${res.status})`;
  }
}

function buildQuickPrompt(label: string, contextType: string, clientName: string): string {
  switch (label) {
    case "Ogólna refleksja":
      if (contextType === "SESSION")
        return `Proszę o ogólną refleksję superwizyjną na temat tej sesji. Jakie wzorce widzisz? Co warto pogłębić lub zmienić w moim podejściu?`;
      if (contextType === "GENERAL")
        return `Proszę o ogólną refleksję superwizyjną dotyczącą mojej pracy coachingowej. Jakie wzorce mogą być ważne? Co warto pogłębić lub zmienić w moim podejściu?`;
      return `Proszę o ogólną refleksję superwizyjną dotyczącą procesu z klientem ${clientName}. Jakie wzorce widzisz w dotychczasowych sesjach? Co warto pogłębić lub zmienić?`;
    case "Feedback dla coacha":
      if (contextType === "SESSION")
        return `Proszę o konstruktywny feedback dotyczący tej sesji. Co zadziałało dobrze? Co mogłem zrobić inaczej?`;
      if (contextType === "GENERAL")
        return `Proszę o konstruktywny feedback dotyczący mojej pracy coachingowej. Co robię dobrze, co mogę poprawić?`;
      return `Proszę o konstruktywny feedback dotyczący mojej pracy z klientem ${clientName}. Co robię dobrze, co mogę poprawić?`;
    default:
      return label;
  }
}

// ─── Component ───────────────────────────────────────────────────────────────

export function GlobalMentorView({ aiEnabled, initialConvId }: GlobalMentorViewProps) {
  const { toast } = useToast();

  // Auto-collapse main sidebar for more horizontal space (same pattern as client view)
  const { setCollapsed } = useSidebar();
  useEffect(() => {
    const wasCollapsed = localStorage.getItem("sidebarCollapsed") === "true";
    if (!wasCollapsed) setCollapsed(true);
    return () => {
      if (!wasCollapsed) setCollapsed(false);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Conversation list ──────────────────────────────────────────────────────
  const [conversations, setConversations] = useState<GlobalConversation[]>([]);
  const [loadingList, setLoadingList] = useState(true);
  const [filterClientId, setFilterClientId] = useState(""); // "" = all, "__general__" = only GENERAL

  // ── Active conversation + messages ─────────────────────────────────────────
  const [activeConv, setActiveConv] = useState<GlobalConversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);

  // ── Planned sessions for the active conversation's client ──────────────────
  const [currentPlannedSessions, setCurrentPlannedSessions] = useState<SessionOption[]>([]);

  // ── Streaming ──────────────────────────────────────────────────────────────
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingContent, setStreamingContent] = useState("");
  const [pendingUserContent, setPendingUserContent] = useState("");
  const [chatInput, setChatInput] = useState("");
  const [userScrolledUp, setUserScrolledUp] = useState(false);

  // ── Message actions ────────────────────────────────────────────────────────
  const [addingToPlan, setAddingToPlan] = useState<string | null>(null);
  const [addingToNote, setAddingToNote] = useState<string | null>(null);

  // Session picker for bound conversations (has clientId)
  const [sessionPickerMsgId, setSessionPickerMsgId] = useState<string | null>(null);
  // Session picker for "Pomóż zaplanować sesję" on bound conversations
  const [planPromptPickerOpen, setPlanPromptPickerOpen] = useState(false);

  // ── New conversation modal ─────────────────────────────────────────────────
  const [newConvOpen, setNewConvOpen] = useState(false);
  type NewConvType = "PROCESS" | "SESSION" | "GENERAL";
  type NewConvStep = "type" | "client" | "session";
  const [newConvStep, setNewConvStep] = useState<NewConvStep>("type");
  const [newConvType, setNewConvType] = useState<NewConvType | null>(null);
  const [newConvClientId, setNewConvClientId] = useState("");
  const [newConvSessionId, setNewConvSessionId] = useState("");
  const [newConvClients, setNewConvClients] = useState<ClientOption[]>([]);
  const [newConvCompletedSessions, setNewConvCompletedSessions] = useState<SessionOption[]>([]);
  const [loadingNewConvData, setLoadingNewConvData] = useState(false);
  const [creatingConv, setCreatingConv] = useState(false);

  // ── Global picker: client+session for GENERAL conversations ───────────────
  // Handles both "Dodaj do Planu Sesji" and "Pomóż zaplanować sesję"
  type GlobalPickerAction =
    | { type: "add-to-plan"; messageId: string }
    | { type: "plan-prompt" };
  const [globalPickerAction, setGlobalPickerAction] = useState<GlobalPickerAction | null>(null);
  const [globalPickerStep, setGlobalPickerStep] = useState<"client" | "session">("client");
  const [globalPickerClients, setGlobalPickerClients] = useState<ClientOption[]>([]);
  const [globalPickerClientId, setGlobalPickerClientId] = useState("");
  const [globalPickerClientName, setGlobalPickerClientName] = useState("");
  const [globalPickerSessions, setGlobalPickerSessions] = useState<SessionOption[]>([]);
  const [loadingGlobalPickerSessions, setLoadingGlobalPickerSessions] = useState(false);

  // ── Refs ───────────────────────────────────────────────────────────────────
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const chatBottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const activeConvRef = useRef<string | null>(null);

  // ── Keep ref in sync ───────────────────────────────────────────────────────
  useEffect(() => {
    activeConvRef.current = activeConv?.id ?? null;
  }, [activeConv]);

  // ── Auto-archive on unmount ────────────────────────────────────────────────
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

  // ── Scroll behaviour ───────────────────────────────────────────────────────
  const handleScroll = useCallback(() => {
    const el = scrollContainerRef.current;
    if (!el) return;
    setUserScrolledUp(el.scrollHeight - el.scrollTop - el.clientHeight > 50);
  }, []);

  useEffect(() => {
    if (!userScrolledUp) chatBottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streamingContent, userScrolledUp]);

  // ── Data fetching ──────────────────────────────────────────────────────────
  const fetchConversations = useCallback(async () => {
    setLoadingList(true);
    try {
      const res = await fetch("/api/mentor/conversations");
      if (res.ok) {
        const data = await res.json();
        setConversations(data);
        return data as GlobalConversation[];
      }
    } finally {
      setLoadingList(false);
    }
    return [] as GlobalConversation[];
  }, []);

  const fetchClients = useCallback(async () => {
    const res = await fetch("/api/klienci");
    if (res.ok) {
      const data = await res.json() as Array<{ id: string; name: string }>;
      return data.map((c) => ({ id: c.id, name: c.name }));
    }
    return [] as ClientOption[];
  }, []);

  const fetchSessions = useCallback(async (clientId: string, type: "planned" | "completed") => {
    const res = await fetch(`/api/mentor/client-sessions?clientId=${clientId}&type=${type}`);
    if (res.ok) return await res.json() as SessionOption[];
    return [] as SessionOption[];
  }, []);

  // ── Open conversation ──────────────────────────────────────────────────────
  const openConversation = useCallback(async (conv: GlobalConversation) => {
    activeConvRef.current = null; // don't archive previous on switch
    setActiveConv(conv);
    setMessages([]);
    setStreamingContent("");
    setUserScrolledUp(false);
    setChatInput("");
    setCurrentPlannedSessions([]);
    setLoadingMessages(true);

    try {
      const res = await fetch(`/api/mentor/conversations/${conv.id}/messages`);
      if (res.ok) setMessages(await res.json());
    } finally {
      setLoadingMessages(false);
    }

    activeConvRef.current = conv.id;

    // Fetch planned sessions for bound conversations
    if (conv.clientId) {
      fetchSessions(conv.clientId, "planned").then(setCurrentPlannedSessions);
    }
  }, [fetchSessions]);

  // ── Initial load + deep-link ───────────────────────────────────────────────
  useEffect(() => {
    fetchConversations().then((list) => {
      if (initialConvId) {
        const target = list.find((c) => c.id === initialConvId);
        if (target) openConversation(target);
      }
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Create conversation ────────────────────────────────────────────────────
  const createConversation = useCallback(async () => {
    if (!newConvType) return;
    setCreatingConv(true);
    try {
      const body: Record<string, string> = { contextType: newConvType };
      if (newConvClientId) body.clientId = newConvClientId;
      if (newConvType === "SESSION" && newConvSessionId) body.contextSessionId = newConvSessionId;

      const res = await fetch("/api/mentor/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        toast({ title: "Błąd tworzenia rozmowy", description: await parseApiError(res), variant: "destructive" });
        return;
      }

      const conv = await res.json();
      setNewConvOpen(false);
      setNewConvStep("type");
      setNewConvType(null);
      setNewConvClientId("");
      setNewConvSessionId("");

      const list = await fetchConversations();
      const found = list.find((c) => c.id === conv.id);
      if (found) openConversation(found);
    } finally {
      setCreatingConv(false);
    }
  }, [newConvType, newConvClientId, newConvSessionId, toast, fetchConversations, openConversation]);

  // ── Archive ────────────────────────────────────────────────────────────────
  const archiveConversation = useCallback(async () => {
    if (!activeConv) return;
    await fetch(`/api/mentor/conversations/${activeConv.id}/archive`, { method: "POST" });
    activeConvRef.current = null;
    setActiveConv(null);
    setMessages([]);
    setStreamingContent("");
    setCurrentPlannedSessions([]);
    fetchConversations();
  }, [activeConv, fetchConversations]);

  // ── Streaming send ─────────────────────────────────────────────────────────
  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim() || isStreaming || !activeConv || !aiEnabled) return;

    const trimmedText = text.trim();
    setPendingUserContent(trimmedText);
    setChatInput("");
    setIsStreaming(true);
    setStreamingContent("");
    if (textareaRef.current) textareaRef.current.style.height = "auto";

    try {
      const res = await fetch(`/api/mentor/conversations/${activeConv.id}/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: trimmedText }),
      });

      if (res.status === 503) {
        toast({ title: "AI niedostępne", description: "Brak klucza OPENAI_API_KEY.", variant: "destructive" });
        setIsStreaming(false); setPendingUserContent(""); return;
      }
      if (!res.ok || !res.body) {
        const errText = await res.text().catch(() => "Nieznany błąd");
        toast({ title: "Błąd AI", description: errText, variant: "destructive" });
        setIsStreaming(false); setPendingUserContent(""); return;
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
              delta?: string; done?: boolean; messageId?: string; userMessageId?: string; error?: string;
            };
            if (data.error) {
              toast({ title: "Błąd AI", description: data.error, variant: "destructive" });
              setIsStreaming(false); setPendingUserContent(""); return;
            }
            if (data.delta) { accumulated += data.delta; setStreamingContent(accumulated); }
            if (data.done) {
              finalAssistantMsgId = data.messageId ?? null;
              if (data.userMessageId) finalUserMsgId = data.userMessageId;
            }
          } catch { /* ignore */ }
        }
      }

      setMessages((prev) => [
        ...prev,
        { id: finalUserMsgId, role: "user" as const, content: trimmedText, createdAt: new Date().toISOString() },
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
      setIsStreaming(false); setPendingUserContent(""); setStreamingContent("");
    }
  }, [activeConv, aiEnabled, isStreaming, toast]);

  // ── Message actions ────────────────────────────────────────────────────────
  const doAddToPlan = useCallback(async (messageId: string, sessionId: string) => {
    setAddingToPlan(messageId);
    setSessionPickerMsgId(null);
    setGlobalPickerAction(null);
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
        toast({ title: "Błąd", description: err.error, variant: "destructive" });
      }
    } catch {
      toast({ title: "Błąd połączenia", variant: "destructive" });
    } finally {
      setAddingToPlan(null);
    }
  }, [toast]);

  const handleAddToPlan = useCallback((messageId: string) => {
    if (!activeConv?.clientId) {
      // GENERAL conversation: open global picker (client → planned session)
      fetchClients().then((clients) => {
        setGlobalPickerClients(clients);
        setGlobalPickerClientId("");
        setGlobalPickerSessions([]);
        setGlobalPickerStep("client");
        setGlobalPickerAction({ type: "add-to-plan", messageId });
      });
      return;
    }
    // Bound conversation
    if (currentPlannedSessions.length === 0) {
      toast({ title: "Brak zaplanowanej sesji", description: "Dodaj sesję do kalendarza.", variant: "destructive" });
      return;
    }
    if (currentPlannedSessions.length === 1) {
      doAddToPlan(messageId, currentPlannedSessions[0].id);
      return;
    }
    setSessionPickerMsgId(messageId);
  }, [activeConv, currentPlannedSessions, doAddToPlan, fetchClients, toast]);

  const handleAddToNotebook = useCallback(async (messageId: string) => {
    setAddingToNote(messageId);
    try {
      const res = await fetch(`/api/mentor/messages/${messageId}/add-to-notebook`, { method: "POST" });
      if (res.ok) toast({ title: "Zapisano do Notatnika" });
      else { const err = await res.json(); toast({ title: "Błąd zapisu", description: err.error, variant: "destructive" }); }
    } catch {
      toast({ title: "Błąd połączenia", variant: "destructive" });
    } finally {
      setAddingToNote(null);
    }
  }, [toast]);

  // ── "Pomóż zaplanować sesję" ───────────────────────────────────────────────
  const handlePlanPrompt = useCallback(() => {
    if (!activeConv) return;

    if (!activeConv.clientId) {
      // GENERAL: need client → planned session
      fetchClients().then((clients) => {
        setGlobalPickerClients(clients);
        setGlobalPickerClientId("");
        setGlobalPickerSessions([]);
        setGlobalPickerStep("client");
        setGlobalPickerAction({ type: "plan-prompt" });
      });
      return;
    }

    if (currentPlannedSessions.length === 0) {
      toast({ title: "Brak zaplanowanej sesji", description: "Dodaj sesję do kalendarza.", variant: "destructive" });
      return;
    }
    if (currentPlannedSessions.length === 1) {
      const s = currentPlannedSessions[0];
      const dateStr = new Date(s.scheduledAt).toLocaleDateString("pl-PL", { day: "numeric", month: "long" });
      const clientName = activeConv.client?.name ?? "klienta";
      sendMessage(`Pomóż mi zaplanować sesję ${s.sessionNumber} z klientem ${clientName} (zaplanowaną na ${dateStr}). Zaproponuj konkretny cel sesji wynikający z historii procesu, strukturę z orientacyjnym czasem, 2–3 techniki lub narzędzia coachingowe oraz 4–6 gotowych pytań do bezpośredniego użycia na sesji.`);
      return;
    }
    setPlanPromptPickerOpen(true);
  }, [activeConv, currentPlannedSessions, fetchClients, sendMessage, toast]);

  // ── Global picker helpers ──────────────────────────────────────────────────
  const onGlobalPickerSelectClient = useCallback(async (clientId: string, clientName: string) => {
    setGlobalPickerClientId(clientId);
    setGlobalPickerClientName(clientName);
    setLoadingGlobalPickerSessions(true);
    try {
      const sessions = await fetchSessions(clientId, "planned");
      setGlobalPickerSessions(sessions);
      if (sessions.length === 0) {
        toast({ title: "Brak zaplanowanej sesji", description: "Ten klient nie ma nadchodzących sesji.", variant: "destructive" });
        setGlobalPickerAction(null);
        return;
      }
      if (sessions.length === 1) {
        // Only one — act immediately
        const s = sessions[0];
        const action = globalPickerAction;
        setGlobalPickerAction(null);
        if (action?.type === "add-to-plan") {
          doAddToPlan(action.messageId, s.id);
        } else if (action?.type === "plan-prompt") {
          const dateStr = new Date(s.scheduledAt).toLocaleDateString("pl-PL", { day: "numeric", month: "long" });
          sendMessage(`Pomóż mi zaplanować sesję ${s.sessionNumber} z klientem ${clientName} (zaplanowaną na ${dateStr}). Zaproponuj konkretny cel sesji wynikający z historii procesu, strukturę z orientacyjnym czasem, 2–3 techniki lub narzędzia coachingowe oraz 4–6 gotowych pytań do bezpośredniego użycia na sesji.`);
        }
        return;
      }
      setGlobalPickerStep("session");
    } finally {
      setLoadingGlobalPickerSessions(false);
    }
  }, [doAddToPlan, fetchSessions, globalPickerAction, sendMessage, toast]);

  const onGlobalPickerSelectSession = useCallback((session: SessionOption) => {
    const action = globalPickerAction;
    setGlobalPickerAction(null);
    if (action?.type === "add-to-plan") {
      doAddToPlan(action.messageId, session.id);
    } else if (action?.type === "plan-prompt") {
      const dateStr = new Date(session.scheduledAt).toLocaleDateString("pl-PL", { day: "numeric", month: "long" });
      sendMessage(`Pomóż mi zaplanować sesję ${session.sessionNumber} z klientem ${globalPickerClientName} (zaplanowaną na ${dateStr}). Zaproponuj konkretny cel sesji wynikający z historii procesu, strukturę z orientacyjnym czasem, 2–3 techniki lub narzędzia coachingowe oraz 4–6 gotowych pytań do bezpośredniego użycia na sesji.`);
    }
  }, [doAddToPlan, globalPickerAction, globalPickerClientName, sendMessage]);

  // ─── Render ──────────────────────────────────────────────────────────────────

  const quickActions = [
    { label: "Ogólna refleksja", icon: <Gem className="w-3.5 h-3.5" />, color: "text-[#224cc0] dark:text-white/90", hover: "hover:bg-[#224cc0]/15 hover:border-[#224cc0]/35 dark:hover:bg-white/15 dark:hover:border-white/25" },
    { label: "Feedback dla coacha", icon: <Target className="w-3.5 h-3.5" />, color: "text-[#D28B4C] dark:text-white/90", hover: "hover:bg-[#D28B4C]/15 hover:border-[#D28B4C]/40 dark:hover:bg-white/15 dark:hover:border-white/25" },
    { label: "Pomóż zaplanować sesję", icon: <Sparkles className="w-3.5 h-3.5" />, color: "text-[#8A66BC] dark:text-white/90", hover: "hover:bg-[#8A66BC]/15 hover:border-[#8A66BC]/40 dark:hover:bg-white/15 dark:hover:border-white/25" },
  ];

  const uniqueClients = useMemo(() => {
    const seen = new Set<string>();
    const clients: ClientOption[] = [];
    for (const conv of conversations) {
      if (conv.client && !seen.has(conv.client.id)) {
        seen.add(conv.client.id);
        clients.push({ id: conv.client.id, name: conv.client.name });
      }
    }
    return clients;
  }, [conversations]);

  const filteredConversations = useMemo(() => {
    if (!filterClientId) return conversations;
    if (filterClientId === "__general__") return conversations.filter((c) => !c.clientId);
    return conversations.filter((c) => c.clientId === filterClientId);
  }, [conversations, filterClientId]);

  return (
    <div className="flex h-screen overflow-hidden p-4 gap-4 bg-slate-100/60 dark:bg-background">
      {/* ── LEFT: Conversation list ─────────────────────────────────────────── */}
      <div className="w-80 shrink-0 flex flex-col bg-white dark:bg-card rounded-2xl border overflow-hidden shadow-sm">
        {/* Sidebar header */}
        <div className="relative overflow-hidden shrink-0 header-gradient">
          <div className="absolute -top-6 -right-6 w-36 h-36 rounded-full bg-white/20 blur-2xl pointer-events-none" />
          <div className="absolute bottom-0 -left-4 w-28 h-28 rounded-full bg-blue-300/20 blur-2xl pointer-events-none" />
          <div className="relative z-10 px-5 pt-5 pb-7">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-white/20 border border-white/30 shadow-sm flex items-center justify-center shrink-0">
                  <MentorMark className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="text-base font-semibold text-white leading-tight">Mentor AI</p>
                  <p className="text-xs text-white/70">Wszystkie rozmowy</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setNewConvStep("type");
                  setNewConvType(null);
                  setNewConvClientId("");
                  setNewConvSessionId("");
                  setNewConvOpen(true);
                }}
                disabled={!aiEnabled}
                className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-xl bg-white/20 border border-white/30 text-white hover:bg-white/30 transition-colors disabled:opacity-50 shrink-0"
              >
                <Plus className="w-3.5 h-3.5" />
                Nowa
              </button>
            </div>
            {/* Client filter */}
            <div className="mt-3.5 relative">
              <select
                value={filterClientId}
                onChange={(e) => setFilterClientId(e.target.value)}
                className="w-full bg-white/15 border border-white/25 text-white text-xs rounded-xl px-3 py-1.5 pr-7 focus:outline-none appearance-none cursor-pointer"
              >
                <option value="">Wszyscy klienci</option>
                <option value="__general__">Tylko Ogólne</option>
                {uniqueClients.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
              <ChevronRight className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-white/70 pointer-events-none rotate-90" />
            </div>
          </div>
        </div>

        {/* Conversation list */}
        <div className="flex-1 overflow-y-auto p-3 space-y-1.5 panel-bg">
          {loadingList ? (
            <div className="flex justify-center items-center py-10">
              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
            </div>
          ) : filteredConversations.length === 0 ? (
            <div className="flex flex-col items-center text-center py-12 gap-3">
              {conversations.length === 0 ? (
                <>
                  <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-950/30 flex items-center justify-center">
                    <MessageSquare className="w-6 h-6 text-blue-400 dark:text-blue-500" />
                  </div>
                  <div>
                    <p className="font-medium text-sm text-foreground">Brak rozmów</p>
                    <p className="text-xs text-muted-foreground mt-1 max-w-[200px] leading-relaxed">
                      Kliknij &ldquo;Nowa&rdquo;, aby rozpocząć rozmowę superwizyjną.
                    </p>
                  </div>
                </>
              ) : (
                <p className="text-sm text-muted-foreground max-w-[180px] leading-relaxed">Brak rozmów dla wybranego filtra.</p>
              )}
            </div>
          ) : (
            filteredConversations.map((conv) => (
              <button
                key={conv.id}
                onClick={() => openConversation(conv)}
                className={cn(
                  "w-full flex items-center gap-3 px-3 py-3 rounded-xl border transition-all text-left",
                  activeConv?.id === conv.id
                    ? "border-blue-300 dark:border-blue-700 bg-blue-50 dark:bg-blue-950/20 shadow-sm"
                    : "border-slate-200 dark:border-slate-700 bg-white dark:bg-card hover:border-blue-200 dark:hover:border-slate-600 hover:shadow-sm"
                )}
              >
                <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0">
                  <MessageSquare className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate leading-tight">{conv.title}</p>
                  <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                    <span className={cn("text-[10px] px-1.5 py-0.5 rounded-full font-medium", CONTEXT_TYPE_COLORS[conv.contextType])}>
                      {CONTEXT_TYPE_LABELS[conv.contextType] ?? conv.contextType}
                    </span>
                    {conv.client && (
                      <span className="text-[10px] font-semibold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-700/60 px-1.5 py-0.5 rounded-md truncate max-w-[120px] shrink-0">
                        {conv.client.name}
                      </span>
                    )}
                    {conv.lastMessageAt && (
                      <span className="text-[10px] text-muted-foreground ml-auto shrink-0">
                        {formatRelativeDate(conv.lastMessageAt)}
                      </span>
                    )}
                  </div>
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* ── RIGHT: Chat pane ────────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0 bg-white dark:bg-card rounded-2xl border shadow-sm">
        {!activeConv ? (
          /* Empty state */
          <div className="flex-1 flex flex-col items-center justify-center gap-5 panel-bg">
            <div className="w-16 h-16 rounded-3xl bg-blue-50 dark:bg-blue-950/30 flex items-center justify-center">
              <MentorMark className="w-8 h-8 text-blue-400 dark:text-blue-500" />
            </div>
            <div className="text-center">
              <p className="text-lg font-semibold text-foreground">Mentor AI</p>
              <p className="text-sm text-muted-foreground mt-1 max-w-sm leading-relaxed">
                Wybierz rozmowę z listy lub zacznij nową, aby skorzystać z superwizji AI.
              </p>
            </div>
            <Button
              onClick={() => { setNewConvStep("type"); setNewConvType(null); setNewConvClientId(""); setNewConvSessionId(""); setNewConvOpen(true); }}
              disabled={!aiEnabled}
            >
              <Plus className="w-4 h-4 mr-1.5" />
              Nowa rozmowa
            </Button>
          </div>
        ) : (
          /* Active conversation */
          <div className="flex flex-col h-full relative">
            {/* Chat header */}
            <div className="relative overflow-hidden shrink-0 header-gradient">
              <div className="absolute -top-6 -right-6 w-36 h-36 rounded-full bg-white/20 blur-2xl pointer-events-none" />
              <div className="absolute bottom-0 -left-4 w-28 h-28 rounded-full bg-blue-300/20 blur-2xl pointer-events-none" />
              <div className="relative z-10 px-5 pt-5 pb-2">
                <div className="flex items-start justify-between gap-2">
                  <button
                    onClick={() => {
                      activeConvRef.current = null;
                      setActiveConv(null);
                      setMessages([]);
                      setStreamingContent("");
                      setCurrentPlannedSessions([]);
                    }}
                    className="flex items-center gap-1 text-xs text-white/80 hover:text-white transition-colors mt-0.5 shrink-0"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    Rozmowy
                  </button>
                  <div className="flex-1 min-w-0 text-center px-2">
                    <p className="text-sm font-semibold text-white truncate leading-tight">{activeConv.title}</p>
                    <div className="flex items-center justify-center gap-2 mt-0.5">
                      <span className="inline-block text-xs px-1.5 py-0.5 rounded-full font-medium bg-white/20 text-white/90">
                        {CONTEXT_TYPE_LABELS[activeConv.contextType] ?? activeConv.contextType}
                      </span>
                      {activeConv.client && (
                        <span className="text-xs text-white/70 flex items-center gap-1 truncate">
                          <Users className="w-3 h-3 shrink-0" />
                          {activeConv.client.name}
                        </span>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={archiveConversation}
                    className="flex items-center gap-1 text-xs text-white/70 hover:text-white transition-colors mt-0.5 shrink-0"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Zakończ
                  </button>
                </div>
              </div>
              {/* Quick actions — on gradient */}
              <div className="relative z-10 flex gap-2 px-5 pb-4 pt-0">
                {quickActions.map((qa) => (
                  <button
                    key={qa.label}
                    disabled={isStreaming || !aiEnabled}
                    onClick={() => {
                      if (qa.label === "Pomóż zaplanować sesję") {
                        handlePlanPrompt();
                      } else {
                        sendMessage(buildQuickPrompt(qa.label, activeConv.contextType, activeConv.client?.name ?? "klienta"));
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

            {/* Messages */}
            <div
              ref={scrollContainerRef}
              onScroll={handleScroll}
              className="flex-1 overflow-y-auto px-6 py-4 space-y-4 panel-bg relative"
            >
              {loadingMessages ? (
                <div className="flex justify-center items-center py-10">
                  <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <>
                  {messages.length === 0 && !isStreaming && (
                    <div className="flex flex-col items-center justify-center h-full text-center gap-3 py-16">
                      <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-950/30 flex items-center justify-center">
                        <MentorMark className="w-6 h-6 text-blue-400 dark:text-blue-500" />
                      </div>
                      <div>
                        <p className="font-medium text-sm text-foreground">Gotowy do rozmowy</p>
                        <p className="text-xs text-muted-foreground mt-1 max-w-xs leading-relaxed">
                          Zadaj pytanie lub wybierz jedną z szybkich akcji powyżej.
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
                      <div className="max-w-[78%]">
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
                            <div className="flex gap-1.5 mt-1.5 ml-1">
                              <button
                                onClick={() => handleAddToPlan(msg.id)}
                                disabled={addingToPlan === msg.id}
                                className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-blue-600 dark:hover:text-blue-400 transition-colors px-2 py-1 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-950/20"
                              >
                                {addingToPlan === msg.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <ClipboardList className="w-3 h-3" />}
                                Dodaj do Planu Sesji
                              </button>
                              <button
                                onClick={() => handleAddToNotebook(msg.id)}
                                disabled={addingToNote === msg.id}
                                className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors px-2 py-1 rounded-lg hover:bg-emerald-50 dark:hover:bg-emerald-950/20"
                              >
                                {addingToNote === msg.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <BookOpen className="w-3 h-3" />}
                                Do Notatnika
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}

                  {/* Optimistic user message */}
                  {isStreaming && pendingUserContent && (
                    <div className="flex gap-2 justify-end">
                      <div className="max-w-[78%]">
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
                      <div className="max-w-[78%]">
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
                        {streamingContent && (
                          <p className="text-[10px] text-muted-foreground mt-1 ml-1">Mentor AI pisze…</p>
                        )}
                      </div>
                    </div>
                  )}
                </>
              )}

              {!aiEnabled && (
                <div className="flex items-center gap-1.5 text-xs text-amber-700 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg px-3 py-2">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  AI niedostępne – brak klucza OPENAI_API_KEY.
                </div>
              )}

              <div ref={chatBottomRef} />
            </div>

            {/* Scroll-to-bottom button */}
            {userScrolledUp && isStreaming && (
              <div className="absolute bottom-[72px] left-[320px] right-0 flex justify-center z-10 pointer-events-none">
                <button
                  onClick={() => { setUserScrolledUp(false); chatBottomRef.current?.scrollIntoView({ behavior: "smooth" }); }}
                  className="pointer-events-auto flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full bg-blue-600 text-white shadow-lg hover:bg-blue-700 transition-colors"
                >
                  <ArrowDown className="w-3 h-3" />
                  Przejdź do najnowszej wiadomości
                </button>
              </div>
            )}

            {/* Input */}
            <div className="border-t px-5 pt-3 pb-4 shrink-0 bg-white dark:bg-card">
              <div className="flex items-end gap-2 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-2xl px-3 py-2 shadow-sm">
                <textarea
                  ref={textareaRef}
                  className="flex-1 resize-none bg-transparent text-sm focus:outline-none min-h-[36px] max-h-[160px] py-1 text-foreground placeholder:text-muted-foreground"
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
                    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(chatInput); }
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
          </div>
        )}
      </div>

      {/* ═══ MODALS ══════════════════════════════════════════════════════════════ */}

      {/* New conversation modal */}
      <Dialog open={newConvOpen} onOpenChange={(open) => { if (!open) { setNewConvOpen(false); setNewConvStep("type"); setNewConvType(null); } }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {newConvStep === "type" && "Nowa rozmowa z Mentorem AI"}
              {newConvStep === "client" && (
                <button onClick={() => { setNewConvStep("type"); setNewConvClientId(""); }} className="flex items-center gap-1.5 text-sm font-semibold">
                  <ArrowLeft className="w-4 h-4" /> Wybierz kontekst
                </button>
              )}
              {newConvStep === "session" && (
                <button onClick={() => { setNewConvStep("client"); setNewConvSessionId(""); }} className="flex items-center gap-1.5 text-sm font-semibold">
                  <ArrowLeft className="w-4 h-4" /> Wybierz sesję
                </button>
              )}
            </DialogTitle>
          </DialogHeader>

          {/* Step: type */}
          {newConvStep === "type" && (
            <div className="space-y-2.5 pb-2">
              {(["PROCESS", "SESSION", "GENERAL"] as NewConvType[]).map((t) => {
                const icons: Record<NewConvType, React.ReactNode> = {
                  PROCESS: <Gem className="w-4.5 h-4.5" />,
                  SESSION: <Calendar className="w-4.5 h-4.5" />,
                  GENERAL: <MessageSquare className="w-4.5 h-4.5" />,
                };
                const descs: Record<NewConvType, string> = {
                  PROCESS: "Pełen kontekst procesu z wybranym klientem. Refleksja nad całym procesem.",
                  SESSION: "Skupiona refleksja na konkretnej, zakończonej sesji.",
                  GENERAL: "Pytanie ogólne niezwiązane z konkretnym klientem.",
                };
                const colors: Record<NewConvType, string> = {
                  PROCESS: "bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300",
                  SESSION: "bg-violet-50 dark:bg-violet-950/30 border-violet-200 dark:border-violet-800 text-violet-700 dark:text-violet-300",
                  GENERAL: "bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300",
                };
                return (
                  <button
                    key={t}
                    onClick={async () => {
                      setNewConvType(t);
                      if (t === "GENERAL") {
                        setNewConvStep("type");
                        // Directly create
                        setCreatingConv(true);
                        try {
                          const res = await fetch("/api/mentor/conversations", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ contextType: "GENERAL" }),
                          });
                          if (!res.ok) { toast({ title: "Błąd", description: await parseApiError(res), variant: "destructive" }); return; }
                          const conv = await res.json();
                          setNewConvOpen(false);
                          const list = await fetchConversations();
                          const found = list.find((c) => c.id === conv.id) ?? {
                            id: conv.id,
                            title: conv.title,
                            contextType: conv.contextType,
                            status: conv.status ?? "ACTIVE",
                            lastMessageAt: conv.lastMessageAt ?? null,
                            createdAt: conv.createdAt,
                            clientId: null,
                            client: null,
                            _count: { messages: 0 },
                          } as GlobalConversation;
                          openConversation(found);
                        } catch (err) {
                          const msg = err instanceof Error ? err.message : "Nieznany błąd";
                          toast({ title: "Błąd tworzenia rozmowy", description: msg, variant: "destructive" });
                        } finally { setCreatingConv(false); }
                      } else {
                        // Need client selection
                        setLoadingNewConvData(true);
                        const clients = await fetchClients();
                        setNewConvClients(clients);
                        setLoadingNewConvData(false);
                        setNewConvStep("client");
                      }
                    }}
                    className="w-full flex items-start gap-3 p-4 rounded-xl border transition-all text-left hover:shadow-sm border-slate-200 dark:border-slate-700 bg-white dark:bg-card hover:border-blue-200 hover:bg-blue-50/50"
                  >
                    <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5", colors[t])}>
                      {icons[t]}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-foreground">{CONTEXT_TYPE_LABELS[t]}</p>
                      <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{descs[t]}</p>
                    </div>
                  </button>
                );
              })}
              {creatingConv && (
                <div className="flex justify-center py-2">
                  <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                </div>
              )}
            </div>
          )}

          {/* Step: client */}
          {newConvStep === "client" && (
            <div className="space-y-2 pb-2">
              {loadingNewConvData ? (
                <div className="flex justify-center py-6"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
              ) : newConvClients.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">Brak klientów. Najpierw dodaj klienta.</p>
              ) : (
                newConvClients.map((c) => (
                  <button
                    key={c.id}
                    onClick={async () => {
                      setNewConvClientId(c.id);
                      if (newConvType === "PROCESS") {
                        // Create directly
                        setCreatingConv(true);
                        try {
                          const res = await fetch("/api/mentor/conversations", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ contextType: "PROCESS", clientId: c.id }),
                          });
                          if (!res.ok) { toast({ title: "Błąd", description: await parseApiError(res), variant: "destructive" }); return; }
                          const conv = await res.json();
                          setNewConvOpen(false);
                          const list = await fetchConversations();
                          const found = list.find((x) => x.id === conv.id);
                          if (found) openConversation(found);
                        } finally { setCreatingConv(false); }
                      } else {
                        // SESSION: load completed sessions
                        setLoadingNewConvData(true);
                        const sessions = await fetchSessions(c.id, "completed");
                        setNewConvCompletedSessions(sessions);
                        setLoadingNewConvData(false);
                        setNewConvStep("session");
                      }
                    }}
                    className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/20 transition-colors text-left"
                  >
                    <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-950/30 flex items-center justify-center text-blue-700 dark:text-blue-300 text-sm font-semibold shrink-0">
                      {c.name.charAt(0)}
                    </div>
                    <p className="text-sm font-medium">{c.name}</p>
                  </button>
                ))
              )}
              {creatingConv && <div className="flex justify-center py-2"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>}
            </div>
          )}

          {/* Step: session */}
          {newConvStep === "session" && (
            <div className="space-y-2 pb-2">
              {loadingNewConvData ? (
                <div className="flex justify-center py-6"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
              ) : newConvCompletedSessions.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">Brak odbytych sesji dla tego klienta.</p>
              ) : (
                newConvCompletedSessions.map((s) => (
                  <button
                    key={s.id}
                    onClick={async () => {
                      setNewConvSessionId(s.id);
                      setCreatingConv(true);
                      try {
                        const res = await fetch("/api/mentor/conversations", {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ contextType: "SESSION", clientId: newConvClientId, contextSessionId: s.id }),
                        });
                        if (!res.ok) { const err = await res.json(); toast({ title: "Błąd", description: err.error, variant: "destructive" }); return; }
                        const conv = await res.json();
                        setNewConvOpen(false);
                        const list = await fetchConversations();
                        const found = list.find((x) => x.id === conv.id);
                        if (found) openConversation(found);
                      } finally { setCreatingConv(false); }
                    }}
                    className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-violet-400 hover:bg-violet-50 dark:hover:bg-violet-950/20 transition-colors text-left"
                  >
                    <Calendar className="w-4 h-4 text-violet-500 shrink-0" />
                    <div>
                      <p className="text-sm font-medium">Sesja {s.sessionNumber}</p>
                      <p className="text-xs text-muted-foreground">{formatDateTime(s.scheduledAt)}</p>
                    </div>
                  </button>
                ))
              )}
              {creatingConv && <div className="flex justify-center py-2"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Session picker for bound conversations — "Dodaj do Planu Sesji" */}
      <Dialog open={sessionPickerMsgId !== null} onOpenChange={(open) => { if (!open) setSessionPickerMsgId(null); }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle>Wybierz sesję, do której dodać Plan Sesji</DialogTitle></DialogHeader>
          <div className="space-y-2 py-2">
            {currentPlannedSessions.map((s) => (
              <button key={s.id} onClick={() => sessionPickerMsgId && doAddToPlan(sessionPickerMsgId, s.id)}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/20 transition-colors text-left">
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

      {/* Session picker for bound conversations — "Pomóż zaplanować sesję" */}
      <Dialog open={planPromptPickerOpen} onOpenChange={setPlanPromptPickerOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle>Wybierz sesję do zaplanowania</DialogTitle></DialogHeader>
          <div className="space-y-2 py-2">
            {currentPlannedSessions.map((s) => (
              <button key={s.id} onClick={() => {
                setPlanPromptPickerOpen(false);
                const dateStr = new Date(s.scheduledAt).toLocaleDateString("pl-PL", { day: "numeric", month: "long" });
                const clientName = activeConv?.client?.name ?? "klienta";
                sendMessage(`Pomóż mi zaplanować sesję ${s.sessionNumber} z klientem ${clientName} (zaplanowaną na ${dateStr}). Zaproponuj konkretny cel sesji wynikający z historii procesu, strukturę z orientacyjnym czasem, 2–3 techniki lub narzędzia coachingowe oraz 4–6 gotowych pytań do bezpośredniego użycia na sesji.`);
              }}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/20 transition-colors text-left">
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

      {/* Global picker: client → planned session (for GENERAL conversations) */}
      <Dialog open={globalPickerAction !== null} onOpenChange={(open) => { if (!open) setGlobalPickerAction(null); }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>
              {globalPickerStep === "client"
                ? "Wybierz klienta"
                : <button onClick={() => setGlobalPickerStep("client")} className="flex items-center gap-1.5 text-sm font-semibold">
                    <ArrowLeft className="w-4 h-4" /> Wybierz sesję
                  </button>
              }
            </DialogTitle>
          </DialogHeader>
          {globalPickerStep === "client" && (
            <div className="space-y-2 py-2">
              {globalPickerClients.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">Brak klientów.</p>
              ) : (
                globalPickerClients.map((c) => (
                  <button key={c.id}
                    onClick={() => onGlobalPickerSelectClient(c.id, c.name)}
                    disabled={loadingGlobalPickerSessions}
                    className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/20 transition-colors text-left disabled:opacity-50">
                    <div className="w-7 h-7 rounded-xl bg-blue-50 dark:bg-blue-950/30 flex items-center justify-center text-blue-700 dark:text-blue-300 text-xs font-semibold shrink-0">
                      {c.name.charAt(0)}
                    </div>
                    <p className="text-sm font-medium">{c.name}</p>
                    {loadingGlobalPickerSessions && globalPickerClientId === c.id && <Loader2 className="w-3.5 h-3.5 animate-spin ml-auto text-muted-foreground" />}
                  </button>
                ))
              )}
            </div>
          )}
          {globalPickerStep === "session" && (
            <div className="space-y-2 py-2">
              {globalPickerSessions.map((s) => (
                <button key={s.id} onClick={() => onGlobalPickerSelectSession(s)}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/20 transition-colors text-left">
                  <Calendar className="w-4 h-4 text-blue-500 shrink-0" />
                  <div>
                    <p className="text-sm font-medium">Sesja {s.sessionNumber}</p>
                    <p className="text-xs text-muted-foreground">{formatDateTime(s.scheduledAt)}</p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
