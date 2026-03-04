import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import fs from "fs";
import path from "path";
// Import directly from the Node.js bundle — the package root maps to the
// browser stub (via the "browser" field in package.json) when webpack bundles
// the route, so we bypass that by pointing to the concrete Node.js file.
import { renderToBuffer, Font } from "@react-pdf/renderer/lib/react-pdf.js";
import React from "react";
import { ClientReportDocument } from "@/components/pdf/ClientReportDocument";

// ── Register fonts here (server-side, Node.js bundle) ─────────────────────────
// Fonts are encoded as data URIs to avoid any URL/path resolution issues in
// @react-pdf/font's font loader.
const FONTS_DIR = path.join(process.cwd(), "public", "fonts");
function toDataUri(filename: string): string {
  const buf = fs.readFileSync(path.join(FONTS_DIR, filename));
  return `data:font/truetype;base64,${buf.toString("base64")}`;
}

Font.register({
  family: "Roboto",
  fonts: [
    { src: toDataUri("Roboto-Regular.ttf"), fontWeight: 400 },
    { src: toDataUri("Roboto-Bold.ttf"),    fontWeight: 700 },
  ],
});
Font.registerHyphenationCallback((word: string) => [word]);

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Nieautoryzowany" }, { status: 401 });

  const userId = (session.user as { id: string }).id;

  const client = await prisma.client.findFirst({
    where: { id: params.id, userId },
    include: {
      sessions: {
        orderBy: { scheduledAt: "asc" },
        include: { offboarding: true },
      },
      retrospectives: { orderBy: { createdAt: "asc" } },
      user: { select: { name: true, email: true } },
    },
  });

  if (!client) return NextResponse.json({ error: "Nie znaleziono klienta" }, { status: 404 });

  const generatedAt = new Date().toLocaleDateString("pl-PL", {
    day: "numeric", month: "long", year: "numeric",
  });

  const data = {
    name: client.name,
    company: client.company,
    role: client.role,
    stage: client.stage,
    generalNote: client.generalNote,
    createdAt: client.createdAt.toISOString(),
    closedAt: client.closedAt?.toISOString() ?? null,
    finalReportMd: client.finalReportMd ?? null,
    user: { name: client.user.name, email: client.user.email },
    sessions: client.sessions.map((s) => ({
      id: s.id,
      scheduledAt: s.scheduledAt.toISOString(),
      durationMin: s.durationMin,
      status: s.status,
      notesMd: s.notesMd ?? "",
      offboarding: s.offboarding
        ? { generatedNoteMd: s.offboarding.generatedNoteMd ?? "" }
        : null,
    })),
    retrospectives: client.retrospectives.map((r) => ({
      id: r.id,
      createdAt: r.createdAt.toISOString(),
      reportMd: r.reportMd,
      truncated: r.truncated,
    })),
  };

  let buffer: Buffer;
  try {
    buffer = await renderToBuffer(
      React.createElement(ClientReportDocument, { client: data, generatedAt })
    );
  } catch (err) {
    console.error("[export PDF] renderToBuffer failed:", err);
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: "Błąd generowania PDF", detail: msg }, { status: 500 });
  }

  const safeName = client.name.replace(/[^a-z0-9]/gi, "_").toLowerCase();
  const filename = `coach-hub_${safeName}_dokumentacja.pdf`;

  return new NextResponse(buffer, {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
