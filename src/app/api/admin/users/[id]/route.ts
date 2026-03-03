import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

// PATCH /api/admin/users/[id] — update role | isBlocked | password
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { error, session } = await requireAdmin();
  if (error) return error;

  const { id } = params;
  const body = await req.json();
  const { role, isBlocked, newPassword } = body;

  const target = await prisma.user.findUnique({ where: { id } });
  if (!target) {
    return NextResponse.json({ error: "Użytkownik nie istnieje" }, { status: 404 });
  }

  // Prevent admin from blocking themselves
  if (isBlocked !== undefined && session!.user.id === id) {
    return NextResponse.json({ error: "Nie możesz zablokować własnego konta" }, { status: 400 });
  }

  // Prevent downgrading the last admin
  if (role === "COACH" && target.role === "ADMIN") {
    const adminCount = await prisma.user.count({ where: { role: "ADMIN" } });
    if (adminCount <= 1) {
      return NextResponse.json(
        { error: "Nie można zmienić roli – to ostatni administrator systemu" },
        { status: 400 }
      );
    }
  }

  const data: Record<string, unknown> = {};
  if (role !== undefined) data.role = role;
  if (isBlocked !== undefined) data.isBlocked = isBlocked;
  if (newPassword) {
    data.password = await bcrypt.hash(newPassword, 12);
  }

  const updated = await prisma.user.update({
    where: { id },
    data,
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      isBlocked: true,
      createdAt: true,
    },
  });

  return NextResponse.json(updated);
}

// DELETE /api/admin/users/[id] — permanently delete user
export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { error, session } = await requireAdmin();
  if (error) return error;

  const { id } = params;

  if (session!.user.id === id) {
    return NextResponse.json({ error: "Nie możesz usunąć własnego konta" }, { status: 400 });
  }

  const target = await prisma.user.findUnique({ where: { id } });
  if (!target) {
    return NextResponse.json({ error: "Użytkownik nie istnieje" }, { status: 404 });
  }

  // Prevent deleting the last admin
  if (target.role === "ADMIN") {
    const adminCount = await prisma.user.count({ where: { role: "ADMIN" } });
    if (adminCount <= 1) {
      return NextResponse.json(
        { error: "Nie można usunąć ostatniego administratora systemu" },
        { status: 400 }
      );
    }
  }

  await prisma.user.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
