import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Nieautoryzowany" }, { status: 401 });
  }

  const userId = (session.user as { id: string }).id;

  const tools = await prisma.knowledgeTool.findMany({
    where: { OR: [{ userId: null }, { userId }] },
    select: {
      id: true,
      userId: true,
      name: true,
      category: true,
      tags: true,
      description: true,
      createdAt: true,
      userPreferences: {
        where: { userId },
        select: { isFavorite: true },
      },
    },
  });

  const result = tools.map((t) => ({
    id: t.id,
    userId: t.userId,
    name: t.name,
    category: t.category,
    tags: t.tags,
    description: t.description,
    createdAt: t.createdAt,
    isFavorite: t.userPreferences[0]?.isFavorite ?? false,
  }));

  return NextResponse.json(result);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Nieautoryzowany" }, { status: 401 });
  }

  const userId = (session.user as { id: string }).id;
  const { name, category, tags, description, structure, example } = await req.json();

  if (!name || !category || !description || !structure || !example) {
    return NextResponse.json(
      { error: "Brak wymaganych pól: name, category, description, structure, example" },
      { status: 400 }
    );
  }

  const tool = await prisma.knowledgeTool.create({
    data: { userId, name, category, tags: tags ?? "", description, structure, example },
  });

  return NextResponse.json(tool, { status: 201 });
}
