/**
 * Clôture U.1 — parcours onboarding + persistance + gate (staging OK pour user jetable).
 * Usage: npx tsx scripts/verify-onboarding-closure.ts
 */
import { readFileSync } from "node:fs";
import { createHash, randomUUID } from "node:crypto";
import { PrismaClient } from "@prisma/client";

import { completeOnboarding } from "../lib/auth/onboarding";
import { TERMS_VERSION } from "../lib/auth/terms";
import {
  generateOtpCode,
  hashOtpCode,
  OTP_LENGTH,
  OTP_MAX_ATTEMPTS,
  OTP_TTL_MS,
  recordOtpSent,
  verifyOtpAttempt,
  invalidateOtp,
} from "../lib/auth/otp";
import { createAuthAdapter } from "../lib/auth/adapter";

function loadCleverDbUrl(): string {
  let buf = readFileSync(`${process.env.TEMP}/cc-env.json`);
  if (buf[0] === 0xff && buf[1] === 0xfe) {
    buf = Buffer.from(buf.toString("utf16le"), "utf8");
  }
  const j = JSON.parse(buf.toString("utf8").replace(/^\uFEFF/, ""));
  const app = Object.fromEntries(j.env.map((e: { name: string; value: string }) => [e.name, e.value]));
  const addon = Object.fromEntries(
    (j.fromAddons ?? []).flatMap(
      (a: { env?: { name: string; value: string }[] }) =>
        (a.env ?? []).map((e) => [e.name, e.value]),
    ),
  );
  const url = app.DATABASE_URL?.startsWith("postgres")
    ? app.DATABASE_URL
    : addon.POSTGRESQL_ADDON_URI;
  if (!url) throw new Error("DATABASE_URL staging introuvable");
  return url;
}

function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) throw new Error(`FAIL: ${msg}`);
}

