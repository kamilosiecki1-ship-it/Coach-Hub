import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type Params = { params: { id: string } };

export async function GET(_req: NextRequest, { params }: Params) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Nieautoryzowany" }, { status: 401 });
  }

  const userId = (session.user as { id: string }).id;
  const tool = await prisma.knowledgeTool.findFirst({
    where: { id: params.id, OR: [{ userId: null }, { userId }] },
    include: {
      userPreferences: {
        where: { userId },
        select: { isFavorite: true, note: true },
      },
    },
  });

  if (!tool) {
    return NextResponse.json({ error: "Nie znaleziono narzędzia" }, { status: 404 });
  }

  const { userPreferences, ...rest } = tool;
  return NextResponse.json({
    ...rest,
    isFavorite: userPreferences[0]?.isFavorite ?? false,
    note: userPreferences[0]?.note ?? "",
  });
}

export async function PATCH(req: NextRequest, { params }: Params) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Nieautoryzowany" }, { status: 401 });
  }

  const userId = (session.user as { id: string }).id;
  const tool = await prisma.knowledgeTool.findFirst({
    where: { id: params.id, userId },
  });

  if (!tool) {
    return NextResponse.json({ error: "Nie znaleziono narzędzia lub brak uprawnień" }, { status: 404 });
  }

  const { name, category, tags, description, structure, example } = await req.json();

  const updated = await prisma.knowledgeTool.update({
    where: { id: params.id },
    data: {
      ...(name !== undefined && { name }),
      ...(category !== undefined && { category }),
      ...(tags !== undefined && { tags }),
      ...(description !== undefined && { description }),
      ...(structure !== undefined && { structure }),
      ...(example !== undefined && { example }),
    },
  });

  return NextResponse.json(updated);
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Nieautoryzowany" }, { status: 401 });
  }

  const userId = (session.user as { id: string }).id;
  const tool = await prisma.knowledgeTool.findFirst({
    where: { id: params.id, userId },
  });

  if (!tool) {
    return NextResponse.json({ error: "Nie znaleziono narzędzia lub brak uprawnień" }, { status: 404 });
  }

  await prisma.knowledgeTool.delete({ where: { id: params.id } });

  return NextResponse.json({ ok: true });
}
