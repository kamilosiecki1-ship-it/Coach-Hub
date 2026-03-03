import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

async function getClientForUser(id: string, userId: string) {
  return prisma.client.findFirst({ where: { id, userId } });
}

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Nieautoryzowany" }, { status: 401 });

  const userId = (session.user as { id: string }).id;
  const client = await prisma.client.findFirst({
    where: { id: params.id, userId },
    include: {
      sessions: { orderBy: { scheduledAt: "desc" } },
      retrospectives: { orderBy: { createdAt: "desc" } },
    },
  });

  if (!client) return NextResponse.json({ error: "Nie znaleziono klienta" }, { status: 404 });
  return NextResponse.json(client);
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Nieautoryzowany" }, { status: 401 });

  const userId = (session.user as { id: string }).id;
  const existing = await getClientForUser(params.id, userId);
  if (!existing) return NextResponse.json({ error: "Nie znaleziono klienta" }, { status: 404 });

  const body = await req.json();
  const { name, company, role, stage, generalNote } = body;

  const updated = await prisma.client.update({
    where: { id: params.id },
    data: {
      ...(name !== undefined ? { name: name.trim() } : {}),
      ...(company !== undefined ? { company: company?.trim() || null } : {}),
      ...(role !== undefined ? { role: role?.trim() || null } : {}),
      ...(stage !== undefined ? { stage } : {}),
      ...(generalNote !== undefined ? { generalNote: generalNote?.trim() || null } : {}),
    },
  });

  return NextResponse.json(updated);
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Nieautoryzowany" }, { status: 401 });

  const userId = (session.user as { id: string }).id;
  const existing = await getClientForUser(params.id, userId);
  if (!existing) return NextResponse.json({ error: "Nie znaleziono klienta" }, { status: 404 });

  await prisma.client.delete({ where: { id: params.id } });
  return NextResponse.json({ success: true });
}
