/**
 * U.1 — OTP (TTL/tentatives/cooldown/rate-limit), linking e-mail, onboarding, prefs, env-gate.
 * Refuse staging / base « achille ».
 *
 * Usage :
 *   AUTH_B2C_DATABASE=achille_auth_b2c_jetable \
 *   DATABASE_URL=postgresql://…/achille_auth_b2c_jetable \
 *   AUTH_SECRET=test-secret-u1 \
 *   npx tsx scripts/verify-auth-b2c.ts
 */
import { createAuthAdapter } from "../lib/auth/adapter";
import {
  assertCanSendOtp,
  generateOtpCode,
  hashOtpCode,
  invalidateOtp,
  OTP_MAX_ATTEMPTS,
  OTP_RESEND_COOLDOWN_MS,
  recordOtpSent,
  verifyOtpAttempt,
} from "../lib/auth/otp";
import { completeOnboarding } from "../lib/auth/onboarding";
import { TERMS_VERSION } from "../lib/auth/terms";
import { isAppleAuthEnabled, isGoogleAuthEnabled } from "../lib/auth-env";
import { seedInterestMacros } from "../lib/categories/seed-interest-macros";
import { PrismaClient } from "@prisma/client";

const STAGING = "bwljfjzai3tw8itz8ilf";
const LOCAL = "achille";

