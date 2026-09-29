import nodemailer from "nodemailer";

import {
  emailFrom,
  isSmtpConfigured,
  smtpHost,
  smtpPassword,
  smtpPort,
  smtpUser,
} from "@/lib/auth-env";

type OtpMailParams = {
  identifier: string;
  token: string;
};

export async function sendOtpEmail({ identifier, token }: OtpMailParams) {
  const subject = "Votre code Achille";
  const text = `Votre code de connexion Achille : ${token}\n\nIl expire dans 10 minutes. Si vous n'êtes pas à l'origine de cette demande, ignorez cet e-mail.`;
  const html = `<p>Votre code de connexion Achille :</p><p style="font-size:28px;font-weight:700;letter-spacing:0.2em">${token}</p><p>Il expire dans 10 minutes. Si vous n'êtes pas à l'origine de cette demande, ignorez cet e-mail.</p>`;

  if (!isSmtpConfigured) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("SMTP n'est pas configuré.");
    }
    console.info(`[auth] Code OTP pour ${identifier} (non envoyé, SMTP absent) : ${token}`);
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
    from: emailFrom,
    subject,
    text,
    html,
  });
}
