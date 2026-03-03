"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import { Markdown } from "tiptap-markdown";
import {
  CheckCircle2, Loader2,
  Bold, Italic, Heading1, Heading2,
  List, ListOrdered, Quote, Minus, Undo2, Redo2,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface MarkdownEditorProps {
  sessionId: string;
  initialValue: string;
  onSave?: (value: string) => void;
}

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

export function MarkdownEditor({ sessionId, initialValue, onSave }: MarkdownEditorProps) {
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSavedRef = useRef(initialValue);
  const currentMdRef = useRef(initialValue);

  const save = useCallback(async (text: string) => {
    if (text === lastSavedRef.current) return;
    setSaveState("saving");
    try {
      const res = await fetch(`/api/sesje/${sessionId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notesMd: text }),
      });
      if (res.ok) {
        lastSavedRef.current = text;
        setSaveState("saved");
        onSave?.(text);
        setTimeout(() => setSaveState("idle"), 2000);
      } else {
        setSaveState("error");
      }
    } catch {
      setSaveState("error");
    }
  }, [sessionId, onSave]);

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit,
      Placeholder.configure({ placeholder: "Wprowadź notatki z sesji..." }),
      Markdown.configure({ html: false, transformPastedText: true }),
    ],
    content: initialValue,
    editorProps: {
      attributes: {
        class: "tiptap-editor-content focus:outline-none min-h-[380px] text-sm",
      },
    },
    onUpdate({ editor }) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const md = (editor.storage as any).markdown.getMarkdown() as string;
      currentMdRef.current = md;
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(() => save(md), 1500);
    },
  });

  useEffect(() => {
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
      if (currentMdRef.current !== lastSavedRef.current) save(currentMdRef.current);
    };
  }, [save]);

  if (!editor) return null;

  return (
    <div className="flex flex-col h-full">
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
          onClick={() => editor.chain().focus().setHorizontalRule().run()}
          title="Linia podziału"
        >
          <Minus className="w-3.5 h-3.5" />
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
              Zapisywanie...
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

      {/* Editor content */}
      <div className="flex-1 overflow-y-auto px-5 py-4">
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}