function databaseName(): string {
  try {
    return new URL(process.env.DATABASE_URL ?? "").pathname.replace(/^\//, "");
  } catch {
    return "";
  }
}

function assertDisposable(): void {
  const name = databaseName();
  const allowed = process.env.AUTH_B2C_DATABASE ?? "";
  if (!allowed || name !== allowed || name === LOCAL || name === STAGING) {
    throw new Error("Refus : ce test n'écrit pas hors d'une base jetable.");
  }
}

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

async function main() {
  assertDisposable();
  assert(process.env.AUTH_SECRET, "AUTH_SECRET requis.");

  const db = new PrismaClient();
  const adapter = createAuthAdapter();
  const stamp = Date.now();
  const email = `u1-${stamp}@example.com`;

  await seedInterestMacros(db);
  const macros = await db.interestCategory.findMany({
    orderBy: { displayOrder: "asc" },
    take: 6,
  });
  assert(macros.length >= 5, "Macros d'intérêt requises.");

  // --- OTP : envoi + cooldown ---
  const can1 = await assertCanSendOtp(email, "ip-test");
  assert(can1.ok, "Premier envoi autorisé.");
  const code = generateOtpCode();
  await adapter.createVerificationToken!({
    identifier: email,
    token: code,
    expires: new Date(Date.now() + 10 * 60 * 1000),
  });
  await recordOtpSent(email, "ip-test");

  const stored = await db.verificationToken.findFirst({ where: { identifier: email } });
  assert(stored?.token === hashOtpCode(code), "Code hashé au repos.");
  assert(stored?.token !== code, "Pas de clair en base.");

  const cooldown = await assertCanSendOtp(email, "ip-test");
  assert(!cooldown.ok && cooldown.error === "cooldown", "Cooldown 30 s.");

  // --- Tentatives + lockout ---
  for (let i = 0; i < OTP_MAX_ATTEMPTS; i++) {
    const bad = await verifyOtpAttempt(email, "000000");
    assert(!bad.ok && bad.error === "invalid", `Tentative ${i + 1} invalid.`);
  }
  const locked = await verifyOtpAttempt(email, "000000");
  assert(!locked.ok && locked.error === "lockout", "Lockout après 5+ essais.");
  const gone = await db.verificationToken.count({ where: { identifier: email } });
  assert(gone === 0, "Tokens invalidés au lockout.");

  // --- Succès usage unique ---
  const code2 = generateOtpCode();
  await recordOtpSent(email, "ip-test");
  await adapter.createVerificationToken!({
    identifier: email,
    token: code2,
    expires: new Date(Date.now() + 10 * 60 * 1000),
  });
  await db.emailOtpChallenge.update({
    where: { email },
    data: {
      lastSentAt: new Date(Date.now() - OTP_RESEND_COOLDOWN_MS - 1000),
      attempts: 0,
      expiresAt: new Date(Date.now() + 10 * 60 * 1000),
    },
  });

  const ok = await verifyOtpAttempt(email, code2);
  assert(ok.ok, "Vérif OTP OK.");
  const used = await adapter.useVerificationToken!({
    identifier: email,
    token: code2,
  });
  assert(used != null, "Token consommé (usage unique).");
  const replay = await adapter.useVerificationToken!({
    identifier: email,
    token: code2,
  });
  assert(replay == null, "Rejeu impossible.");

  // --- Linking par e-mail vérifié (simulation adapter) ---
  const userOtp = await adapter.createUser!({
    id: crypto.randomUUID(),
    email,
    emailVerified: new Date(),
    role: "USER",
    merchantId: null,
  });
  assert(userOtp.emailVerified != null, "OTP pose emailVerified.");

  await adapter.linkAccount!({
    userId: userOtp.id!,
    type: "oauth",
    provider: "google",
    providerAccountId: `google-${stamp}`,
  });

  const byEmail = await adapter.getUserByEmail!(email);
  assert(byEmail?.id === userOtp.id, "Même e-mail → même User.");

  const accounts = await db.account.findMany({ where: { userId: userOtp.id! } });
  assert(accounts.length === 1 && accounts[0]?.provider === "google", "Google lié.");

  // Sens inverse : User Google puis « OTP » = getUserByEmail
  const email2 = `u1-g-${stamp}@example.com`;
  const userGoogle = await adapter.createUser!({
    id: crypto.randomUUID(),
    email: email2,
    emailVerified: new Date(),
    name: "Google User",
    role: "USER",
    merchantId: null,
  });
  await adapter.linkAccount!({
    userId: userGoogle.id!,
    type: "oauth",
    provider: "google",
    providerAccountId: `google-first-${stamp}`,
  });
  const again = await adapter.getUserByEmail!(email2);
  assert(again?.id === userGoogle.id, "OTP après Google retrouve le User.");

  // --- Onboarding skippable + prefs ---
  await completeOnboarding({
    userId: userOtp.id!,
    interestCategoryIds: [],
    acceptTerms: true,
    marketingOptIn: false,
  });
  const afterSkip = await db.user.findUniqueOrThrow({ where: { id: userOtp.id! } });
  assert(afterSkip.onboardingCompletedAt != null, "Skip pose onboardingCompletedAt.");
  assert(afterSkip.termsAcceptedAt != null, "CGU posée.");
  assert(afterSkip.termsVersion === TERMS_VERSION, "termsVersion.");

  const interestsSkip = await db.userInterest.count({ where: { userId: userOtp.id! } });
  assert(interestsSkip === 0, "Skip → 0 intérêt (feed non perso).");

  const dealOff = await db.notificationPreference.findFirst({
    where: {
      userId: userOtp.id!,
      kind: "DEAL_ALERTS",
      interestCategoryId: null,
    },
  });
  assert(dealOff?.emailEnabled === false, "Marketing décoché → DEAL_ALERTS off.");

  const orderOn = await db.notificationPreference.findFirst({
    where: {
      userId: userOtp.id!,
      kind: "ORDER_UPDATES",
      interestCategoryId: null,
    },
  });
  assert(orderOn?.emailEnabled === true, "ORDER_UPDATES on par défaut.");

  // Reset onboarding pour tester submit avec 5 macros
  await db.user.update({
    where: { id: userOtp.id! },
    data: { onboardingCompletedAt: null },
  });
  await completeOnboarding({
    userId: userOtp.id!,
    interestCategoryIds: macros.slice(0, 5).map((m) => m.id),
    acceptTerms: true,
    marketingOptIn: true,
  });
  const interests = await db.userInterest.count({ where: { userId: userOtp.id! } });
  assert(interests === 5, "Jusqu'à 5 intérêts écrits.");
  const dealOn = await db.notificationPreference.findFirst({
    where: {
      userId: userOtp.id!,
      kind: "DEAL_ALERTS",
      interestCategoryId: null,
    },
  });
  assert(dealOn?.emailEnabled === true, "Opt-in → DEAL_ALERTS on.");

  // --- Env-gate social (sans credentials dans ce process) ---
  assert(
    isGoogleAuthEnabled === Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET),
    "Google env-gated.",
  );
  assert(
    isAppleAuthEnabled === Boolean(process.env.APPLE_ID && process.env.APPLE_SECRET),
    "Apple env-gated.",
  );

  await invalidateOtp(email);
  console.log(
    JSON.stringify({
      ok: true,
      otp: "hash+lockout+unique",
      linking: "google+otp same email",
      onboarding: { skip: 0, submit: 5 },
      dealAlertsDefaultOff: true,
      termsVersion: TERMS_VERSION,
      googleEnabled: isGoogleAuthEnabled,
      appleEnabled: isAppleAuthEnabled,
    }),
  );

  await db.$disconnect();
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
