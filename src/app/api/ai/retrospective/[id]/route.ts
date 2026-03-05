import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

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