async function main() {
  process.env.AUTH_SECRET ??= "closure-check-secret-not-for-prod";
  const url = process.env.DATABASE_URL?.startsWith("postgres")
    ? process.env.DATABASE_URL
    : loadCleverDbUrl();
  process.env.DATABASE_URL = url;

  const db = new PrismaClient();
  const stamp = Date.now().toString(36);
  const email = `closure-u1-${stamp}@example.com`;

  console.log("--- 1) Onboarding persistence + gate ---");
  const macros = await db.interestCategory.findMany({
    orderBy: { displayOrder: "asc" },
    take: 3,
    select: { id: true, name: true },
  });
  assert(macros.length >= 2, "macros d'intérêt présentes");

  const user = await db.user.create({
    data: {
      email,
      emailVerified: new Date(),
    },
  });

  await completeOnboarding({
    userId: user.id,
    interestCategoryIds: macros.slice(0, 2).map((m) => m.id),
    acceptTerms: true,
    marketingOptIn: false,
  });

  const after = await db.user.findUniqueOrThrow({
    where: { id: user.id },
    select: {
      termsAcceptedAt: true,
      termsVersion: true,
      onboardingCompletedAt: true,
    },
  });
  assert(after.termsAcceptedAt != null, "termsAcceptedAt posé");
  assert(after.termsVersion === TERMS_VERSION, `termsVersion=${TERMS_VERSION}`);
  assert(after.onboardingCompletedAt != null, "onboardingCompletedAt posé");

  const interests = await db.userInterest.findMany({
    where: { userId: user.id },
    select: { interestCategoryId: true },
  });
  assert(interests.length === 2, `UserInterest count=2 (got ${interests.length})`);

  // Gate: même condition que app/compte/(app)/layout.tsx
  const gateWouldRedirect = !after.onboardingCompletedAt;
  assert(!gateWouldRedirect, "gate /compte ne redirige plus");

  console.log(
    JSON.stringify(
      {
        email,
        termsVersion: after.termsVersion,
        termsAcceptedAt: after.termsAcceptedAt,
        onboardingCompletedAt: after.onboardingCompletedAt,
        userInterestCount: interests.length,
        gateRedirects: gateWouldRedirect,
      },
      null,
      2,
    ),
  );

  console.log("--- 2) OTP at-rest hash + single-use + lockout + TTL ---");
  const code = generateOtpCode();
  assert(code.length === OTP_LENGTH, "OTP 6 digits");
  assert(/^\d{6}$/.test(code), "OTP numérique");

  const hashed = hashOtpCode(code);
  assert(hashed !== code, "pas de clair au repos");
  assert(hashed.length === 64, "SHA-256 hex 64 chars");
  assert(
    hashed ===
      createHash("sha256")
        .update(`${code}${process.env.AUTH_SECRET!.trim()}`)
        .digest("hex"),
    "hash = SHA-256(code||AUTH_SECRET) (= contrat Auth.js)",
  );
  assert(
    hashed !== createHash("sha256").update(code).digest("hex"),
    "pas un SHA-256 nu du code (secret dans l'entrée)",
  );

  // Auth.js-compatible store
  const adapter = createAuthAdapter();
  await adapter.createVerificationToken!({
    identifier: email,
    token: hashed,
    expires: new Date(Date.now() + OTP_TTL_MS),
  });
  await recordOtpSent(email, "closure-ip");

  const stored = await db.verificationToken.findFirst({
    where: { identifier: email },
  });
  assert(stored?.token === hashed, "token stocké = hash");
  assert(stored?.token !== code, "clair absent de VerificationToken");

  // Lockout
  await db.emailOtpChallenge.update({
    where: { email },
    data: {
      attempts: 0,
      lastSentAt: new Date(Date.now() - 60_000),
      expiresAt: new Date(Date.now() + OTP_TTL_MS),
    },
  });
  for (let i = 0; i < OTP_MAX_ATTEMPTS; i++) {
    const bad = await verifyOtpAttempt(email, "000000");
    assert(!bad.ok && bad.error === "invalid", `essai ${i + 1} invalid`);
  }
  const locked = await verifyOtpAttempt(email, "000000");
  assert(!locked.ok && locked.error === "lockout", "lockout après 5+");

  // Single-use after fresh token
  const code2 = generateOtpCode();
  const hash2 = hashOtpCode(code2);
  await invalidateOtp(email);
  await adapter.createVerificationToken!({
    identifier: email,
    token: hash2,
    expires: new Date(Date.now() + OTP_TTL_MS),
  });
  await recordOtpSent(email, "closure-ip");
  await db.emailOtpChallenge.update({
    where: { email },
    data: {
      attempts: 0,
      lastSentAt: new Date(Date.now() - 60_000),
      expiresAt: new Date(Date.now() + OTP_TTL_MS),
    },
  });

  const ok1 = await verifyOtpAttempt(email, code2);
  assert(ok1.ok, "1er verify OK");
  const used = await adapter.useVerificationToken!({
    identifier: email,
    token: hash2,
  });
  assert(used != null, "token consommé");
  const replay = await adapter.useVerificationToken!({
    identifier: email,
    token: hash2,
  });
  assert(replay == null, "single-use");

  // TTL constant
  assert(OTP_TTL_MS === 10 * 60 * 1000, "TTL 10 min");
  assert(OTP_MAX_ATTEMPTS === 5, "max 5 essais");

  // Cleanup jetable
  await db.userInterest.deleteMany({ where: { userId: user.id } });
  await db.notificationPreference.deleteMany({ where: { userId: user.id } });
  await db.session.deleteMany({ where: { userId: user.id } });
  await db.verificationToken.deleteMany({ where: { identifier: email } });
  await db.emailOtpChallenge.deleteMany({ where: { email } });
  await db.emailOtpSendLog.deleteMany({ where: { email } });
  await db.user.delete({ where: { id: user.id } });

  console.log(
    JSON.stringify({
      otpAtRest: "SHA-256(code||AUTH_SECRET) — pas clair, pas SHA-256(code) seul",
      authJsAligned: true,
      hmacIdealNote:
        "Auth.js impose SHA-256(token+secret) avant persist ; secret dans l'entrée ⇒ brute-force 1e6 codes inutile sans AUTH_SECRET",
      singleUse: true,
      lockout5: true,
      ttl10min: true,
    }),
  );

  await db.$disconnect();
  console.log("OK closure checks 1+2");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
