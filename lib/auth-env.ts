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
export const smtpPassword = readEnv("SMTP_PASSWORD");
export const emailFrom = readEnv("EMAIL_FROM") ?? "Achille <noreply@localhost>";

export const isGoogleAuthEnabled = Boolean(
  googleClientId && googleClientSecret,
);
export const isAppleAuthEnabled = Boolean(appleClientId && appleClientSecret);
export const isSmtpConfigured = Boolean(smtpHost && smtpUser);
export const isEmailAuthEnabled =
  process.env.NODE_ENV !== "production" || isSmtpConfigured;
