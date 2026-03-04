import React from "react";
import {
  Document, Page, Text, View, StyleSheet,
  Svg, Rect,
} from "@react-pdf/renderer";

// Interpolate between two hex colors; t ∈ [0, 1]
function lerp(from: string, to: string, t: number): string {
  const r = Math.round(parseInt(from.slice(1, 3), 16) + (parseInt(to.slice(1, 3), 16) - parseInt(from.slice(1, 3), 16)) * t);
  const g = Math.round(parseInt(from.slice(3, 5), 16) + (parseInt(to.slice(3, 5), 16) - parseInt(from.slice(3, 5), 16)) * t);
  const b = Math.round(parseInt(from.slice(5, 7), 16) + (parseInt(to.slice(5, 7), 16) - parseInt(from.slice(5, 7), 16)) * t);
  return `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`;
}

// ── Palette matching the platform ─────────────────────────────────────────────
const C = {
  blue900:    "#1E3A8A",
  blue800:    "#1E40AF",
  blue700:    "#1D4ED8",
  blue600:    "#2563EB",
  blue200:    "#BFDBFE",
  blue100:    "#DBEAFE",
  blue50:     "#EFF6FF",
  slate900:   "#0F172A",
  slate700:   "#334155",
  slate600:   "#475569",
  slate500:   "#64748B",
  slate300:   "#CBD5E1",
  slate200:   "#E2E8F0",
  slate100:   "#F1F5F9",
  white:      "#FFFFFF",
  emerald700: "#047857",
  emerald100: "#D1FAE5",
  emerald200: "#A7F3D0",
  amber600:   "#D97706",
  amber50:    "#FFFBEB",
  amber200:   "#FDE68A",
  red600:     "#DC2626",
  red50:      "#FEF2F2",
  red200:     "#FECACA",
};

// ── Helpers ───────────────────────────────────────────────────────────────────
function fmtDate(d: Date | string | null | undefined): string {
  if (!d) return "\u2014";
  return new Date(d).toLocaleDateString("pl-PL", { day: "numeric", month: "long", year: "numeric" });
}
function fmtShortDate(d: Date | string | null | undefined): string {
  if (!d) return "\u2014";
  return new Date(d).toLocaleDateString("pl-PL", { day: "numeric", month: "short", year: "numeric" });
}
function fmtDateTime(d: Date | string | null | undefined): string {
  if (!d) return "\u2014";
  return new Date(d).toLocaleDateString("pl-PL", {
    day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
  });
}

