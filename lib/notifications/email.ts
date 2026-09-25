import nodemailer from "nodemailer";

import {
  emailFrom,
  isSmtpConfigured,
  smtpHost,
  smtpPassword,
  smtpPort,
  smtpUser,
} from "@/lib/auth-env";
import type { NotificationChannel, OutboundNotification } from "@/lib/notifications/types";

/** Canal e-mail via le SMTP Brevo déjà utilisé pour l’auth. */
export const emailChannel: NotificationChannel = {
  id: "email",
  async send(message: OutboundNotification) {
    const to = message.recipient.email?.trim();
    if (!to) {
      return;
    }
    if (!isSmtpConfigured) {
      if (process.env.NODE_ENV !== "production") {
        console.info(
          `[notifications] E-mail non envoyé (Brevo absent) vers ${to}\nSujet : ${message.subject}\n${message.text}`,
        );
      }
      return;
    }
    const transport = nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort,
      secure: smtpPort === 465,
      auth: { user: smtpUser, pass: smtpPassword },
    });
    await transport.sendMail({
      to,
      from: emailFrom,
      subject: message.subject,
      text: message.text,
    });
  },
};
