import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { hashToken, validatePassword } from "@/lib/tokens";

// GET — validate token (for page pre-check)
export async function GET(
  _req: NextRequest,
  { params }: { params: { token: string } }
) {
  const tokenHash = hashToken(params.token);
  const record = await prisma.passwordResetToken.findFirst({
    where: { tokenHash, usedAt: null, expiresAt: { gt: new Date() } },
  });
  return NextResponse.json({ valid: !!record });
}

// POST — apply new password
export async function POST(
  req: NextRequest,
  { params }: { params: { token: string } }
) {
  const { password, passwordConfirm } = await req.json();

  const tokenHash = hashToken(params.token);
  const record = await prisma.passwordResetToken.findFirst({
    where: { tokenHash, usedAt: null, expiresAt: { gt: new Date() } },
  });

  if (!record) {
    return NextResponse.json(
      { error: "Link wygasł lub jest nieprawidłowy." },
      { status: 400 }
    );
  }

  const pwdError = validatePassword(password ?? "");
  if (pwdError) return NextResponse.json({ error: pwdError }, { status: 400 });

  if (password !== passwordConfirm) {
    return NextResponse.json({ error: "Hasła nie są identyczne." }, { status: 400 });
  }

  const passwordHash = await bcrypt.hash(password, 12);

  await prisma.$transaction([
    prisma.user.update({
      where: { id: record.userId },
      data: { password: passwordHash },
    }),
    prisma.passwordResetToken.update({
      where: { id: record.id },
      data: { usedAt: new Date() },
    }),
  ]);

  return NextResponse.json({ ok: true });
}
