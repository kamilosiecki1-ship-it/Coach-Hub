import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const createKnowledgeToolSchema = z.object({
  name: z.string().min(1).max(300),
  category: z.string().min(1).max(100),
  tags: z.string().max(500).optional(),
  description: z.string().max(50000),
  structure: z.string().max(50000),
  example: z.string().max(50000),
});

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
  const body = await req.json();
  const parsed = createKnowledgeToolSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Nieprawidłowe dane", details: parsed.error.flatten() }, { status: 400 });
  }
  const { name, category, tags, description, structure, example } = parsed.data;

  const tool = await prisma.knowledgeTool.create({
    data: { userId, name, category, tags: tags ?? "", description, structure, example },
  });

  return NextResponse.json(tool, { status: 201 });
}
