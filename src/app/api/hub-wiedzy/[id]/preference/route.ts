import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type Params = { params: { id: string } };

export async function POST(req: NextRequest, { params }: Params) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Nieautoryzowany" }, { status: 401 });
  }

  const userId = (session.user as { id: string }).id;

  // Verify tool exists and is accessible
  const tool = await prisma.knowledgeTool.findFirst({
    where: { id: params.id, OR: [{ userId: null }, { userId }] },
    select: { id: true },
  });
  if (!tool) {
    return NextResponse.json({ error: "Nie znaleziono narzędzia" }, { status: 404 });
  }

  const body = await req.json();
  const { isFavorite, note } = body as { isFavorite?: boolean; note?: string };

  const pref = await prisma.userToolPreference.upsert({
    where: { userId_toolId: { userId, toolId: params.id } },
    update: {
      ...(isFavorite !== undefined && { isFavorite }),
      ...(note !== undefined && { note }),
    },
    create: {
      userId,
      toolId: params.id,
      isFavorite: isFavorite ?? false,
      note: note ?? "",
    },
  });

  return NextResponse.json(pref);
}
