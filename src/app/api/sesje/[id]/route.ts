import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const patchSessionSchema = z.object({
  scheduledAt: z.string().datetime().optional(),
  durationMin: z.number().int().min(1).max(480).nullable().optional(),
  status: z.enum(["Zaplanowana", "Odbyta", "Anulowana"]).optional(),
  notesMd: z.string().max(5000).optional(),
  summaryMd: z.string().max(50000).optional(),
  planMd: z.string().max(50000).optional(),
  scratchpadMd: z.string().max(50000).optional(),
});

async function getSessionForUser(id: string, userId: string) {
  return prisma.session.findFirst({
    where: { id, client: { userId } },
    include: { client: true },
  });
}

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Nieautoryzowany" }, { status: 401 });

  const userId = (session.user as { id: string }).id;
  const s = await getSessionForUser(params.id, userId);
  if (!s) return NextResponse.json({ error: "Nie znaleziono sesji" }, { status: 404 });
  return NextResponse.json(s);
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Nieautoryzowany" }, { status: 401 });

  const userId = (session.user as { id: string }).id;
  const existing = await getSessionForUser(params.id, userId);
  if (!existing) return NextResponse.json({ error: "Nie znaleziono sesji" }, { status: 404 });

  const body = await req.json();
  const parsed = patchSessionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Nieprawidłowe dane", details: parsed.error.flatten() }, { status: 400 });
  }
  const { scheduledAt, durationMin, status, notesMd, summaryMd, planMd, scratchpadMd } = parsed.data;

  const updated = await prisma.session.update({
    where: { id: params.id },
    data: {
      ...(scheduledAt !== undefined ? { scheduledAt: new Date(scheduledAt) } : {}),
      ...(durationMin !== undefined ? { durationMin } : {}),
      ...(status !== undefined ? { status } : {}),
      ...(notesMd !== undefined ? { notesMd } : {}),
      ...(summaryMd !== undefined ? { summaryMd } : {}),
      ...(planMd !== undefined ? { planMd } : {}),
      ...(scratchpadMd !== undefined ? { scratchpadMd } : {}),
    },
  });

  return NextResponse.json(updated);
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Nieautoryzowany" }, { status: 401 });

  const userId = (session.user as { id: string }).id;
  const existing = await getSessionForUser(params.id, userId);
  if (!existing) return NextResponse.json({ error: "Nie znaleziono sesji" }, { status: 404 });

  await prisma.session.delete({ where: { id: params.id } });
  return NextResponse.json({ success: true });
}
