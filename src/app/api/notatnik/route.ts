import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET /api/notatnik?q= — list notes for current user
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Nieautoryzowany" }, { status: 401 });

  const userId = (session.user as { id: string }).id;
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q");

  const notes = await prisma.note.findMany({
    where: {
      userId,
      ...(q
        ? {
            OR: [
              { title: { contains: q, mode: "insensitive" } },
              { plainText: { contains: q, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    select: { id: true, title: true, plainText: true, isPinned: true, updatedAt: true },
    orderBy: [{ isPinned: "desc" }, { updatedAt: "desc" }],
  });

  return NextResponse.json(notes);
}

// POST /api/notatnik — create blank note
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Nieautoryzowany" }, { status: 401 });

  const userId = (session.user as { id: string }).id;

  const note = await prisma.note.create({
    data: {
      userId,
      title: "Nowa notatka",
      content: { type: "doc", content: [{ type: "paragraph" }] },
    },
  });

  return NextResponse.json(note, { status: 201 });
}
