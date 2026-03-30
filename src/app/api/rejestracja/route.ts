import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { hashToken, validatePassword } from "@/lib/tokens";
import { authRateLimit } from "@/lib/rateLimit";

// GET /api/rejestracja?token=XXX — lightweight token pre-validation
export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token");
  if (!token) {
    return NextResponse.json({ valid: false, error: "Brak tokenu zaproszenia." });
  }

  const tokenHash = hashToken(token);
  const invite = await prisma.invite.findFirst({
    where: { tokenHash, usedAt: null, expiresAt: { gt: new Date() } },
  });

  if (!invite) {
    return NextResponse.json({ valid: false, error: "Zaproszenie jest nieprawidłowe lub wygasło." });
  }

  return NextResponse.json({ valid: true, email: invite.email ?? null, role: invite.role });
}

// POST /api/rejestracja — create account using invitation
export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0].trim() ?? "unknown";
  if (authRateLimit(ip)) {
    return NextResponse.json({ error: "Za dużo prób. Spróbuj za 15 minut." }, { status: 429 });
  }

  const body = await req.json();
  const { token, name, email, password, passwordConfirm } = body;

  if (!name?.trim()) {
    return NextResponse.json({ error: "Podaj imię i nazwisko." }, { status: 400 });
  }

  if (!token) {
    return NextResponse.json({ error: "Brak tokenu zaproszenia." }, { status: 400 });
  }

  const tokenHash = hashToken(token);
  const invite = await prisma.invite.findFirst({
    where: { tokenHash, usedAt: null, expiresAt: { gt: new Date() } },
  });

  if (!invite) {
    return NextResponse.json(
      { error: "Zaproszenie jest nieprawidłowe lub wygasło." },
      { status: 400 }
    );
  }

  // Email validation
  if (!email?.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
    return NextResponse.json({ error: "Podaj prawidłowy adres email." }, { status: 400 });
  }
  const normalizedEmail = email.trim().toLowerCase();

  // If invite is locked to specific email, enforce match
  if (invite.email && invite.email.toLowerCase() !== normalizedEmail) {
    return NextResponse.json(
      { error: "To zaproszenie jest przeznaczone dla innego adresu email." },
      { status: 400 }
    );
  }

  // Password validation
  const pwdError = validatePassword(password ?? "");
  if (pwdError) return NextResponse.json({ error: pwdError }, { status: 400 });
  if (password !== passwordConfirm) {
    return NextResponse.json({ error: "Hasła nie są identyczne." }, { status: 400 });
  }

  // Check email uniqueness
  const existing = await prisma.user.findUnique({ where: { email: normalizedEmail } });
  if (existing) {
    return NextResponse.json({ error: "Konto z tym adresem email już istnieje." }, { status: 409 });
  }

  const passwordHash = await bcrypt.hash(password, 12);

  await prisma.$transaction([
    prisma.user.create({
      data: {
        email: normalizedEmail,
        password: passwordHash,
        name: name.trim(),
        role: invite.role,
        isBlocked: false,
      },
    }),
    prisma.invite.update({
      where: { id: invite.id },
      data: { usedAt: new Date() },
    }),
  ]);

  return NextResponse.json({ ok: true }, { status: 201 });
}
