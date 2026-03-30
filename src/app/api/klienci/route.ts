import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const createClientSchema = z.object({
  name: z.string().min(1).max(200),
  email: z.string().email().optional(),
  phone: z.string().max(20).optional(),
  company: z.string().max(200).optional(),
  role: z.string().max(200).optional(),
  stage: z.enum(["Wstęp", "W trakcie", "Zakończony"]).optional(),
  generalNote: z.string().max(5000).optional(),
});

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Nieautoryzowany" }, { status: 401 });
  }

  const userId = (session.user as { id: string }).id;
  const { searchParams } = new URL(req.url);
  const stage = searchParams.get("stage");
  const search = searchParams.get("search");

  const clients = await prisma.client.findMany({
    where: {
      userId,
      ...(stage ? { stage } : {}),
      ...(search
        ? {
            OR: [
              { name: { contains: search } },
              { company: { contains: search } },
              { role: { contains: search } },
            ],
          }
        : {}),
    },
    orderBy: { updatedAt: "desc" },
    include: {
      _count: { select: { sessions: true } },
      sessions: { orderBy: { scheduledAt: "desc" }, take: 1 },
    },
  });

  return NextResponse.json(clients);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Nieautoryzowany" }, { status: 401 });
  }

  const userId = (session.user as { id: string }).id;
  const body = await req.json();
  const parsed = createClientSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Nieprawidłowe dane", details: parsed.error.flatten() }, { status: 400 });
  }
  const { name, company, role, stage, generalNote } = parsed.data;

  const client = await prisma.client.create({
    data: {
      userId,
      name: name.trim(),
      company: company?.trim() || null,
      role: role?.trim() || null,
      stage: stage || "Wstęp",
      generalNote: generalNote?.trim() || null,
    },
  });

  return NextResponse.json(client, { status: 201 });
}
