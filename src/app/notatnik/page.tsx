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
      <div className="flex h-screen overflow-hidden p-4 gap-4 bg-slate-100/60 dark:bg-background">

        {/* ── Left panel: notes list ── */}
        <div className="w-72 shrink-0 flex flex-col bg-white dark:bg-card rounded-2xl border overflow-hidden shadow-sm">

          {/* Header — blue gradient */}
          <div className="header-gradient px-4 pt-4 pb-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <BookMarked className="w-4 h-4 text-white/80" />
                <h1 className="text-sm font-semibold text-white">Notatnik</h1>
              </div>
              <Button
                size="sm"
                onClick={createNote}
                disabled={creating}
                className="h-7 px-2.5 text-xs gap-1 bg-white/20 hover:bg-white/30 text-white border-white/20 border backdrop-blur-sm"
              >
                {creating
                  ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  : <Plus className="w-3.5 h-3.5" />
                }
                Nowa
              </Button>
            </div>
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/60 pointer-events-none" />
              <input
                type="text"
                placeholder="Szukaj…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-8 pr-3 h-8 text-sm bg-white/20 border border-white/20 rounded-lg text-white placeholder:text-white/50 outline-none focus:bg-white/30 transition-colors"
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
                <div
                  key={note.id}
                  className={cn(
                    "group relative border-b last:border-0 transition-colors border-l-2",
                    selectedNote?.id === note.id
                      ? "bg-blue-50 dark:bg-blue-950/20 border-l-blue-600 dark:border-l-blue-400"
                      : "hover:bg-white dark:hover:bg-slate-800/40 border-l-transparent"
                  )}
                >
                  <button
                    onClick={() => selectNote(note.id)}
                    className="w-full text-left px-4 py-3.5 pr-10"
                  >
                    <div className="flex items-start gap-2 mb-0.5">
                      {note.isPinned && (
                        <Pin className="w-3 h-3 text-amber-500 shrink-0 mt-0.5 fill-amber-400" />
                      )}
                      <span className={cn(
                        "text-sm truncate",
                        selectedNote?.id === note.id ? "font-semibold" : "font-medium"
                      )}>
                        {note.title}
                      </span>
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

                  {/* Pin toggle — visible on hover or when pinned */}
                  <button
                    onClick={async (e) => {
                      e.stopPropagation();
                      const newPinned = !note.isPinned;
                      await fetch(`/api/notatnik/${note.id}`, {
                        method: "PATCH",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ isPinned: newPinned }),
                      });
                      handlePinToggle(note.id, newPinned);
                      if (selectedNote?.id === note.id) {
                        setSelectedNote((prev) => prev ? { ...prev, isPinned: newPinned } : prev);
                      }
                    }}
                    title={note.isPinned ? "Odepnij" : "Przypnij"}
                    className={cn(
                      "absolute right-2 top-3.5 p-1.5 rounded-lg transition-all",
                      note.isPinned
                        ? "text-amber-500 opacity-100"
                        : "text-muted-foreground/40 opacity-0 group-hover:opacity-100 hover:text-amber-500"
                    )}
                  >
                    <Pin className={cn("w-3.5 h-3.5", note.isPinned && "fill-amber-400")} />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        {/* ── Right panel: editor ── */}
        <div className="flex-1 flex flex-col overflow-hidden bg-white dark:bg-card rounded-2xl border shadow-sm">
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
