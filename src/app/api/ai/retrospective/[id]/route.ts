import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// PATCH /api/ai/retrospective/[id]
// Body: { reportMd: string }
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Nieautoryzowany" }, { status: 401 });

  const userId = (session.user as { id: string }).id;
  const retro = await prisma.retrospective.findFirst({
    where: { id: params.id, client: { userId } },
  });
  if (!retro) return NextResponse.json({ error: "Nie znaleziono retrospektywy" }, { status: 404 });

  const body = await req.json().catch(() => ({}));
  const { reportMd } = body as { reportMd?: string };
  if (typeof reportMd !== "string") {
    return NextResponse.json({ error: "reportMd jest wymagane" }, { status: 400 });
  }

  const updated = await prisma.retrospective.update({
    where: { id: params.id },
    data: { reportMd, reportJson: { set: null } },
  });

  return NextResponse.json(updated);
}

// DELETE /api/ai/retrospective/[id]
export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Nieautoryzowany" }, { status: 401 });
  }

  const userId = (session.user as { id: string }).id;

  // Verify ownership via the client relation
  const retro = await prisma.retrospective.findFirst({
    where: { id: params.id, client: { userId } },
  });

  if (!retro) {
    return NextResponse.json({ error: "Nie znaleziono retrospektywy" }, { status: 404 });
  }

  await prisma.retrospective.delete({ where: { id: params.id } });

  return NextResponse.json({ ok: true });
}
