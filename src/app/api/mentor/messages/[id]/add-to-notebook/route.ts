import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// ─── Markdown → TipTap JSON converter ────────────────────────────────────────

interface TipTapNode {
  type: string;
  attrs?: Record<string, unknown>;
  content?: TipTapNode[];
  marks?: Array<{ type: string }>;
  text?: string;
}

/** Parse inline markdown (bold, italic, bold+italic) into TipTap text nodes. */
function parseInline(text: string): TipTapNode[] {
  const nodes: TipTapNode[] = [];
  let remaining = text;

  while (remaining.length > 0) {
    // Bold + italic: ***text***
    const tripleMatch = remaining.match(/^\*{3}([^*]+?)\*{3}/);
    if (tripleMatch) {
      nodes.push({ type: "text", marks: [{ type: "bold" }, { type: "italic" }], text: tripleMatch[1] });
      remaining = remaining.slice(tripleMatch[0].length);
      continue;
    }
    // Bold: **text**
    const boldMatch = remaining.match(/^\*\*([^*]+?)\*\*/);
    if (boldMatch) {
      nodes.push({ type: "text", marks: [{ type: "bold" }], text: boldMatch[1] });
      remaining = remaining.slice(boldMatch[0].length);
      continue;
    }
    // Italic: *text*
    const italicMatch = remaining.match(/^\*([^*]+?)\*/);
    if (italicMatch) {
      nodes.push({ type: "text", marks: [{ type: "italic" }], text: italicMatch[1] });
      remaining = remaining.slice(italicMatch[0].length);
      continue;
    }
    // Plain text up to next asterisk
    const plainMatch = remaining.match(/^[^*]+/);
    if (plainMatch) {
      nodes.push({ type: "text", text: plainMatch[0] });
      remaining = remaining.slice(plainMatch[0].length);
      continue;
    }
    // Consume a single unmatched asterisk as plain text
    nodes.push({ type: "text", text: remaining[0] });
    remaining = remaining.slice(1);
  }

  return nodes.length > 0 ? nodes : [{ type: "text", text: " " }];
}

/** Convert a markdown string to TipTap document JSON. */
function markdownToTipTap(markdown: string): TipTapNode {
  const lines = markdown.split("\n");
  const content: TipTapNode[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Heading: # / ## / ### / etc.
    const hMatch = line.match(/^(#{1,6})\s+(.+)$/);
    if (hMatch) {
      content.push({
        type: "heading",
        attrs: { level: hMatch[1].length },
        content: parseInline(hMatch[2].trim()),
      });
      i++;
      continue;
    }

    // Horizontal rule: --- (3+ dashes)
    if (line.match(/^-{3,}\s*$/)) {
      content.push({ type: "horizontalRule" });
      i++;
      continue;
    }

    // Bullet list: - item or * item
    if (line.match(/^[-*]\s+/)) {
      const items: TipTapNode[] = [];
      while (i < lines.length && lines[i].match(/^[-*]\s+/)) {
        items.push({
          type: "listItem",
          content: [{ type: "paragraph", content: parseInline(lines[i].replace(/^[-*]\s+/, "")) }],
        });
        i++;
      }
      content.push({ type: "bulletList", content: items });
      continue;
    }

    // Ordered list: 1. item or 1) item
    if (line.match(/^\d+[.)]\s+/)) {
      const items: TipTapNode[] = [];
      while (i < lines.length && lines[i].match(/^\d+[.)]\s+/)) {
        items.push({
          type: "listItem",
          content: [{ type: "paragraph", content: parseInline(lines[i].replace(/^\d+[.)]\s+/, "")) }],
        });
        i++;
      }
      content.push({ type: "orderedList", content: items });
      continue;
    }

    // Blockquote: > text
    if (line.startsWith(">")) {
      const bqItems: TipTapNode[] = [];
      while (i < lines.length && lines[i].startsWith(">")) {
        const bqText = lines[i].replace(/^>\s*/, "");
        if (bqText.trim()) {
          bqItems.push({ type: "paragraph", content: parseInline(bqText) });
        }
        i++;
      }
      if (bqItems.length > 0) {
        content.push({ type: "blockquote", content: bqItems });
      }
      continue;
    }

    // Empty line — skip
    if (line.trim() === "") {
      i++;
      continue;
    }

    // Paragraph — collect consecutive non-special lines
    const paraLines: string[] = [];
    while (
      i < lines.length &&
      lines[i].trim() !== "" &&
      !lines[i].match(/^#{1,6}\s/) &&
      !lines[i].match(/^[-*]\s+/) &&
      !lines[i].match(/^\d+[.)]\s+/) &&
      !lines[i].match(/^-{3,}\s*$/) &&
      !lines[i].startsWith(">")
    ) {
      paraLines.push(lines[i]);
      i++;
    }
    if (paraLines.length > 0) {
      content.push({ type: "paragraph", content: parseInline(paraLines.join(" ")) });
    }
  }

  return {
    type: "doc",
    content: content.length > 0 ? content : [{ type: "paragraph" }],
  };
}

// ─── Route handler ────────────────────────────────────────────────────────────

// POST /api/mentor/messages/[id]/add-to-notebook
// Creates a new note in Notatnik with the assistant message content,
// preserving markdown formatting and linking back to the source conversation.
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Nieautoryzowany" }, { status: 401 });

  const userId = (session.user as { id: string }).id;

  // Get message and its conversation
  const message = await prisma.mentorMessage.findFirst({
    where: { id: params.id },
    include: { conversation: true },
  });

  if (!message) return NextResponse.json({ error: "Nie znaleziono wiadomości" }, { status: 404 });

  // Verify ownership via conversation
  if (message.conversation.userId !== userId) {
    return NextResponse.json({ error: "Nieautoryzowany" }, { status: 403 });
  }

  const title = message.conversation.title.slice(0, 80);

  const note = await prisma.note.create({
    data: {
      userId,
      title,
      content: markdownToTipTap(message.content) as object,
      plainText: message.content.slice(0, 500),
      sourceConversationId: message.conversationId,
      sourceMessageId: message.id,
      sourceConversationTitle: message.conversation.title,
      sourceClientId: message.conversation.clientId,
    },
  });

  return NextResponse.json({ noteId: note.id });
}
