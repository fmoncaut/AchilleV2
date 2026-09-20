import nodemailer from "nodemailer";

import {
  emailFrom,
  isSmtpConfigured,
  smtpHost,
  smtpPassword,
  smtpPort,
  smtpUser,
} from "@/lib/auth-env";

type VerificationRequestParams = {
  identifier: string;
  url: string;
};

export async function sendVerificationRequest({
  identifier,
  url,
}: VerificationRequestParams) {
  if (!isSmtpConfigured) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("SMTP n'est pas configuré.");
    }

    console.info(
      `[auth] Lien magique pour ${identifier} (non envoyé, SMTP absent) :\n${url}`,
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
    from: emailFrom,
    subject: "Votre lien de connexion Achille",
    text: `Cliquez pour vous connecter à Achille : ${url}`,
    html: `<p>Cliquez pour vous connecter à Achille :</p><p><a href="${url}">Se connecter</a></p>`,
  });
}
