"use client";
import { useState, useEffect, useCallback } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { NoteEditor } from "@/components/notes/NoteEditor";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Search, BookMarked, Pin, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import { pl } from "date-fns/locale";

type NoteSummary = {
  id: string;
  title: string;
  plainText: string | null;
  isPinned: boolean;
  updatedAt: string;
};

type NoteDetail = NoteSummary & {
  content: object;
};

export default function NotatnikPage() {
  const [notes, setNotes] = useState<NoteSummary[]>([]);
  const [selectedNote, setSelectedNote] = useState<NoteDetail | null>(null);
  const [loadingList, setLoadingList] = useState(true);
  const [loadingNote, setLoadingNote] = useState(false);
  const [search, setSearch] = useState("");
  const [creating, setCreating] = useState(false);

  const fetchNotes = useCallback(async (q?: string) => {
    setLoadingList(true);
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    const res = await fetch(`/api/notatnik?${params}`);
    const data = await res.json();
    setNotes(Array.isArray(data) ? data : []);
    setLoadingList(false);
  }, []);

  useEffect(() => {
    const t = setTimeout(() => fetchNotes(search), 300);
    return () => clearTimeout(t);
  }, [search, fetchNotes]);

  const selectNote = async (id: string) => {
    if (selectedNote?.id === id) return;
    setLoadingNote(true);
    const res = await fetch(`/api/notatnik/${id}`);
    const data = await res.json();
    setSelectedNote(data);
    setLoadingNote(false);
  };

  const createNote = async () => {
    setCreating(true);
    const res = await fetch("/api/notatnik", { method: "POST" });
    const note = await res.json();
    setCreating(false);
    const summary: NoteSummary = {
      id: note.id,
      title: note.title,
      plainText: null,
      isPinned: false,
      updatedAt: note.updatedAt,
    };
    setNotes((prev) => [summary, ...prev]);
    setSelectedNote({ ...summary, content: note.content });
  };

  const handleSaved = (id: string, title: string, plainText: string) => {
    setNotes((prev) =>
      prev.map((n) =>
        n.id === id
          ? { ...n, title, plainText, updatedAt: new Date().toISOString() }
          : n
      )
    );
  };

  const handleDelete = (id: string) => {
    setNotes((prev) => prev.filter((n) => n.id !== id));
    setSelectedNote(null);
  };

  const handlePinToggle = (id: string, isPinned: boolean) => {
    setNotes((prev) => {
      const updated = prev.map((n) => (n.id === id ? { ...n, isPinned } : n));
      return [...updated].sort((a, b) => {
        if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1;
        return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
      });
    });
  };

  return (
    <AppLayout>
      <div className="flex h-screen overflow-hidden">

        {/* ── Left panel: notes list ── */}
        <div className="w-80 shrink-0 border-r flex flex-col bg-slate-50/50 dark:bg-slate-900/30 overflow-hidden">

          {/* Header */}
          <div className="px-4 pt-5 pb-3 border-b bg-white dark:bg-card">
            <div className="flex items-center justify-between mb-3">
              <h1 className="text-base font-semibold">Notatnik</h1>
              <Button size="sm" onClick={createNote} disabled={creating} className="h-7 px-2.5 text-xs gap-1">
                {creating
                  ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  : <Plus className="w-3.5 h-3.5" />
                }
                Nowa
              </Button>
            </div>
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
              <Input
                placeholder="Szukaj…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8 h-8 text-sm"
              />
            </div>
          </div>

          {/* Notes list */}
          <div className="flex-1 overflow-y-auto">
            {loadingList ? (
              <div className="flex justify-center py-10">
                <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
              </div>
            ) : notes.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 px-5 text-center">
                <BookMarked className="w-9 h-9 text-muted-foreground/25 mb-3" />
                <p className="text-sm font-medium text-muted-foreground">
                  {search ? "Brak wyników" : "Brak notatek"}
                </p>
                {!search && (
                  <p className="text-xs text-muted-foreground/60 mt-1">
                    Utwórz pierwszą notatkę.
                  </p>
                )}
              </div>
            ) : (
              notes.map((note) => (
                <button
                  key={note.id}
                  onClick={() => selectNote(note.id)}
                  className={cn(
                    "w-full text-left px-4 py-3.5 border-b last:border-0 transition-colors",
                    selectedNote?.id === note.id
                      ? "bg-blue-50 dark:bg-blue-950/20 border-l-2 border-l-blue-600 dark:border-l-blue-400"
                      : "hover:bg-white dark:hover:bg-slate-800/40 border-l-2 border-l-transparent"
                  )}
                >
                  <div className="flex items-start justify-between gap-2 mb-0.5">
                    <span className={cn(
                      "text-sm truncate",
                      selectedNote?.id === note.id ? "font-semibold" : "font-medium"
                    )}>
                      {note.title}
                    </span>
                    {note.isPinned && (
                      <Pin className="w-3 h-3 text-amber-500 shrink-0 mt-0.5 fill-amber-400" />
                    )}
                  </div>
                  {note.plainText && (
                    <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">
                      {note.plainText.slice(0, 140)}
                    </p>
                  )}
                  <p className="text-[10px] text-muted-foreground/50 mt-1.5">
                    {formatDistanceToNow(new Date(note.updatedAt), { addSuffix: true, locale: pl })}
                  </p>
                </button>
              ))
            )}
          </div>
        </div>

        {/* ── Right panel: editor ── */}
        <div className="flex-1 flex flex-col overflow-hidden bg-white dark:bg-card">
          {loadingNote ? (
            <div className="flex-1 flex items-center justify-center">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : selectedNote ? (
            <NoteEditor
              key={selectedNote.id}
              noteId={selectedNote.id}
              initialTitle={selectedNote.title}
              initialContent={selectedNote.content}
              isPinned={selectedNote.isPinned}
              onSaved={(title, plainText) => handleSaved(selectedNote.id, title, plainText)}
              onPinToggle={(isPinned) => handlePinToggle(selectedNote.id, isPinned)}
              onDelete={() => handleDelete(selectedNote.id)}
            />
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center px-8 gap-3">
              <BookMarked className="w-14 h-14 text-muted-foreground/15" />
              <p className="text-sm text-muted-foreground">
                {notes.length === 0
                  ? "Brak notatek. Utwórz pierwszą notatkę."
                  : "Wybierz notatkę z listy lub utwórz nową."}
              </p>
              <Button size="sm" variant="outline" onClick={createNote} disabled={creating}>
                {creating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                Nowa notatka
              </Button>
            </div>
          )}
        </div>

      </div>
    </AppLayout>
  );
}
