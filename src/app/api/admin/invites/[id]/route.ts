import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";

// DELETE /api/admin/invites/[id] — revoke invite
export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { error } = await requireAdmin();
  if (error) return error;

  const invite = await prisma.invite.findUnique({ where: { id: params.id } });
  if (!invite) {
    return NextResponse.json({ error: "Zaproszenie nie istnieje." }, { status: 404 });
  }

  await prisma.invite.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
