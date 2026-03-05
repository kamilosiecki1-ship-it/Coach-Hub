import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// DELETE /api/mentor/conversations/[id]
export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Nieautoryzowany" }, { status: 401 });

  const userId = (session.user as { id: string }).id;

  const conversation = await prisma.mentorConversation.findFirst({
    where: { id: params.id, userId },
  });

  if (!conversation) {
    return NextResponse.json({ error: "Nie znaleziono rozmowy" }, { status: 404 });
  }

  await prisma.mentorConversation.delete({ where: { id: params.id } });

  return NextResponse.json({ ok: true });
}
