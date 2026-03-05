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
  const from = process.env.EMAIL_FROM ?? "SessionLab <onboarding@resend.dev>";
  const roleLabel = role === "ADMIN" ? "administratora" : "coacha";

  await resend.emails.send({
    from,
    to,
    subject: "Zaproszenie do SessionLab",
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto">
        <h2 style="color:#1d4ed8">Zaproszenie do SessionLab</h2>
        <p>Zostałeś zaproszony do platformy SessionLab jako <strong>${roleLabel}</strong>.</p>
        <p>Kliknij poniższy przycisk, aby utworzyć swoje konto:</p>
        <p>
          <a href="${registrationLink}" style="display:inline-block;background:#2563eb;color:#fff;text-decoration:none;padding:10px 20px;border-radius:8px;font-weight:600">
            Utwórz konto
          </a>
        </p>
        <p style="color:#64748b;font-size:13px">Link jest jednorazowy i wygasa po 7 dniach.</p>
        <p style="color:#94a3b8;font-size:12px">Jeśli nie spodziewałeś się tego zaproszenia, zignoruj tę wiadomość.</p>
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
