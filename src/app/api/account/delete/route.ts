/**
 * POST /api/account/delete
 *
 * GDPR Art. 17 — Right to Erasure ("right to be forgotten").
 * Permanently deletes the authenticated coach's account and ALL associated data.
 *
 * Spec: docs/legal/09-spec-usuniecia-danych.md
 *
 * Deletion sequence (atomic Prisma transaction):
 *  1. MentorConversation WHERE userId  (MentorMessage cascaded via conversationId)
 *  2. Note WHERE userId                (no FK in schema — must be explicit)
 *  3. AiUsageEvent WHERE userId        (no FK in schema — must be explicit)
 *  4. User WHERE id                    (CASCADE removes Client → Session → SessionOffboarding,
 *                                       Retrospective, KnowledgeTool, UserToolPreference)
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sendAccountDeletionEmail } from "@/lib/mailer";
import bcrypt from "bcryptjs";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Nieautoryzowany" }, { status: 401 });
  }

  const userId = (session.user as { id: string }).id;

  // Require password confirmation to prevent accidental deletion
  let password: string | undefined;
  try {
    const body = await req.json();
    password = body?.password;
  } catch {
    return NextResponse.json({ error: "Nieprawidłowe żądanie" }, { status: 400 });
  }

  if (!password) {
    return NextResponse.json({ error: "Wymagane potwierdzenie hasłem" }, { status: 400 });
  }

  // Fetch user to verify password and get email for confirmation mail
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    return NextResponse.json({ error: "Nie znaleziono konta" }, { status: 404 });
  }

  const passwordValid = await bcrypt.compare(password, user.password);
  if (!passwordValid) {
    return NextResponse.json({ error: "Nieprawidłowe hasło" }, { status: 403 });
  }

  const userEmail = user.email;

  // Atomic deletion — all or nothing
  await prisma.$transaction([
    // Step 1: MentorConversation (MentorMessage cascade-deleted via conversationId FK)
    prisma.mentorConversation.deleteMany({ where: { userId } }),

    // Step 2: Note (userId stored as plain String — no Prisma relation, must be explicit)
    prisma.note.deleteMany({ where: { userId } }),

    // Step 3: AiUsageEvent (userId stored as plain String — no Prisma relation)
    prisma.aiUsageEvent.deleteMany({ where: { userId } }),

    // Step 4: User — CASCADE removes:
    //   Client → Session → SessionOffboarding
    //   Client → Retrospective
    //   KnowledgeTool, UserToolPreference, PasswordResetToken, Invite
    prisma.user.delete({ where: { id: userId } }),
  ]);

  // Send confirmation email (fire-and-forget — account is already gone)
  sendAccountDeletionEmail(userEmail).catch((err: unknown) =>
    console.error("[account/delete] Failed to send confirmation email:", err)
  );

  return NextResponse.json({
    success: true,
    message: "Konto i wszystkie powiązane dane zostały trwale usunięte.",
  });
}
