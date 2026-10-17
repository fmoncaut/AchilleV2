import nodemailer from "nodemailer";

import {
  isSmtpConfigured,
  requireEmailFrom,
  smtpHost,
  smtpPassword,
  smtpPort,
  smtpUser,
} from "@/lib/auth-env";
import { renderEmailLayout } from "@/lib/notifications/email-layout";

type OtpMailParams = {
  identifier: string;
  token: string;
};

export const OTP_MAIL_SUBJECT = "Votre code Akwire";

export function buildOtpMailContent(token: string): {
  subject: string;
  text: string;
  html: string;
} {
  return {
    subject: OTP_MAIL_SUBJECT,
    text: `Votre code de connexion Akwire : ${token}\n\nIl expire dans 10 minutes. Si vous n'êtes pas à l'origine de cette demande, ignorez cet e-mail.`,
    html: renderEmailLayout({
      preheader: "Votre code de connexion Akwire",
      title: "Votre code de connexion",
      bodyHtml: `<p class="email-text" style="margin:0 0 16px;font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:24px;color:#0E1C2E;">Votre code de connexion Akwire :</p><p class="email-text" style="margin:0 0 16px;font-family:Arial,Helvetica,sans-serif;font-size:28px;line-height:36px;font-weight:700;letter-spacing:0.2em;color:#13263F;">${token.replaceAll("&", "&amp;").replaceAll("<", "&lt;")}</p><p class="email-text" style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:24px;color:#0E1C2E;">Il expire dans 10 minutes. Si vous n'êtes pas à l'origine de cette demande, ignorez cet e-mail.</p>`,
    }),
  };
}

/**
 * Envoie le code OTP. Propage toute erreur SMTP / EMAIL_FROM manquant
 * (pas de succès silencieux).
 */
export async function sendOtpEmail({ identifier, token }: OtpMailParams) {
  const from = requireEmailFrom();
  const { subject, text, html } = buildOtpMailContent(token);

  if (!isSmtpConfigured) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("SMTP n'est pas configuré (host/user/password/EMAIL_FROM).");
    }
    // Dev sans SMTP : log console uniquement, EMAIL_FROM déjà exigé ci-dessus.
    console.info(
      `[auth] Code OTP pour ${identifier} (non envoyé, SMTP absent) : ${token}`,
    );
    return;
  }

  const transport = nodemailer.createTransport({
    host: smtpHost,
    port: smtpPort,
    secure: smtpPort === 465,
    auth: {
      user: smtpUser,
      pass: smtpPassword,
    },
  });

  await transport.sendMail({
    to: identifier,
    from,
    subject,
    text,
    html,
  });
}
