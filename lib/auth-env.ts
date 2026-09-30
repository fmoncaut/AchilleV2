function readEnv(...keys: string[]): string | undefined {
  for (const key of keys) {
    const value = process.env[key]?.trim();
    if (value) {
      return value;
    }
  }
  return undefined;
}

export const googleClientId = readEnv("GOOGLE_CLIENT_ID", "AUTH_GOOGLE_ID");
export const googleClientSecret = readEnv(
  "GOOGLE_CLIENT_SECRET",
  "AUTH_GOOGLE_SECRET",
);

export const appleClientId = readEnv("APPLE_ID", "AUTH_APPLE_ID");
export const appleClientSecret = readEnv("APPLE_SECRET", "AUTH_APPLE_SECRET");

export const smtpHost = readEnv("SMTP_HOST");
export const smtpPort = Number(readEnv("SMTP_PORT") ?? "587");
export const smtpUser = readEnv("SMTP_USER");
/**
 * Mot de passe / clé SMTP Brevo.
 * Canonique : SMTP_PASSWORD. Alias de repli : SMTP_KEY.
 */
export const smtpPassword = readEnv("SMTP_PASSWORD", "SMTP_KEY");

/**
 * Expéditeur obligatoire (domaine vérifié chez Brevo).
 * Pas de fallback noreply@localhost — Brevo le rejette et masque les pannes.
 */
export const emailFrom = readEnv("EMAIL_FROM");

export function requireEmailFrom(): string {
  if (!emailFrom) {
    throw new Error(
      "EMAIL_FROM est obligatoire (ex. Akwire <noreply@akwire.fr>). Aucun expéditeur par défaut.",
    );
  }
  return emailFrom;
}

export const isGoogleAuthEnabled = Boolean(
  googleClientId && googleClientSecret,
);
export const isAppleAuthEnabled = Boolean(appleClientId && appleClientSecret);

/** SMTP prêt à envoyer : host + user + clé + EMAIL_FROM. */
export const isSmtpConfigured = Boolean(
  smtpHost && smtpUser && smtpPassword && emailFrom,
);

export const isEmailAuthEnabled =
  process.env.NODE_ENV !== "production" || isSmtpConfigured;
