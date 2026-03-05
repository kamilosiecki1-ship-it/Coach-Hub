import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET /api/mentor/conversations/[id]/messages
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Nieautoryzowany" }, { status: 401 });

  const userId = (session.user as { id: string }).id;

  const conversation = await prisma.mentorConversation.findFirst({
    where: { id: params.id, userId },
  });
  if (!conversation) return NextResponse.json({ error: "Nie znaleziono rozmowy" }, { status: 404 });

  const messages = await prisma.mentorMessage.findMany({
    where: { conversationId: params.id },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json(messages);
}
