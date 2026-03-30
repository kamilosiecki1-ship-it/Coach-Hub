import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { generateOffboardingNote } from "@/lib/offboardingNote";
import { z } from "zod";

const offboardingSchema = z.object({
  date: z.string().datetime().nullable().optional(),
  sessionNumber: z.number().int().min(1).max(10000).nullable().optional(),
  hours: z.number().min(0).max(24).nullable().optional(),
  clientLabel: z.string().max(500).nullable().optional(),
  eventTopic: z.string().max(1000).nullable().optional(),
  learningExperience: z.string().max(50000).nullable().optional(),
  sessionGoals: z.string().max(50000).nullable().optional(),
  homework: z.string().max(50000).nullable().optional(),
  techniques: z.string().max(50000).nullable().optional(),
  keyInsightsClient: z.string().max(50000).nullable().optional(),
  gains: z.string().max(50000).nullable().optional(),
  homeworkDescription: z.string().max(50000).nullable().optional(),
  feedback: z.string().max(50000).nullable().optional(),
  coachReflection: z.string().max(50000).nullable().optional(),
  focusAreas: z.string().max(50000).nullable().optional(),
  additionalNotes: z.string().max(50000).nullable().optional(),
  transcript: z.string().max(500000).nullable().optional(),
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
  const parsed = offboardingSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Nieprawidłowe dane", details: parsed.error.flatten() }, { status: 400 });
  }

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
  } = parsed.data;

  const data = {
    date: date ? new Date(date) : null,
    sessionNumber: sessionNumber ?? null,
    hours: hours ?? null,
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

  // Auto-calculate session number (1-based, sorted by scheduledAt asc)
  const allSessions = await prisma.session.findMany({
    where: { clientId: s.clientId },
    orderBy: { scheduledAt: "asc" },
    select: { id: true },
  });
  const autoSessionNumber = allSessions.findIndex((sess) => sess.id === params.id) + 1;
  const dataWithNumber = {
    ...data,
    sessionNumber: data.sessionNumber ?? autoSessionNumber,
  };

  const generatedNoteMd = generateOffboardingNote(dataWithNumber);

  try {
    const [offboarding] = await prisma.$transaction([
      prisma.sessionOffboarding.upsert({
        where: { sessionId: params.id },
        create: { sessionId: params.id, ...dataWithNumber, generatedNoteMd },
        update: { ...dataWithNumber, generatedNoteMd },
      }),
      prisma.session.update({
        where: { id: params.id },
        data: { status: "Odbyta" },
      }),
    ]);
    return NextResponse.json(offboarding);
  } catch (err) {
    console.error("[offboarding POST] Prisma error:", err);
    return NextResponse.json({ error: "Wystąpił błąd serwera. Spróbuj ponownie." }, { status: 500 });
  }
}
