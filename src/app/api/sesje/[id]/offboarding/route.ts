import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { generateOffboardingNote } from "@/lib/offboardingNote";

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

  const offboarding = await prisma.sessionOffboarding.findUnique({
    where: { sessionId: params.id },
  });

  if (!offboarding) return NextResponse.json(null);
  return NextResponse.json(offboarding);
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Nieautoryzowany" }, { status: 401 });

  const userId = (session.user as { id: string }).id;
  const s = await getSessionForUser(params.id, userId);
  if (!s) return NextResponse.json({ error: "Nie znaleziono sesji" }, { status: 404 });

  const body = await req.json();

  const {
    date,
    sessionNumber,
    hours,
    clientLabel,
    eventTopic,
    learningExperience,
    sessionGoals,
    homework,
    techniques,
    keyInsightsClient,
    gains,
    homeworkDescription,
    feedback,
    coachReflection,
    focusAreas,
    additionalNotes,
    transcript,
  } = body;

  const data = {
    date: date ? new Date(date) : null,
    sessionNumber: sessionNumber != null ? parseInt(String(sessionNumber)) : null,
    hours: hours != null && hours !== "" ? parseFloat(String(hours)) : null,
    clientLabel: clientLabel ?? null,
    eventTopic: eventTopic ?? null,
    learningExperience: learningExperience ?? null,
    sessionGoals: sessionGoals ?? null,
    homework: homework ?? null,
    techniques: techniques ?? null,
    keyInsightsClient: keyInsightsClient ?? null,
    gains: gains ?? null,
    homeworkDescription: homeworkDescription ?? null,
    feedback: feedback ?? null,
    coachReflection: coachReflection ?? null,
    focusAreas: focusAreas ?? null,
    additionalNotes: additionalNotes ?? null,
    transcript: transcript || null,
  };

  const generatedNoteMd = generateOffboardingNote(data);

  try {
    const offboarding = await prisma.sessionOffboarding.upsert({
      where: { sessionId: params.id },
      create: { sessionId: params.id, ...data, generatedNoteMd },
      update: { ...data, generatedNoteMd },
    });
    return NextResponse.json(offboarding);
  } catch (err) {
    console.error("[offboarding POST] Prisma error:", err);
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: "Błąd zapisu danych", detail: message }, { status: 500 });
  }
}
