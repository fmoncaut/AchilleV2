import nodemailer from "nodemailer";

import {
  isSmtpConfigured,
  requireEmailFrom,
  smtpHost,
  smtpPassword,
  smtpPort,
  smtpUser,
} from "@/lib/auth-env";

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
    html: `<p>Votre code de connexion Akwire :</p><p style="font-size:28px;font-weight:700;letter-spacing:0.2em">${token}</p><p>Il expire dans 10 minutes. Si vous n'êtes pas à l'origine de cette demande, ignorez cet e-mail.</p>`,
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
