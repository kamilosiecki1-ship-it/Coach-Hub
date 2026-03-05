import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// POST /api/mentor/conversations/[id]/archive
// Archives the conversation if it has messages; deletes it if empty.
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Nieautoryzowany" }, { status: 401 });

  const userId = (session.user as { id: string }).id;

  const conversation = await prisma.mentorConversation.findFirst({
    where: { id: params.id, userId },
  });
  if (!conversation) return NextResponse.json({ error: "Nie znaleziono rozmowy" }, { status: 404 });

  const messageCount = await prisma.mentorMessage.count({
    where: { conversationId: params.id },
  });

  if (messageCount === 0) {
    await prisma.mentorConversation.delete({ where: { id: params.id } });
    return NextResponse.json({ deleted: true });
  }

  const updated = await prisma.mentorConversation.update({
    where: { id: params.id },
    data: { status: "ARCHIVED" },
  });

  return NextResponse.json(updated);
}
