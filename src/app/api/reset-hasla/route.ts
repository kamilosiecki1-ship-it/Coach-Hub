import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateToken, hashToken } from "@/lib/tokens";
import { sendPasswordResetEmail } from "@/lib/mailer";
import { authRateLimit } from "@/lib/rateLimit";

// POST /api/reset-hasla — request a password reset
// Always returns 200 to avoid email enumeration
export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0].trim() ?? "unknown";
  if (authRateLimit(ip)) {
    return NextResponse.json({ error: "Za dużo prób. Spróbuj za 15 minut." }, { status: 429 });
  }

  const { email } = await req.json();

  if (!email?.trim()) {
    return NextResponse.json({ ok: true });
  }

  const user = await prisma.user.findUnique({
    where: { email: email.trim().toLowerCase() },
  });

  if (user && !user.isBlocked) {
    const ttlMinutes = parseInt(process.env.RESET_TOKEN_TTL_MINUTES ?? "60");
    const token = generateToken();
    const tokenHash = hashToken(token);
    const expiresAt = new Date(Date.now() + ttlMinutes * 60 * 1000);

    // Invalidate previous tokens for this user
    await prisma.passwordResetToken.updateMany({
      where: { userId: user.id, usedAt: null },
      data: { usedAt: new Date() },
    });

    await prisma.passwordResetToken.create({
      data: { userId: user.id, tokenHash, expiresAt },
    });

    const baseUrl = process.env.NEXTAUTH_URL ?? "http://localhost:3000";
    const resetLink = `${baseUrl}/reset-hasla/${token}`;

    await sendPasswordResetEmail(user.email, resetLink);
  }

  return NextResponse.json({ ok: true });
}
