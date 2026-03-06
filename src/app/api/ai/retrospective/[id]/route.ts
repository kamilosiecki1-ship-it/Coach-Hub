import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// PATCH /api/ai/retrospective/[id]
// Body: { reportJson: object } — update structured JSON (v1); or { reportMd: string } — update legacy markdown
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Nieautoryzowany" }, { status: 401 });

  const userId = (session.user as { id: string }).id;
  const retro = await prisma.retrospective.findFirst({
    where: { id: params.id, client: { userId } },
  });
  if (!retro) return NextResponse.json({ error: "Nie znaleziono retrospektywy" }, { status: 404 });

  const body = await req.json().catch(() => ({}));
  const { reportMd, reportJson } = body as { reportMd?: string; reportJson?: object };

  if (!reportJson && typeof reportMd !== "string") {
    return NextResponse.json({ error: "reportJson lub reportMd jest wymagane" }, { status: 400 });
  }

  const updated = reportJson
    ? await prisma.retrospective.update({
        where: { id: params.id },
        data: { reportJson: reportJson as object, reportMd: null },
      })
    : await prisma.retrospective.update({
        where: { id: params.id },
        data: { reportMd: reportMd!, reportJson: { set: null } },
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
