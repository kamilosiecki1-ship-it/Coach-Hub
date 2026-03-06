"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import TiptapLink from "@tiptap/extension-link";
import Highlight from "@tiptap/extension-highlight";
import { Markdown } from "tiptap-markdown";
import {
  CheckCircle2, Loader2,
  Bold, Italic, Heading1, Heading2,
  List, ListOrdered, Quote, Minus, Undo2, Redo2, Highlighter,
} from "lucide-react";
import { cn } from "@/lib/utils";

const HIGHLIGHT_COLORS = [
  { color: "#FEF08A", label: "Żółty" },
  { color: "#BBF7D0", label: "Zielony" },
  { color: "#BAE6FD", label: "Niebieski" },
  { color: "#FBCFE8", label: "Różowy" },
  { color: "#DDD6FE", label: "Fioletowy" },
];

interface MarkdownEditorProps {
  sessionId: string;
  initialValue: string;
  saveField?: string; // default "notesMd"
  placeholder?: string;
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

export function MarkdownEditor({ sessionId, initialValue, saveField = "notesMd", placeholder, onSave }: MarkdownEditorProps) {
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [showHighlightPicker, setShowHighlightPicker] = useState(false);
  const highlightPickerRef = useRef<HTMLDivElement>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSavedRef = useRef(initialValue);
  const currentMdRef = useRef(initialValue);

  useEffect(() => {
    if (!showHighlightPicker) return;
    function handle(e: MouseEvent) {
      if (!highlightPickerRef.current?.contains(e.target as Node)) {
        setShowHighlightPicker(false);
      }
    }
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, [showHighlightPicker]);

  const save = useCallback(async (text: string) => {
    if (text === lastSavedRef.current) return;
    setSaveState("saving");
    try {
      const res = await fetch(`/api/sesje/${sessionId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [saveField]: text }),
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
      Placeholder.configure({ placeholder: placeholder ?? "Wprowadź notatki z sesji..." }),
      TiptapLink.configure({ openOnClick: true, autolink: true }),
      Highlight.configure({ multicolor: true }),
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

        {/* Highlight color picker */}
        <div className="relative" ref={highlightPickerRef}>
          <ToolbarBtn
            onClick={() => setShowHighlightPicker((p) => !p)}
            active={editor.isActive("highlight") || showHighlightPicker}
            title="Podświetlenie tekstu"
          >
            <Highlighter className="w-3.5 h-3.5" />
          </ToolbarBtn>
          {showHighlightPicker && (
            <div className="absolute top-full left-0 mt-1 flex items-center gap-1 p-1.5 rounded-lg border bg-background shadow-md z-50">
              {HIGHLIGHT_COLORS.map(({ color, label }) => (
                <button
                  key={color}
                  type="button"
                  title={label}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    editor.chain().focus().toggleHighlight({ color }).run();
                    setShowHighlightPicker(false);
                  }}
                  className="w-5 h-5 rounded-full border border-black/10 hover:scale-110 transition-transform shrink-0"
                  style={{ backgroundColor: color }}
                />
              ))}
              <button
                type="button"
                title="Usuń podświetlenie"
                onMouseDown={(e) => {
                  e.preventDefault();
                  editor.chain().focus().unsetHighlight().run();
                  setShowHighlightPicker(false);
                }}
                className="w-5 h-5 rounded-full border border-dashed border-slate-300 dark:border-slate-600 flex items-center justify-center hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-slate-400 text-[10px] leading-none shrink-0"
              >
                ✕
              </button>
            </div>
          )}
        </div>

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
