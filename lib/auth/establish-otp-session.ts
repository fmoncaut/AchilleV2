import { randomUUID } from "node:crypto";
import { cookies } from "next/headers";

import { hashOtpCode, normalizeEmail } from "@/lib/auth/otp";
import { prisma } from "@/lib/db";

const SESSION_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;

/**
 * Crée la session Auth.js (strategy database) après OTP valide.
 * Évite le callback `/api/auth/callback/email` qui renvoyait Verification
 * et ramenait l’utilisateur sur /login sans session.
 */
export async function establishOtpSession(
  email: string,
  code: string,
): Promise<{ ok: true } | { ok: false }> {
  const identifier = normalizeEmail(email);
  const token = hashOtpCode(code.trim());

  const deleted = await prisma.verificationToken
    .delete({
      where: { identifier_token: { identifier, token } },
    })
    .catch(() => null);

  if (!deleted) {
    return { ok: false };
  }

  const now = new Date();
  const user = await prisma.user.upsert({
    where: { email: identifier },
    create: {
      email: identifier,
      emailVerified: now,
    },
    update: {
      emailVerified: now,
    },
  });

  const sessionToken = randomUUID();
  const expires = new Date(Date.now() + SESSION_MAX_AGE_MS);
  await prisma.session.create({
    data: {
      sessionToken,
      userId: user.id,
      expires,
    },
  });

  const useSecure =
    (process.env.AUTH_URL ?? "").startsWith("https://") ||
    process.env.NODE_ENV === "production";
  const cookieName = useSecure
    ? "__Secure-authjs.session-token"
    : "authjs.session-token";

  const jar = await cookies();
  jar.set(cookieName, sessionToken, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    secure: useSecure,
    expires,
  });

  return { ok: true };
}
