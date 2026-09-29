import { createHash, createHmac, randomInt } from "node:crypto";

import { prisma } from "@/lib/db";

export const OTP_LENGTH = 6;
export const OTP_TTL_MS = 10 * 60 * 1000;
export const OTP_MAX_ATTEMPTS = 5;
export const OTP_RESEND_COOLDOWN_MS = 30 * 1000;
export const OTP_EMAIL_MAX_PER_HOUR = 5;
export const OTP_IP_MAX_PER_HOUR = 20;

export type OtpSendError =
  | "cooldown"
  | "rate_email"
  | "rate_ip"
  | "smtp_unavailable";

export type OtpVerifyError = "invalid" | "expired" | "lockout" | "missing";

function authPepper(): string {
  const secret = process.env.AUTH_SECRET?.trim();
  if (!secret) {
    throw new Error("AUTH_SECRET manquant.");
  }
  return secret;
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function hashOtpCode(code: string): string {
  return createHmac("sha256", authPepper()).update(`otp:${code}`).digest("hex");
}

export function hashIp(ip: string | null | undefined): string | null {
  if (!ip) return null;
  return createHash("sha256")
    .update(`${authPepper()}:ip:${ip}`)
    .digest("hex")
    .slice(0, 32);
}

export function generateOtpCode(): string {
  const max = 10 ** OTP_LENGTH;
  return String(randomInt(0, max)).padStart(OTP_LENGTH, "0");
}

export async function assertCanSendOtp(
  email: string,
  ipHash: string | null,
): Promise<{ ok: true } | { ok: false; error: OtpSendError }> {
  const normalized = normalizeEmail(email);
  const now = new Date();
  const hourAgo = new Date(now.getTime() - 60 * 60 * 1000);

  const challenge = await prisma.emailOtpChallenge.findUnique({
    where: { email: normalized },
  });
  if (
    challenge &&
    now.getTime() - challenge.lastSentAt.getTime() < OTP_RESEND_COOLDOWN_MS
  ) {
    return { ok: false, error: "cooldown" };
  }

  const emailSends = await prisma.emailOtpSendLog.count({
    where: { email: normalized, createdAt: { gte: hourAgo } },
  });
  if (emailSends >= OTP_EMAIL_MAX_PER_HOUR) {
    return { ok: false, error: "rate_email" };
  }

  if (ipHash) {
    const ipSends = await prisma.emailOtpSendLog.count({
      where: { ipHash, createdAt: { gte: hourAgo } },
    });
    if (ipSends >= OTP_IP_MAX_PER_HOUR) {
      return { ok: false, error: "rate_ip" };
    }
  }

  return { ok: true };
}

/** Invalide tokens + challenge (lockout ou nouvel envoi). */
export async function invalidateOtp(email: string): Promise<void> {
  const normalized = normalizeEmail(email);
  await prisma.$transaction([
    prisma.verificationToken.deleteMany({ where: { identifier: normalized } }),
    prisma.emailOtpChallenge.deleteMany({ where: { email: normalized } }),
  ]);
}

export async function recordOtpSent(
  email: string,
  ipHash: string | null,
): Promise<void> {
  const normalized = normalizeEmail(email);
  const now = new Date();
  const expiresAt = new Date(now.getTime() + OTP_TTL_MS);

  await prisma.$transaction([
    prisma.emailOtpChallenge.upsert({
      where: { email: normalized },
      create: {
        email: normalized,
        ipHash,
        attempts: 0,
        lastSentAt: now,
        expiresAt,
      },
      update: {
        ipHash,
        attempts: 0,
        lastSentAt: now,
        expiresAt,
      },
    }),
    prisma.emailOtpSendLog.create({
      data: { email: normalized, ipHash },
    }),
  ]);
}

/**
 * Incrémente atomiquement les tentatives, puis valide le code hashé.
 * Au-delà de 5 tentatives : invalide le challenge (force un nouvel envoi).
 */
export async function verifyOtpAttempt(
  email: string,
  code: string,
): Promise<{ ok: true } | { ok: false; error: OtpVerifyError }> {
  const normalized = normalizeEmail(email);
  const now = new Date();

  const bumped = await prisma.$queryRaw<
    Array<{ attempts: number; expiresAt: Date }>
  >`
    UPDATE "EmailOtpChallenge"
    SET "attempts" = "attempts" + 1,
        "updatedAt" = ${now}
    WHERE "email" = ${normalized}
    RETURNING "attempts", "expiresAt"
  `;

  const challenge = bumped[0];
  if (!challenge) {
    return { ok: false, error: "missing" };
  }

  if (challenge.expiresAt.getTime() < now.getTime()) {
    await invalidateOtp(normalized);
    return { ok: false, error: "expired" };
  }

  if (challenge.attempts > OTP_MAX_ATTEMPTS) {
    await invalidateOtp(normalized);
    return { ok: false, error: "lockout" };
  }

  const token = hashOtpCode(code.trim());
  const stored = await prisma.verificationToken.findUnique({
    where: {
      identifier_token: { identifier: normalized, token },
    },
  });

  if (!stored || stored.expires.getTime() < now.getTime()) {
    return { ok: false, error: "invalid" };
  }

  // Succès : usage unique — Auth.js callback consommera le token ;
  // on retire le challenge pour bloquer les rejeux de tentatives.
  await prisma.emailOtpChallenge.deleteMany({ where: { email: normalized } });
  return { ok: true };
}