function stripMd(text: string | null | undefined): string {
  if (!text) return "";
  return text
    .replace(/^#{1,6}\s+(.+)$/gm, "$1")
    .replace(/\*\*([\s\S]+?)\*\*/g, "$1")
    .replace(/\*([\s\S]+?)\*/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\[(.+?)\]\(.+?\)/g, "$1")
    .replace(/^[-*+]\s+/gm, "- ")
    .replace(/^>\s*/gm, "")
    .replace(/---+/g, "\u2014")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function statusColors(status: string) {
  switch (status) {
    case "Odbyta":      return { color: C.emerald700, bg: C.emerald100, border: C.emerald200 };
    case "Zaplanowana": return { color: C.blue700,    bg: C.blue50,     border: C.blue100    };
    case "Odwolana":
    case "Odwołana":    return { color: C.red600,     bg: C.red50,      border: C.red200     };
    default:            return { color: C.slate600,   bg: C.slate100,   border: C.slate200   };
  }
}

// ── Styles ────────────────────────────────────────────────────────────────────
const F = "Roboto"; // font family shorthand

const s = StyleSheet.create({
  // Pages
  coverPage:   { backgroundColor: C.white },
  contentPage: { backgroundColor: C.white, paddingBottom: 50 },

  // Fixed page header (non-cover pages)
  pageHeader: {
    backgroundColor: C.blue800,
    paddingHorizontal: 40, paddingVertical: 9,
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
  },
  pageHeaderBrand:  { color: "rgba(255,255,255,0.50)", fontSize: 7,  fontFamily: F, letterSpacing: 1 },
  pageHeaderClient: { color: C.white,                  fontSize: 8,  fontFamily: F, fontWeight: 700  },

  // Fixed page footer (non-cover pages)
  pageFooter: {
    position: "absolute", bottom: 0, left: 0, right: 0,
    backgroundColor: C.blue900,
    paddingHorizontal: 40, paddingVertical: 8,
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
  },
  pageFooterLeft:  { color: "rgba(255,255,255,0.50)", fontSize: 7, fontFamily: F },
  pageFooterRight: { color: "rgba(255,255,255,0.40)", fontSize: 7, fontFamily: F },

  // Content area
  content: { paddingHorizontal: 40, paddingTop: 18 },

  // Section heading
  sectionRow:   { flexDirection: "row", alignItems: "center", marginTop: 20, marginBottom: 10 },
  sectionBar:   { width: 3, height: 14, backgroundColor: C.blue600, borderRadius: 2, marginRight: 8 },
  sectionTitle: { fontSize: 12, fontFamily: F, fontWeight: 700, color: C.slate900 },

  // Cards
  card: {
    backgroundColor: C.white, borderRadius: 6, padding: 14, marginBottom: 8,
    borderWidth: 1, borderColor: C.slate200, borderStyle: "solid",
  },
  cardBlue: {
    backgroundColor: C.blue50, borderRadius: 6, padding: 14, marginBottom: 8,
    borderWidth: 1, borderColor: C.blue100, borderStyle: "solid",
  },

  // Typography
  label: {
    fontSize: 7, fontFamily: F, fontWeight: 700, color: C.slate500,
    textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 3,
  },
  body:      { fontSize: 9,   fontFamily: F, color: C.slate700, lineHeight: 1.6  },
  bodySmall: { fontSize: 7.5, fontFamily: F, color: C.slate500, lineHeight: 1.45 },
  h3:        { fontSize: 10,  fontFamily: F, fontWeight: 700, color: C.slate900, marginBottom: 5 },

  // Flex helpers
  row: { flexDirection: "row", alignItems: "center" },
  sb:  { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },

  // Badge
  badge: {
    fontSize: 7, fontFamily: F,
    paddingHorizontal: 6, paddingVertical: 2,
    borderRadius: 10, borderWidth: 1, borderStyle: "solid",
  },

  // Stat boxes on cover
  statsGrid: { flexDirection: "row", marginTop: 24 },
  statBox: {
    flex: 1, marginRight: 10,
    backgroundColor: C.white, borderRadius: 8, padding: 14,
    borderWidth: 1, borderColor: C.blue200, borderStyle: "solid",
  },
  statBoxLast: {
    flex: 1,
    backgroundColor: C.white, borderRadius: 8, padding: 14,
    borderWidth: 1, borderColor: C.blue200, borderStyle: "solid",
  },
  statNumber: { fontSize: 22, fontFamily: F, fontWeight: 700, color: C.blue700, marginBottom: 3 },
  statLabel:  { fontSize: 7.5, fontFamily: F, color: C.slate500 },

  // Session AI summary box
  summaryBox: {
    backgroundColor: C.blue50, borderRadius: 4, padding: 10,
    borderWidth: 1, borderColor: C.blue100, borderStyle: "solid",
    marginTop: 8,
  },
});

// ── Types ─────────────────────────────────────────────────────────────────────
export interface SessionData {
  id: string;
  scheduledAt: string;
  durationMin?: number | null;
  status: string;
  notesMd: string;
  offboarding?: { generatedNoteMd: string } | null;
}
export interface RetrospectiveData {
  id: string;
  createdAt: string;
  reportMd: string;
  truncated: boolean;
}
export interface ClientReportData {
  name: string;
  company?: string | null;
  role?: string | null;
  stage: string;
  generalNote?: string | null;
  createdAt: string;
  closedAt?: string | null;
  finalReportMd?: string | null;
  sessions: SessionData[];
  retrospectives: RetrospectiveData[];
  user: { name?: string | null; email: string };
}

// ── Fixed header / footer (appear on every content page) ─────────────────────
const PageHeader = ({ name }: { name: string }) => (
  <View style={s.pageHeader} fixed>
    <Text style={s.pageHeaderBrand}>COACH HUB  ·  DOKUMENTACJA</Text>
    <Text style={s.pageHeaderClient}>{name}</Text>
  </View>
);

const PageFooter = ({ name }: { name: string }) => (
  <View style={s.pageFooter} fixed>
    <Text style={s.pageFooterLeft}>{name}  ·  Dokument poufny</Text>
    <Text
      style={s.pageFooterRight}
      render={({ pageNumber, totalPages }) => `Strona ${pageNumber} z ${totalPages}`}
    />
  </View>
);

// ── Main document ─────────────────────────────────────────────────────────────
export function ClientReportDocument({
  client,
  generatedAt,
}: {
  client: ClientReportData;
  generatedAt: string;
}) {
  const completedSessions = client.sessions.filter((s) => s.status === "Odbyta");
  const totalMin = completedSessions.reduce((a, s) => a + (s.durationMin ?? 0), 0);
  const totalH   = Math.round((totalMin / 60) * 10) / 10;

  const dates = client.sessions.map((s) => new Date(s.scheduledAt).getTime()).filter(Boolean);
  const firstDate = dates.length ? fmtShortDate(new Date(Math.min(...dates))) : "\u2014";
  const lastDate  = dates.length ? fmtShortDate(new Date(Math.max(...dates))) : "\u2014";

  const coachName = client.user.name ?? client.user.email;
  const COVER_H   = 270;

  return (
    <Document>

      {/* ════════════════════════════════════════════════════════════════════
          COVER PAGE
      ════════════════════════════════════════════════════════════════════ */}
      <Page size="A4" style={s.coverPage}>

        {/* Gradient header — JS-interpolated strips (reliable across all PDF viewers) */}
        {(() => {
          const STEPS = 28;
          const strips = Array.from({ length: STEPS }, (_, i) => {
            const t = i / (STEPS - 1);
            const x = Math.round((i / STEPS) * 595);
            const w = Math.ceil(595 / STEPS) + 1;
            return { x, w, color: lerp("#0C1A42", "#2D6FD4", t) };
          });
          return (
            <Svg width={595} height={COVER_H} style={{ position: "absolute", top: 0, left: 0 }}>
              {strips.map(({ x, w, color }, i) => (
                <Rect key={i} x={x} y={0} width={w} height={COVER_H} fill={color} />
              ))}
            </Svg>
          );
        })()}

        {/* Cover text on gradient */}
        <View style={{
          position: "absolute", top: 0, left: 0, right: 0,
          height: COVER_H, paddingHorizontal: 50, paddingTop: 48,
        }}>
          <Text style={{ fontSize: 7, fontFamily: F, color: "rgba(255,255,255,0.45)", letterSpacing: 2, marginBottom: 20 }}>
            COACH HUB  ·  DOKUMENTACJA PROCESU COACHINGOWEGO
          </Text>
          <Text style={{ fontSize: 28, fontFamily: F, fontWeight: 700, color: C.white, lineHeight: 1.15, marginBottom: 8 }}>
            {client.name}
          </Text>
          {(client.company || client.role) && (
            <Text style={{ fontSize: 11, fontFamily: F, color: "rgba(255,255,255,0.70)", marginBottom: 16 }}>
              {[client.role, client.company].filter(Boolean).join("  ·  ")}
            </Text>
          )}
          {/* Stage pill */}
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <Text style={{
              fontSize: 8, fontFamily: F,
              color: "rgba(255,255,255,0.90)",
              backgroundColor: "rgba(255,255,255,0.15)",
              paddingHorizontal: 10, paddingVertical: 3, borderRadius: 12,
            }}>
              {client.stage}
            </Text>
            <Text style={{ fontSize: 8, fontFamily: F, color: "rgba(255,255,255,0.55)" }}>
              Wygenerowano: {generatedAt}
            </Text>
          </View>
        </View>

        {/* White content area */}
        <View style={{ marginTop: COVER_H, paddingHorizontal: 50, paddingTop: 28, flex: 1 }}>

          {/* Stats grid */}
          <View style={s.statsGrid}>
            <View style={s.statBox}>
              <Text style={s.statNumber}>{client.sessions.length}</Text>
              <Text style={s.statLabel}>Sesji łącznie</Text>
            </View>
            <View style={s.statBox}>
              <Text style={s.statNumber}>{completedSessions.length}</Text>
              <Text style={s.statLabel}>Sesji odbytych</Text>
            </View>
            <View style={s.statBox}>
              <Text style={s.statNumber}>{totalH > 0 ? `${totalH}h` : "0h"}</Text>
              <Text style={s.statLabel}>Czas coachingu</Text>
            </View>
            <View style={s.statBoxLast}>
              <Text style={s.statNumber}>{client.retrospectives.length}</Text>
              <Text style={s.statLabel}>Retrospektywy</Text>
            </View>
          </View>

          {/* Meta row */}
          <View style={[s.card, { marginTop: 12, flexDirection: "row", justifyContent: "space-between" }]}>
            <View>
              <Text style={s.label}>Okres procesu</Text>
              <Text style={s.body}>{firstDate}  {"\u2192"}  {lastDate}</Text>
            </View>
            <View>
              <Text style={s.label}>Coach</Text>
              <Text style={s.body}>{coachName}</Text>
            </View>
            <View>
              <Text style={s.label}>Data exportu</Text>
              <Text style={s.body}>{generatedAt}</Text>
            </View>
          </View>

          <Text style={[s.bodySmall, { marginTop: 20, textAlign: "center", color: C.slate300 }]}>
            Dokument poufny  —  przeznaczony wylacznie dla coacha i klienta
          </Text>
        </View>

        {/* Cover footer */}
        <View style={[s.pageFooter]}>
          <Text style={s.pageFooterLeft}>Coach Hub  ·  Dokumentacja Procesu Coachingowego</Text>
          <Text style={s.pageFooterRight}>{generatedAt}</Text>
        </View>
      </Page>

      {/* ════════════════════════════════════════════════════════════════════
          CONTENT PAGES  (auto-paginate)
      ════════════════════════════════════════════════════════════════════ */}
      <Page size="A4" style={s.contentPage}>
        <PageHeader name={client.name} />
        <PageFooter name={client.name} />

        <View style={s.content}>

          {/* ── Profile ── */}
          {(client.generalNote || client.company || client.role) && (
            <>
              <View style={s.sectionRow}>
                <View style={s.sectionBar} />
                <Text style={s.sectionTitle}>Profil klienta</Text>
              </View>
              <View style={s.cardBlue}>
                <View style={{ flexDirection: "row", marginBottom: client.generalNote ? 12 : 0 }}>
                  {client.role && (
                    <View style={{ marginRight: 28 }}>
                      <Text style={s.label}>Rola</Text>
                      <Text style={s.body}>{client.role}</Text>
                    </View>
                  )}
                  {client.company && (
                    <View style={{ marginRight: 28 }}>
                      <Text style={s.label}>Firma</Text>
                      <Text style={s.body}>{client.company}</Text>
                    </View>
                  )}
                  <View>
                    <Text style={s.label}>Etap procesu</Text>
                    <Text style={s.body}>{client.stage}</Text>
                  </View>
                </View>
                {client.generalNote && (
                  <>
                    <Text style={s.label}>Notatka ogólna coacha</Text>
                    <Text style={s.body}>{client.generalNote}</Text>
                  </>
                )}
              </View>
            </>
          )}

          {/* ── Sessions ── */}
          <View style={s.sectionRow}>
            <View style={s.sectionBar} />
            <Text style={s.sectionTitle}>Sesje ({client.sessions.length})</Text>
          </View>

          {client.sessions.length === 0 ? (
            <Text style={[s.body, { color: C.slate500 }]}>Brak sesji.</Text>
          ) : (
            client.sessions.map((session, idx) => {
              const sc        = statusColors(session.status);
              const hasNotes  = (session.notesMd ?? "").trim().length > 0;
              const hasSummary = (session.offboarding?.generatedNoteMd ?? "").trim().length > 0;

              return (
                <View key={session.id} style={s.card}>
                  {/* Header row */}
                  <View style={[s.sb, { marginBottom: (hasNotes || hasSummary) ? 10 : 0 }]}>
                    <View style={[s.row, { flexWrap: "wrap", flex: 1, marginRight: 8 }]}>
                      <Text style={{
                        fontSize: 7, fontFamily: F, fontWeight: 700,
                        color: C.blue700, backgroundColor: C.blue100,
                        paddingHorizontal: 7, paddingVertical: 2, borderRadius: 10, marginRight: 8,
                      }}>
                        Sesja {idx + 1}
                      </Text>
                      <Text style={[s.body, { fontWeight: 700 }]}>
                        {fmtDateTime(session.scheduledAt)}
                      </Text>
                      {session.durationMin && (
                        <Text style={[s.bodySmall, { marginLeft: 8 }]}>
                          ·  {session.durationMin} min
                        </Text>
                      )}
                    </View>
                    <Text style={[s.badge, { color: sc.color, backgroundColor: sc.bg, borderColor: sc.border }]}>
                      {session.status}
                    </Text>
                  </View>

                  {hasNotes && (
                    <View>
                      <Text style={s.label}>Notatki coacha</Text>
                      <Text style={s.body}>{stripMd(session.notesMd)}</Text>
                    </View>
                  )}

                  {hasSummary && (
                    <View style={[s.summaryBox, { marginTop: hasNotes ? 10 : 0 }]}>
                      <Text style={[s.label, { color: C.blue700, marginBottom: 4 }]}>
                        Podsumowanie po sesji
                      </Text>
                      <Text style={s.body}>{stripMd(session.offboarding!.generatedNoteMd)}</Text>
                    </View>
                  )}

                  {!hasNotes && !hasSummary && (
                    <Text style={[s.bodySmall, { color: C.slate300 }]}>
                      Brak notatek dla tej sesji.
                    </Text>
                  )}
                </View>
              );
            })
          )}

          {/* ── Retrospectives ── */}
          {client.retrospectives.length > 0 && (
            <>
              <View style={s.sectionRow}>
                <View style={s.sectionBar} />
                <Text style={s.sectionTitle}>Retrospektywy ({client.retrospectives.length})</Text>
              </View>
              {client.retrospectives.map((r, idx) => (
                <View key={r.id} style={s.card}>
                  <View style={[s.row, { marginBottom: 8 }]}>
                    <Text style={[s.h3, { marginBottom: 0, marginRight: 8 }]}>
                      Retrospektywa {idx + 1}
                    </Text>
                    <Text style={s.bodySmall}>{fmtShortDate(r.createdAt)}</Text>
                    {r.truncated && (
                      <Text style={[s.badge, {
                        marginLeft: 8,
                        color: C.amber600, backgroundColor: C.amber50, borderColor: C.amber200,
                      }]}>
                        Skrócona
                      </Text>
                    )}
                  </View>
                  <Text style={s.body}>{stripMd(r.reportMd)}</Text>
                </View>
              ))}
            </>
          )}

          {/* ── Final report ── */}
          {client.finalReportMd && (
            <>
              <View style={s.sectionRow}>
                <View style={s.sectionBar} />
                <Text style={s.sectionTitle}>Raport końcowy procesu</Text>
              </View>
              {client.closedAt && (
                <Text style={[s.bodySmall, { marginBottom: 8 }]}>
                  Proces zamknięty: {fmtDate(client.closedAt)}
                </Text>
              )}
              <View style={s.cardBlue}>
                <Text style={s.body}>{stripMd(client.finalReportMd)}</Text>
              </View>
            </>
          )}

        </View>
      </Page>
    </Document>
  );
}
