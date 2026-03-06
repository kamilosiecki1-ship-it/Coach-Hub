import { Resend } from "resend";

export function isMailConfigured(): boolean {
  return !!process.env.RESEND_API_KEY;
}

export async function sendInviteEmail(to: string, registrationLink: string, role: string): Promise<void> {
  if (!isMailConfigured()) {
    console.log("\n[DEV - brak RESEND_API_KEY] Link zaproszenia dla:", to);
    console.log("[DEV]", registrationLink, "\n");
    return;
  }

  const resend = new Resend(process.env.RESEND_API_KEY);
  const from = process.env.EMAIL_FROM ?? "SessionLab <hello@sessionlab.app>";
  const roleLabel = role === "ADMIN" ? "Administrator" : "Coach";

  await resend.emails.send({
    from,
    to,
    subject: "Zaproszenie do Session Lab — witaj na pokładzie!",
    html: `
      <div style="font-family:sans-serif;max-width:520px;margin:0 auto;background:#f8fafc;border-radius:12px;overflow:hidden">

        <!-- BANER -->
        <div style="background:linear-gradient(135deg,#1e3a8a 0%,#2563eb 60%,#3b82f6 100%);padding:40px 32px 36px;text-align:center">
          <div style="display:inline-block">
            <span style="font-size:28px;font-weight:300;color:#bfdbfe;letter-spacing:4px;text-transform:uppercase">Session</span>
            <span style="font-size:28px;font-weight:700;color:#fff;letter-spacing:4px;text-transform:uppercase"> Lab</span>
          </div>
          <p style="margin:10px 0 0;color:#bfdbfe;font-size:13px;letter-spacing:1px">AI Superwizor Coachingu</p>
        </div>

        <!-- TREŚĆ -->
        <div style="padding:36px 32px 28px;background:#fff">
          <h2 style="margin:0 0 16px;font-size:22px;color:#1e3a8a;font-weight:700">Witaj w Session Lab! 🎉</h2>
          <p style="margin:0 0 12px;color:#334155;font-size:15px;line-height:1.6">
            Zostałeś zaproszony do platformy Session Lab jako <strong style="color:#1e3a8a">${roleLabel}</strong>.
            Cieszymy się, że jesteś z nami!
          </p>
          <p style="margin:0 0 24px;color:#334155;font-size:15px;line-height:1.6">
            Kliknij poniższy przycisk, aby utworzyć swoje konto i zacząć korzystać z platformy:
          </p>

          <!-- PRZYCISK -->
          <div style="text-align:center;margin:0 0 28px">
            <a href="${registrationLink}"
               style="display:inline-block;background:linear-gradient(135deg,#1e3a8a,#2563eb);color:#fff;text-decoration:none;padding:14px 36px;border-radius:10px;font-weight:700;font-size:15px;letter-spacing:0.3px">
              Utwórz konto
            </a>
          </div>

          <p style="margin:0 0 6px;color:#64748b;font-size:13px;text-align:center">
            Link jest jednorazowy i wygasa po 7 dniach.
          </p>

          <!-- OPIS PLATFORMY -->
          <div style="margin:24px 0 0;padding:20px 22px;background:#eff6ff;border-left:4px solid #2563eb;border-radius:8px">
            <p style="margin:0 0 6px;font-weight:700;color:#1e3a8a;font-size:14px">Co znajdziesz w Session Lab?</p>
            <p style="margin:0;color:#334155;font-size:13px;line-height:1.7">
              Zarządzaj sesjami coachingowymi, twórz notatki i plany, korzystaj z Mentora AI do superwizji
              oraz generuj profesjonalne raporty z postępów swoich coachees — wszystko w jednym miejscu.
              Mamy nadzieję, że Session Lab wesprze Twój rozwój i rozwój Twoich klientów. 🚀
            </p>
          </div>
        </div>

        <!-- STOPKA -->
        <div style="padding:20px 32px;background:#f1f5f9;text-align:center">
          <p style="margin:0;color:#94a3b8;font-size:12px">
            Jeśli nie spodziewałeś się tego zaproszenia, możesz zignorować tę wiadomość.
          </p>
          <p style="margin:6px 0 0;color:#cbd5e1;font-size:11px">Session Lab · sessionlab.app</p>
        </div>

      </div>
    `,
  });
}

export async function sendPasswordResetEmail(to: string, resetLink: string): Promise<void> {
  if (!isMailConfigured()) {
    console.log("\n[DEV - brak RESEND_API_KEY] Link do resetu hasła dla:", to);
    console.log("[DEV]", resetLink, "\n");
    return;
  }

  const resend = new Resend(process.env.RESEND_API_KEY);
  const from = process.env.EMAIL_FROM ?? "SessionLab <onboarding@resend.dev>";
  const ttl = process.env.RESET_TOKEN_TTL_MINUTES ?? "60";

  await resend.emails.send({
    from,
    to,
    subject: "SessionLab — reset hasła",
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto">
        <h2 style="color:#1d4ed8">Reset hasła — SessionLab</h2>
        <p>Otrzymaliśmy prośbę o reset hasła dla Twojego konta.</p>
        <p>
          <a href="${resetLink}" style="display:inline-block;background:#2563eb;color:#fff;text-decoration:none;padding:10px 20px;border-radius:8px;font-weight:600">
            Ustaw nowe hasło
          </a>
        </p>
        <p style="color:#64748b;font-size:13px">Link wygasa po ${ttl} minutach.</p>
        <p style="color:#94a3b8;font-size:12px">Jeśli nie prosiłeś o reset hasła, zignoruj tę wiadomość.</p>
      </div>
    `,
  });
}
