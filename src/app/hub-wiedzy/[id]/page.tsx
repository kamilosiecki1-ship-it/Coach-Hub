"use client";
import { useState, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Pencil, Loader2, Heart, NotebookPen, Check, BookOpen, ClipboardList, ChevronLeft } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useToast } from "@/components/ui/use-toast";
import { cn } from "@/lib/utils";

const CATEGORIES = ["Model", "Technika", "Narzędzie", "Podejście"];

interface Tool {
  id: string;
  userId: string | null;
  name: string;
  category: string;
  tags: string;
  description: string;
  structure: string;
  example: string;
  isFavorite: boolean;
  note: string;
}

interface ClientOption { id: string; name: string; }
interface SessionOption { id: string; scheduledAt: string; sessionNumber: number; }

export default function HubWiedzyDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { toast } = useToast();

  const [tool, setTool] = useState<Tool | null>(null);
  const [loading, setLoading] = useState(true);

  const [isFavorite, setIsFavorite] = useState(false);
  const [note, setNote] = useState("");
  const [noteSaving, setNoteSaving] = useState(false);
  const [noteSaved, setNoteSaved] = useState(false);
  const noteSavedTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [editOpen, setEditOpen] = useState(false);
  const [form, setForm] = useState({ name: "", category: "", tags: "", description: "", structure: "", example: "" });
  const [saving, setSaving] = useState(false);

  // ── Add-to-plan 2-step picker ────────────────────────────────────────────
  type PickerStep = "client" | "session" | null;
  const [pickerStep, setPickerStep] = useState<PickerStep>(null);
  const [pickerLoading, setPickerLoading] = useState(false);
  const [clients, setClients] = useState<ClientOption[]>([]);
  const [selectedClient, setSelectedClient] = useState<ClientOption | null>(null);
  const [clientSessions, setClientSessions] = useState<SessionOption[]>([]);
  const [addingToPlan, setAddingToPlan] = useState(false);

  const closePicker = () => {
    setPickerStep(null);
    setSelectedClient(null);
    setClientSessions([]);
  };

  const doAddToPlan = async (sessionId: string) => {
    closePicker();
    setAddingToPlan(true);
    try {
      const res = await fetch(`/api/hub-wiedzy/${id}/add-to-plan`, {
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
        const err = await res.json().catch(() => ({}));
        toast({ title: "Błąd", description: err.error ?? "Spróbuj ponownie.", variant: "destructive" });
      }
    } catch {
      toast({ title: "Błąd połączenia", variant: "destructive" });
    } finally {
      setAddingToPlan(false);
    }
  };

  const handleAddToPlan = async () => {
    setPickerLoading(true);
    try {
      const res = await fetch("/api/klienci");
      const all: { id: string; name: string; closedAt?: string | null }[] = res.ok ? await res.json() : [];
      const active = all.filter((c) => !c.closedAt).map((c) => ({ id: c.id, name: c.name }));
      if (active.length === 0) {
        toast({ title: "Brak klientów", description: "Dodaj klienta, aby móc planować sesje.", variant: "destructive" });
        return;
      }
      setClients(active);
      setPickerStep("client");
    } catch {
      toast({ title: "Błąd połączenia", variant: "destructive" });
    } finally {
      setPickerLoading(false);
    }
  };

  const handleClientSelected = async (client: ClientOption) => {
    setSelectedClient(client);
    setPickerLoading(true);
    try {
      const res = await fetch(`/api/mentor/client-sessions?clientId=${client.id}&type=planned`);
      const sessions: SessionOption[] = res.ok ? await res.json() : [];
      if (sessions.length === 0) {
        toast({ title: "Brak zaplanowanych sesji", description: `Klient ${client.name} nie ma nadchodzących sesji.`, variant: "destructive" });
        setPickerStep("client");
        setSelectedClient(null);
        return;
      }
      setClientSessions(sessions);
      setPickerStep("session");
    } catch {
      toast({ title: "Błąd połączenia", variant: "destructive" });
      setPickerStep("client");
    } finally {
      setPickerLoading(false);
    }
  };

  // ── Tool data ────────────────────────────────────────────────────────────
  useEffect(() => {
    fetch(`/api/hub-wiedzy/${id}`)
      .then((r) => r.json())
      .then((data) => {
        setTool(data);
        setIsFavorite(data.isFavorite ?? false);
        setNote(data.note ?? "");
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [id]);

  const toggleFavorite = async () => {
    const newVal = !isFavorite;
    setIsFavorite(newVal);
    await fetch(`/api/hub-wiedzy/${id}/preference`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isFavorite: newVal }),
    });
  };

  const saveNote = async () => {
    setNoteSaving(true);
    const res = await fetch(`/api/hub-wiedzy/${id}/preference`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ note }),
    });
    setNoteSaving(false);
    if (res.ok) {
      setNoteSaved(true);
      if (noteSavedTimer.current) clearTimeout(noteSavedTimer.current);
      noteSavedTimer.current = setTimeout(() => setNoteSaved(false), 2000);
    } else {
      toast({ title: "Błąd", description: "Nie udało się zapisać notatki.", variant: "destructive" });
    }
  };

  const openEdit = () => {
    if (!tool) return;
    setForm({
      name: tool.name,
      category: tool.category,
      tags: tool.tags ?? "",
      description: tool.description,
      structure: tool.structure,
      example: tool.example,
    });
    setEditOpen(true);
  };

  const handleSave = async () => {
    if (!form.name.trim() || !form.description.trim() || !form.structure.trim() || !form.example.trim()) {
      toast({ title: "Błąd", description: "Wypełnij wszystkie wymagane pola.", variant: "destructive" });
      return;
    }
    setSaving(true);
    const res = await fetch(`/api/hub-wiedzy/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setSaving(false);
    if (res.ok) {
      const updated = await res.json();
      setTool({ ...updated, isFavorite, note });
      setEditOpen(false);
      toast({ title: "Zapisano zmiany" });
    } else {
      toast({ title: "Błąd", description: "Nie udało się zapisać.", variant: "destructive" });
    }
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="flex justify-center py-24">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      </AppLayout>
    );
  }

  if (!tool) {
    return (
      <AppLayout>
        <div className="p-8 text-center text-muted-foreground">Nie znaleziono narzędzia.</div>
      </AppLayout>
    );
  }

  const isOwn = tool.userId !== null;
  const tags = tool.tags.split(",").map((t) => t.trim()).filter(Boolean);

  return (
    <AppLayout>
      <div className="p-8 max-w-6xl mx-auto">
        {/* Back link */}
        <button
          onClick={() => router.push("/hub-wiedzy")}
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-4 transition-colors group"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
          Hub wiedzy
        </button>

        {/* Gradient hero */}
        <div className="relative overflow-hidden rounded-2xl header-gradient-purple mb-8">
          <div className="absolute -top-6 -right-6 w-44 h-44 rounded-full bg-white/20 blur-2xl pointer-events-none" />
          <div className="absolute bottom-0 -left-4 w-36 h-36 rounded-full bg-purple-300/20 blur-2xl pointer-events-none" />
          <div className="relative z-10 px-7 py-6">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-4 min-w-0">
                <div className="w-12 h-12 rounded-2xl bg-white/20 border border-white/30 shadow-sm flex items-center justify-center shrink-0 mt-0.5">
                  <BookOpen className="w-6 h-6 text-white" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h1 className="text-xl font-semibold text-white">{tool.name}</h1>
                    <span className="text-xs font-medium bg-white/20 text-white/90 rounded-full px-2.5 py-0.5">
                      {tool.category}
                    </span>
                    {isOwn ? (
                      <span className="text-xs font-medium bg-white/15 text-white/80 rounded-full px-2.5 py-0.5">
                        Własna
                      </span>
                    ) : (
                      <span className="text-xs font-medium bg-white/10 border border-white/20 text-white/60 rounded-full px-2.5 py-0.5">
                        Wbudowane
                      </span>
                    )}
                  </div>
                  {tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {tags.map((tag) => (
                        <span key={tag} className="inline-flex items-center rounded-full bg-white/15 px-2 py-0.5 text-xs text-white/80">
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={handleAddToPlan}
                  disabled={addingToPlan || pickerLoading}
                  className="flex items-center gap-1.5 h-9 px-4 text-sm font-semibold bg-[#5A3FE0] text-white hover:bg-[#6e55e8] rounded-xl shadow-sm transition-colors disabled:opacity-60 shrink-0"
                >
                  {(addingToPlan || pickerLoading) ? <Loader2 className="w-4 h-4 animate-spin" /> : <ClipboardList className="w-4 h-4" />}
                  Dodaj do Planu Sesji
                </button>
                <button
                  onClick={toggleFavorite}
                  className={cn(
                    "flex items-center gap-1.5 h-9 px-3 text-xs font-medium rounded-xl border transition-colors shrink-0",
                    isFavorite
                      ? "bg-rose-500 border-rose-400 text-white hover:bg-rose-600"
                      : "bg-white/15 border-white/20 text-white/80 hover:bg-white/25 hover:text-white"
                  )}
                >
                  <Heart className={cn("w-3.5 h-3.5 shrink-0", isFavorite ? "fill-white text-white" : "")} />
                  Ulubione
                </button>
                {isOwn && (
                  <button
                    onClick={openEdit}
                    className="flex items-center gap-1.5 h-9 px-3 text-xs font-medium bg-white/15 border border-white/20 text-white/80 hover:bg-white/25 hover:text-white rounded-xl transition-colors shrink-0"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                    Edytuj
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Content — 2 columns */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* Left: description + structure */}
          <div className="lg:col-span-3 space-y-6">
            <div className="border rounded-xl bg-white dark:bg-card px-5 py-4 prose-coach overflow-auto">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{tool.description}</ReactMarkdown>
            </div>
            <div className="border rounded-xl bg-white dark:bg-card px-5 py-4 prose-coach prose-hub overflow-auto">
              <p className="text-xs font-semibold text-violet-600 dark:text-violet-400 uppercase tracking-widest mb-3">
                Jak stosować technikę w coachingu
              </p>
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{tool.structure}</ReactMarkdown>
            </div>
          </div>

          {/* Right: example — sticky */}
          <div className="lg:col-span-2">
            <div className="border rounded-xl bg-white dark:bg-card px-5 py-4 prose-coach overflow-auto lg:sticky lg:top-4">
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-3">
                Przykład użycia
              </h3>
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{tool.example}</ReactMarkdown>
            </div>
          </div>
        </div>

        {/* Note section — full width below grid */}
        <div className="mt-6 border rounded-xl bg-white dark:bg-card px-5 py-5">
          <div className="flex items-center gap-2 mb-3">
            <NotebookPen className="w-4 h-4 text-muted-foreground" />
            <h3 className="text-sm font-semibold">Moje notatki</h3>
            <span className="text-xs text-muted-foreground ml-1">— prywatne, widoczne tylko dla Ciebie</span>
          </div>
          <Textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Tu możesz zostawić własne obserwacje, kiedy używałeś/-aś techniki, co zadziałało, modyfikacje dla konkretnych klientów..."
            rows={4}
            className="resize-y"
          />
          <div className="flex items-center justify-between mt-3">
            <span className="text-xs text-muted-foreground">
              Notatka jest powiązana z Twoim kontem i nie jest widoczna dla innych.
            </span>
            <Button size="sm" onClick={saveNote} disabled={noteSaving} className="bg-violet-600 hover:bg-violet-700 text-white">
              {noteSaving ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : noteSaved ? (
                <>
                  <Check className="w-4 h-4" />
                  Zapisano
                </>
              ) : (
                "Zapisz notatkę"
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* 2-step plan picker dialog */}
      <Dialog open={pickerStep !== null} onOpenChange={(open) => { if (!open) closePicker(); }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <div className="flex items-center gap-2">
              {pickerStep === "session" && (
                <button
                  onClick={() => { setPickerStep("client"); setSelectedClient(null); setClientSessions([]); }}
                  className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors shrink-0"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
              )}
              <DialogTitle>
                {pickerStep === "client" ? "Wybierz klienta" : `Wybierz sesję — ${selectedClient?.name}`}
              </DialogTitle>
            </div>
          </DialogHeader>

          {pickerLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
            </div>
          ) : pickerStep === "client" ? (
            <div className="space-y-2 py-2 max-h-80 overflow-y-auto">
              {clients.map((c) => (
                <button
                  key={c.id}
                  onClick={() => handleClientSelected(c)}
                  className="w-full text-left px-4 py-3 rounded-xl border hover:bg-violet-50 dark:hover:bg-violet-950/20 hover:border-violet-300 dark:hover:border-violet-700 transition-colors"
                >
                  <p className="text-sm font-medium">{c.name}</p>
                </button>
              ))}
            </div>
          ) : (
            <div className="space-y-2 py-2 max-h-80 overflow-y-auto">
              {clientSessions.map((s) => {
                const date = new Date(s.scheduledAt).toLocaleDateString("pl-PL", {
                  day: "numeric", month: "long", year: "numeric",
                });
                return (
                  <button
                    key={s.id}
                    onClick={() => doAddToPlan(s.id)}
                    className="w-full text-left px-4 py-3 rounded-xl border hover:bg-violet-50 dark:hover:bg-violet-950/20 hover:border-violet-300 dark:hover:border-violet-700 transition-colors"
                  >
                    <p className="text-sm font-medium">Sesja {s.sessionNumber}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <p className="text-xs text-muted-foreground">{date}</p>
                      <span className="text-[10px] font-medium bg-blue-50 text-blue-600 dark:bg-blue-950/20 dark:text-blue-400 px-1.5 py-0.5 rounded-full">
                        Zaplanowana
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edytuj narzędzie</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="edit-name">Nazwa *</Label>
                <Input id="edit-name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Kategoria *</Label>
                <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-tags">Tagi</Label>
              <Input id="edit-tags" value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-desc">Opis *</Label>
              <Textarea id="edit-desc" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={4} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-structure">Struktura / kroki *</Label>
              <Textarea id="edit-structure" value={form.structure} onChange={(e) => setForm({ ...form, structure: e.target.value })} rows={5} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-example">Przykład użycia *</Label>
              <Textarea id="edit-example" value={form.example} onChange={(e) => setForm({ ...form, example: e.target.value })} rows={5} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>Anuluj</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Zapisz zmiany"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
