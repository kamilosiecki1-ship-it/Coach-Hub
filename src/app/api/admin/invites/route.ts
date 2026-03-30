import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
import { generateToken, hashToken } from "@/lib/tokens";
import { sendInviteEmail } from "@/lib/mailer";

// GET /api/admin/invites — list all invites
export async function GET() {
  const { error } = await requireAdmin();
  if (error) return error;

  const invites = await prisma.invite.findMany({
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(invites);
}

// POST /api/admin/invites — create invite
export async function POST(req: NextRequest) {
  try {
    const { error, session } = await requireAdmin();
    if (error) return error;

    const { email, role, ttlDays } = await req.json();

    const days = Math.max(1, Math.min(90, parseInt(ttlDays ?? process.env.INVITE_TTL_DAYS ?? "7")));
    const expiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000);

    const token = generateToken();
    const tokenHash = hashToken(token);

    const invite = await prisma.invite.create({
      data: {
        tokenHash,
        email: email?.trim().toLowerCase() || null,
        role: role === "ADMIN" ? "ADMIN" : "COACH",
        expiresAt,
        createdByAdmin: session!.user.id,
      },
    });

    const baseUrl = process.env.NEXTAUTH_URL ?? "http://localhost:3000";
    const registrationLink = `${baseUrl}/rejestracja?token=${token}`;

    const normalizedEmail = email?.trim().toLowerCase() || null;
    let emailSent = false;
    if (normalizedEmail) {
      await sendInviteEmail(normalizedEmail, registrationLink, invite.role);
      emailSent = true;
    }

    return NextResponse.json({ invite, token, registrationLink, emailSent }, { status: 201 });
  } catch (err: unknown) {
    console.error("[invites POST] ERROR:", err);
    return NextResponse.json({ error: "Wystąpił błąd serwera. Spróbuj ponownie." }, { status: 500 });
  }
}
