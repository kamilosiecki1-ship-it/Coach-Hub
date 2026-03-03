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
import { ArrowLeft, Pencil, Loader2, Heart, NotebookPen, Check } from "lucide-react";
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
        {/* Header */}
        <div className="flex items-start justify-between gap-4 mb-8">
          <div className="flex items-center gap-4 min-w-0">
            <Button variant="ghost" size="icon" onClick={() => router.push("/hub-wiedzy")}>
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-2xl font-semibold">{tool.name}</h1>
                <span className="text-xs font-medium bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-full px-2.5 py-1">
                  {tool.category}
                </span>
                {isOwn ? (
                  <span className="text-xs font-medium bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-300 rounded-full px-2.5 py-1">
                    Własna
                  </span>
                ) : (
                  <span className="text-xs font-medium border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 rounded-full px-2.5 py-1">
                    Wbudowane
                  </span>
                )}
              </div>
              {tags.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {tags.map((tag) => (
                    <span
                      key={tag}
                      className="inline-flex items-center rounded-full bg-slate-100 dark:bg-slate-800 px-2 py-0.5 text-xs text-slate-600 dark:text-slate-400"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button
              variant="outline"
              size="sm"
              onClick={toggleFavorite}
              className={cn(isFavorite && "border-rose-200 dark:border-rose-800 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30")}
            >
              <Heart className={cn("w-4 h-4", isFavorite && "fill-rose-500 text-rose-500")} />
              {isFavorite ? "Ulubione" : "Dodaj do ulubionych"}
            </Button>
            {isOwn && (
              <Button variant="outline" size="sm" onClick={openEdit}>
                <Pencil className="w-4 h-4" />
                Edytuj
              </Button>
            )}
          </div>
        </div>

        {/* Content — 2 columns */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* Left: description + structure */}
          <div className="lg:col-span-3 space-y-6">
            <div className="border rounded-xl bg-white dark:bg-card px-5 py-4 prose-coach overflow-auto">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{tool.description}</ReactMarkdown>
            </div>
            <div className="border rounded-xl bg-white dark:bg-card px-5 py-4 prose-coach overflow-auto">
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
            <Button size="sm" onClick={saveNote} disabled={noteSaving}>
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
