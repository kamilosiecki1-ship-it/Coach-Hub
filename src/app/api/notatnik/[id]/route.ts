import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type Params = { params: { id: string } };

// GET /api/notatnik/[id] — get single note (full content)
export async function GET(_req: NextRequest, { params }: Params) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Nieautoryzowany" }, { status: 401 });

  const userId = (session.user as { id: string }).id;

  const note = await prisma.note.findFirst({ where: { id: params.id, userId } });
  if (!note) return NextResponse.json({ error: "Nie znaleziono notatki" }, { status: 404 });

  return NextResponse.json(note);
}

// PATCH /api/notatnik/[id] — update note fields
export async function PATCH(req: NextRequest, { params }: Params) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Nieautoryzowany" }, { status: 401 });

  const userId = (session.user as { id: string }).id;

  const existing = await prisma.note.findFirst({ where: { id: params.id, userId } });
  if (!existing) return NextResponse.json({ error: "Nie znaleziono notatki" }, { status: 404 });

  const body = await req.json();
  const { title, content, plainText, isPinned } = body;

  const note = await prisma.note.update({
    where: { id: params.id },
    data: {
      ...(title !== undefined ? { title: title || "Nowa notatka" } : {}),
      ...(content !== undefined ? { content } : {}),
      ...(plainText !== undefined ? { plainText } : {}),
      ...(isPinned !== undefined ? { isPinned } : {}),
    },
  });

  return NextResponse.json(note);
}

// DELETE /api/notatnik/[id] — delete note
export async function DELETE(_req: NextRequest, { params }: Params) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Nieautoryzowany" }, { status: 401 });

  const userId = (session.user as { id: string }).id;

  const existing = await prisma.note.findFirst({ where: { id: params.id, userId } });
  if (!existing) return NextResponse.json({ error: "Nie znaleziono notatki" }, { status: 404 });

  await prisma.note.delete({ where: { id: params.id } });

  return NextResponse.json({ ok: true });
}
