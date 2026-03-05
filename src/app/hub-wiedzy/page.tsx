"use client";
import { useState, useEffect, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Search, BookOpen, Loader2, MoreVertical, Pencil, Trash2, Heart } from "lucide-react";
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
  createdAt: string;
  isFavorite: boolean;
}

const emptyForm = {
  name: "",
  category: "Technika",
  tags: "",
  description: "",
  structure: "",
  example: "",
};

function parseTags(tags: string): string[] {
  return tags.split(",").map((t) => t.trim()).filter(Boolean);
}

export default function HubWiedzyPage() {
  const router = useRouter();
  const { toast } = useToast();

  const [allTools, setAllTools] = useState<Tool[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [tagFilter, setTagFilter] = useState("all");

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editTool, setEditTool] = useState<Tool | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<Tool | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchTools = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/hub-wiedzy");
    const data = await res.json();
    setAllTools(Array.isArray(data) ? data : []);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchTools();
  }, [fetchTools]);

  const allTags = useMemo(() => {
    const tagSet = new Set<string>();
    allTools.forEach((t) => parseTags(t.tags).forEach((tag) => tagSet.add(tag)));
    return Array.from(tagSet).sort((a, b) => a.localeCompare(b, "pl"));
  }, [allTools]);

  const displayTools = useMemo(() => {
    let filtered = allTools;
    if (search) {
      const q = search.toLowerCase();
      filtered = filtered.filter(
        (t) =>
          t.name.toLowerCase().includes(q) ||
          t.description.toLowerCase().includes(q) ||
          t.tags.toLowerCase().includes(q)
      );
    }
    if (category !== "all") {
      filtered = filtered.filter((t) => t.category === category);
    }
    if (tagFilter !== "all") {
      filtered = filtered.filter((t) => parseTags(t.tags).includes(tagFilter));
    }
    return [...filtered].sort((a, b) => {
      if (a.isFavorite !== b.isFavorite) return a.isFavorite ? -1 : 1;
      if (!a.userId !== !b.userId) return !a.userId ? -1 : 1;
      return a.name.localeCompare(b.name, "pl");
    });
  }, [allTools, search, category, tagFilter]);

  const toggleFavorite = async (tool: Tool, e: React.MouseEvent) => {
    e.stopPropagation();
    const newVal = !tool.isFavorite;
    setAllTools((prev) =>
      prev.map((t) => (t.id === tool.id ? { ...t, isFavorite: newVal } : t))
    );
    await fetch(`/api/hub-wiedzy/${tool.id}/preference`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isFavorite: newVal }),
    });
  };

  const openAdd = () => {
    setEditTool(null);
    setForm(emptyForm);
    setDialogOpen(true);
  };

  const openEdit = async (tool: Tool, e: React.MouseEvent) => {
    e.stopPropagation();
    const res = await fetch(`/api/hub-wiedzy/${tool.id}`);
    const full = await res.json();
    setEditTool(tool);
    setForm({
      name: full.name,
      category: full.category,
      tags: full.tags ?? "",
      description: full.description,
      structure: full.structure,
      example: full.example,
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.name.trim() || !form.description.trim() || !form.structure.trim() || !form.example.trim()) {
      toast({ title: "Błąd", description: "Wypełnij wszystkie wymagane pola.", variant: "destructive" });
      return;
    }
    setSaving(true);
    if (editTool) {
      const res = await fetch(`/api/hub-wiedzy/${editTool.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      setSaving(false);
      if (res.ok) {
        toast({ title: "Zapisano zmiany" });
        setDialogOpen(false);
        fetchTools();
      } else {
        toast({ title: "Błąd", description: "Nie udało się zapisać.", variant: "destructive" });
      }
    } else {
      const res = await fetch("/api/hub-wiedzy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      setSaving(false);
      if (res.ok) {
        toast({ title: "Narzędzie dodane" });
        setDialogOpen(false);
        fetchTools();
      } else {
        toast({ title: "Błąd", description: "Nie udało się dodać narzędzia.", variant: "destructive" });
      }
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    const res = await fetch(`/api/hub-wiedzy/${deleteTarget.id}`, { method: "DELETE" });
    setDeleting(false);
    if (res.ok) {
      toast({ title: "Narzędzie usunięte" });
      setDeleteTarget(null);
      fetchTools();
    } else {
      toast({ title: "Błąd", description: "Nie udało się usunąć.", variant: "destructive" });
    }
  };

  return (
    <AppLayout>
      <div className="p-8 max-w-4xl mx-auto">
        {/* Premium gradient hero */}
        <div className="relative overflow-hidden rounded-2xl header-gradient-purple mb-8">
          <div className="absolute -top-6 -right-6 w-44 h-44 rounded-full bg-white/20 blur-2xl pointer-events-none" />
          <div className="absolute bottom-0 -left-4 w-36 h-36 rounded-full bg-purple-300/20 blur-2xl pointer-events-none" />
          <div className="relative z-10 px-7 py-6">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="w-11 h-11 rounded-2xl bg-white/20 border border-white/30 shadow-sm flex items-center justify-center shrink-0">
                  <BookOpen className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h1 className="text-xl font-semibold text-white">Hub wiedzy</h1>
                  <p className="text-sm text-white/70 mt-0.5">Narzędzia i techniki coachingowe.</p>
                </div>
              </div>
              <button
                onClick={openAdd}
                className="flex items-center gap-1.5 h-9 px-4 text-sm font-semibold bg-[#5A3FE0] text-white hover:bg-[#6e55e8] rounded-xl shadow-sm transition-colors shrink-0"
              >
                <Plus className="w-4 h-4" />
                Dodaj własną
              </button>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white dark:bg-card rounded-2xl border p-4 mb-6">
          <div className="flex flex-wrap gap-3">
            <div className="relative flex-1 min-w-[180px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Szukaj po nazwie, opisie, tagach..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger className="w-44">
                <SelectValue placeholder="Wszystkie kategorie" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Wszystkie kategorie</SelectItem>
                {CATEGORIES.map((c) => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={tagFilter} onValueChange={setTagFilter}>
              <SelectTrigger className="w-44">
                <SelectValue placeholder="Wszystkie tagi" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Wszystkie tagi</SelectItem>
                {allTags.map((tag) => (
                  <SelectItem key={tag} value={tag}>{tag}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Tools list */}
        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : displayTools.length === 0 ? (
          <div className="border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-2xl py-16 text-center">
            <BookOpen className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">Brak narzędzi. Zmień filtry lub dodaj własne.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {displayTools.map((tool) => {
              const isOwn = tool.userId !== null;
              const tags = parseTags(tool.tags);
              const visibleTags = tags.slice(0, 4);
              const hiddenCount = tags.length - visibleTags.length;

              return (
                <div
                  key={tool.id}
                  className="bg-white dark:bg-card rounded-2xl border px-5 py-4 hover:bg-blue-50/60 dark:hover:bg-blue-950/10 hover:border-blue-200 dark:hover:border-blue-900 hover:shadow-md transition-all cursor-pointer"
                  onClick={() => router.push(`/hub-wiedzy/${tool.id}`)}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-4 min-w-0 flex-1">
                      <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/30 flex items-center justify-center shrink-0 mt-0.5">
                        <BookOpen className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold truncate">{tool.name}</p>
                        <p className="text-sm text-muted-foreground line-clamp-1 mt-0.5">
                          {tool.description.split("\n")[0].replace(/^#+\s*/, "").replace(/\*\*/g, "").slice(0, 120)}
                        </p>
                        {tags.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {visibleTags.map((tag) => (
                              <button
                                key={tag}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setTagFilter(tag === tagFilter ? "all" : tag);
                                }}
                                className={cn(
                                  "inline-flex items-center rounded-full px-2 py-0.5 text-xs transition-colors border",
                                  tagFilter === tag
                                    ? "bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800"
                                    : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-transparent hover:border-slate-300 dark:hover:border-slate-600"
                                )}
                              >
                                {tag}
                              </button>
                            ))}
                            {hiddenCount > 0 && (
                              <span className="text-xs text-muted-foreground self-center">
                                +{hiddenCount}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className="hidden sm:inline-flex items-center text-xs font-medium bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-full px-2.5 py-0.5">
                        {tool.category}
                      </span>
                      {isOwn ? (
                        <span className="hidden sm:inline-flex items-center text-xs font-medium bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-300 rounded-full px-2.5 py-0.5">
                          Własna
                        </span>
                      ) : (
                        <span className="hidden sm:inline-flex items-center text-xs font-medium border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 rounded-full px-2.5 py-0.5">
                          Wbudowane
                        </span>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={(e) => toggleFavorite(tool, e)}
                        title={tool.isFavorite ? "Usuń z ulubionych" : "Dodaj do ulubionych"}
                      >
                        <Heart
                          className={cn(
                            "w-4 h-4 transition-colors",
                            tool.isFavorite ? "fill-rose-500 text-rose-500" : "text-muted-foreground"
                          )}
                        />
                      </Button>
                      {isOwn && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreVertical className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={(e) => openEdit(tool, e)}>
                              <Pencil className="w-4 h-4 mr-2" />
                              Edytuj
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="text-destructive"
                              onClick={(e) => { e.stopPropagation(); setDeleteTarget(tool); }}
                            >
                              <Trash2 className="w-4 h-4 mr-2" />
                              Usuń
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Add / Edit dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editTool ? "Edytuj narzędzie" : "Dodaj własne narzędzie"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="tool-name">Nazwa *</Label>
                <Input
                  id="tool-name"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="np. Model GROW"
                />
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
              <Label htmlFor="tool-tags">Tagi (oddzielone przecinkami)</Label>
              <Input
                id="tool-tags"
                value={form.tags}
                onChange={(e) => setForm({ ...form, tags: e.target.value })}
                placeholder="np. cel, planowanie, refleksja"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="tool-desc">Opis *</Label>
              <Textarea
                id="tool-desc"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Co to jest, kiedy stosować, na czym polega..."
                rows={4}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="tool-structure">Struktura / kroki *</Label>
              <Textarea
                id="tool-structure"
                value={form.structure}
                onChange={(e) => setForm({ ...form, structure: e.target.value })}
                placeholder="Kroki, etapy, pytania do każdego etapu... (Markdown)"
                rows={5}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="tool-example">Przykład użycia *</Label>
              <Textarea
                id="tool-example"
                value={form.example}
                onChange={(e) => setForm({ ...form, example: e.target.value })}
                placeholder="Dialog coach–klient, scenariusz zastosowania... (Markdown)"
                rows={5}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Anuluj</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : editTool ? "Zapisz zmiany" : "Dodaj"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <Dialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Usuń narzędzie</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground py-2">
            Czy na pewno chcesz usunąć <span className="font-medium text-foreground">{deleteTarget?.name}</span>? Tej operacji nie można cofnąć.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>Anuluj</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
              {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Usuń"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
