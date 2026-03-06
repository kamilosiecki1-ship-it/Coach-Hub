import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// POST /api/hub-wiedzy/[id]/add-to-plan
// Body: { sessionId: string }
// Adds the tool's "structure" (how-to section) to the session plan with a source reference.
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Nieautoryzowany" }, { status: 401 });

  const userId = (session.user as { id: string }).id;

  const tool = await prisma.knowledgeTool.findFirst({
    where: { id: params.id, OR: [{ userId: null }, { userId }] },
    select: { id: true, name: true, structure: true },
  });

  if (!tool) return NextResponse.json({ error: "Nie znaleziono narzędzia" }, { status: 404 });

  const body = await req.json().catch(() => ({}));
  const { sessionId } = body as { sessionId?: string };

  if (!sessionId) return NextResponse.json({ error: "sessionId jest wymagane" }, { status: 400 });

  const targetSession = await prisma.session.findFirst({
    where: { id: sessionId, client: { userId } },
  });

  if (!targetSession) return NextResponse.json({ error: "Nie znaleziono sesji" }, { status: 404 });

  const toolLink = `/hub-wiedzy/${tool.id}`;
  const header = `> **Hub wiedzy — ${tool.name}**\n> [Przejdź do techniki](${toolLink})`;

  const separator = targetSession.planMd?.trim() ? "\n\n---\n\n" : "";
  await prisma.session.update({
    where: { id: targetSession.id },
    data: {
      planMd: (targetSession.planMd ?? "") + separator + header + "\n\n" + tool.structure,
    },
  });

  return NextResponse.json({
    sessionId: targetSession.id,
    sessionScheduledAt: targetSession.scheduledAt,
  });
}
