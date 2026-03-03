"use client";
import { useState, useRef, useCallback, useEffect } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import Underline from "@tiptap/extension-underline";
import TiptapLink from "@tiptap/extension-link";
import {
  Bold, Italic, Underline as UnderlineIcon, Heading1, Heading2, Heading3,
  List, ListOrdered, Quote, Undo2, Redo2, Link as LinkIcon,
  CheckCircle2, Loader2, Pin, PinOff, Trash2, BookMarked,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";

type SaveState = "idle" | "saving" | "saved" | "error";

function ToolbarBtn({
  onClick, active, disabled, title, children,
}: {
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
  title?: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onMouseDown={(e) => { e.preventDefault(); onClick(); }}
      disabled={disabled}
      title={title}
      className={cn(
        "p-1.5 rounded transition-colors",
        active
          ? "bg-slate-200 dark:bg-slate-700 text-foreground"
          : "text-muted-foreground hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-foreground",
        disabled && "opacity-30 cursor-not-allowed pointer-events-none"
      )}
    >
      {children}
    </button>
  );
}

const Divider = () => <div className="w-px h-4 bg-border mx-1 shrink-0" />;

interface NoteEditorProps {
  noteId: string;
  initialTitle: string;
  initialContent: object | null;
  isPinned: boolean;
  onSaved: (title: string, plainText: string) => void;
  onPinToggle: (isPinned: boolean) => void;
  onDelete: () => void;
}

export function NoteEditor({
  noteId, initialTitle, initialContent, isPinned,
  onSaved, onPinToggle, onDelete,
}: NoteEditorProps) {
  const [title, setTitle] = useState(initialTitle);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [pinned, setPinned] = useState(isPinned);

  const titleRef = useRef(initialTitle);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const doSave = useCallback(async (
    currentTitle: string,
    content: object,
    plainText: string,
  ) => {
    setSaveState("saving");
    try {
      const res = await fetch(`/api/notatnik/${noteId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: currentTitle, content, plainText }),
      });
      if (res.ok) {
        setSaveState("saved");
        onSaved(currentTitle, plainText);
        setTimeout(() => setSaveState((s) => s === "saved" ? "idle" : s), 2500);
      } else {
        setSaveState("error");
      }
    } catch {
      setSaveState("error");
    }
  }, [noteId, onSaved]);

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit,
      Placeholder.configure({ placeholder: "Zacznij pisać…" }),
      Underline,
      TiptapLink.configure({ openOnClick: false }),
    ],
    content: initialContent ?? undefined,
    editorProps: {
      attributes: {
        class: "tiptap-editor-content focus:outline-none min-h-[400px] text-sm",
      },
    },
    onUpdate({ editor }) {
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(() => {
        const content = editor.getJSON();
        const plainText = editor.getText().slice(0, 500);
        doSave(titleRef.current, content, plainText);
      }, 700);
    },
  });

  const scheduleSave = useCallback(() => {
    if (!editor) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      const content = editor.getJSON();
      const plainText = editor.getText().slice(0, 500);
      doSave(titleRef.current, content, plainText);
    }, 700);
  }, [editor, doSave]);

  useEffect(() => {
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, []);

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setTitle(val);
    titleRef.current = val;
    scheduleSave();
  };

  const handlePinToggle = async () => {
    const newPinned = !pinned;
    setPinned(newPinned);
    await fetch(`/api/notatnik/${noteId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isPinned: newPinned }),
    });
    onPinToggle(newPinned);
  };

  const handleDelete = async () => {
    await fetch(`/api/notatnik/${noteId}`, { method: "DELETE" });
    setDeleteOpen(false);
    onDelete();
  };

  const handleLinkInsert = () => {
    if (!editor) return;
    const prev = editor.getAttributes("link").href as string | undefined;
    const url = window.prompt("Adres URL:", prev ?? "https://");
    if (url === null) return;
    if (url === "") {
      editor.chain().focus().unsetLink().run();
    } else {
      editor.chain().focus().setLink({ href: url }).run();
    }
  };

  if (!editor) return null;

  return (
    <div className="flex flex-col h-full">
      {/* Note header — premium gradient */}
      <div className="relative overflow-hidden shrink-0 header-gradient">
        <div className="absolute -top-6 -right-6 w-36 h-36 rounded-full bg-white/20 blur-2xl pointer-events-none" />
        <div className="absolute bottom-0 -left-4 w-28 h-28 rounded-full bg-blue-300/20 blur-2xl pointer-events-none" />
        <div className="relative z-10 px-5 pt-4 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/20 border border-white/30 shadow-sm flex items-center justify-center shrink-0">
              <BookMarked className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <input
                type="text"
                value={title}
                onChange={handleTitleChange}
                placeholder="Tytuł notatki"
                className="w-full text-base font-semibold bg-transparent border-none outline-none placeholder:text-white/40 text-white min-w-0"
              />
              <p className="text-xs text-white/60 mt-0.5">Notatka osobista</p>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <button
                onClick={handlePinToggle}
                title={pinned ? "Odepnij notatkę" : "Przypnij notatkę"}
                className={cn(
                  "p-1.5 rounded-lg transition-colors",
                  pinned
                    ? "text-amber-300 hover:bg-white/10"
                    : "text-white/60 hover:bg-white/10 hover:text-white"
                )}
              >
                {pinned ? <PinOff className="w-4 h-4" /> : <Pin className="w-4 h-4" />}
              </button>
              <button
                onClick={() => setDeleteOpen(true)}
                title="Usuń notatkę"
                className="p-1.5 rounded-lg text-white/60 hover:bg-white/10 hover:text-red-300 transition-colors"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-0.5 px-3 py-2 border-b flex-wrap bg-slate-50/70 dark:bg-slate-900/30">
        <ToolbarBtn
          onClick={() => editor.chain().focus().toggleBold().run()}
          active={editor.isActive("bold")}
          title="Pogrubienie (Ctrl+B)"
        >
          <Bold className="w-3.5 h-3.5" />
        </ToolbarBtn>
        <ToolbarBtn
          onClick={() => editor.chain().focus().toggleItalic().run()}
          active={editor.isActive("italic")}
          title="Kursywa (Ctrl+I)"
        >
          <Italic className="w-3.5 h-3.5" />
        </ToolbarBtn>
        <ToolbarBtn
          onClick={() => editor.chain().focus().toggleUnderline().run()}
          active={editor.isActive("underline")}
          title="Podkreślenie (Ctrl+U)"
        >
          <UnderlineIcon className="w-3.5 h-3.5" />
        </ToolbarBtn>

        <Divider />

        <ToolbarBtn
          onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
          active={editor.isActive("heading", { level: 1 })}
          title="Nagłówek 1"
        >
          <Heading1 className="w-3.5 h-3.5" />
        </ToolbarBtn>
        <ToolbarBtn
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          active={editor.isActive("heading", { level: 2 })}
          title="Nagłówek 2"
        >
          <Heading2 className="w-3.5 h-3.5" />
        </ToolbarBtn>
        <ToolbarBtn
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
          active={editor.isActive("heading", { level: 3 })}
          title="Nagłówek 3"
        >
          <Heading3 className="w-3.5 h-3.5" />
        </ToolbarBtn>

        <Divider />

        <ToolbarBtn
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          active={editor.isActive("bulletList")}
          title="Lista punktowana"
        >
          <List className="w-3.5 h-3.5" />
        </ToolbarBtn>
        <ToolbarBtn
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          active={editor.isActive("orderedList")}
          title="Lista numerowana"
        >
          <ListOrdered className="w-3.5 h-3.5" />
        </ToolbarBtn>
        <ToolbarBtn
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          active={editor.isActive("blockquote")}
          title="Cytat"
        >
          <Quote className="w-3.5 h-3.5" />
        </ToolbarBtn>

        <Divider />

        <ToolbarBtn
          onClick={handleLinkInsert}
          active={editor.isActive("link")}
          title="Wstaw link"
        >
          <LinkIcon className="w-3.5 h-3.5" />
        </ToolbarBtn>

        <Divider />

        <ToolbarBtn
          onClick={() => editor.chain().focus().undo().run()}
          disabled={!editor.can().undo()}
          title="Cofnij (Ctrl+Z)"
        >
          <Undo2 className="w-3.5 h-3.5" />
        </ToolbarBtn>
        <ToolbarBtn
          onClick={() => editor.chain().focus().redo().run()}
          disabled={!editor.can().redo()}
          title="Ponów (Ctrl+Y)"
        >
          <Redo2 className="w-3.5 h-3.5" />
        </ToolbarBtn>

        {/* Save status */}
        <div className="ml-auto flex items-center h-4">
          {saveState === "saving" && (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Loader2 className="w-3 h-3 animate-spin" />
              Zapisywanie…
            </div>
          )}
          {saveState === "saved" && (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <CheckCircle2 className="w-3 h-3 text-emerald-500" />
              Zapisano
            </div>
          )}
          {saveState === "error" && (
            <span className="text-xs text-destructive">Błąd zapisu</span>
          )}
        </div>
      </div>

      {/* Editor canvas */}
      <div className="flex-1 overflow-y-auto px-6 py-5">
        <EditorContent editor={editor} />
      </div>

      {/* Delete confirmation dialog */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Usuń notatkę</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground py-2">
            Czy na pewno chcesz usunąć tę notatkę? Tej operacji nie da się cofnąć.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteOpen(false)}>Anuluj</Button>
            <Button variant="destructive" onClick={handleDelete}>Usuń</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
