-- U.1 — auth B2C : flags onboarding/CGU, challenge OTP, DEAL_ALERTS global.

ALTER TABLE "User" ADD COLUMN "termsAcceptedAt" TIMESTAMP(3);
ALTER TABLE "User" ADD COLUMN "termsVersion" TEXT;
ALTER TABLE "User" ADD COLUMN "onboardingCompletedAt" TIMESTAMP(3);

-- Challenge OTP (tentatives / cooldown). Le code vit dans VerificationToken (hashé).
CREATE TABLE "EmailOtpChallenge" (
    "email" TEXT NOT NULL,
    "ipHash" TEXT,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "lastSentAt" TIMESTAMP(3) NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmailOtpChallenge_pkey" PRIMARY KEY ("email")
);

CREATE INDEX "EmailOtpChallenge_ipHash_lastSentAt_idx"
  ON "EmailOtpChallenge"("ipHash", "lastSentAt");

-- Journal d'envois pour rate-limit email + IP.
CREATE TABLE "EmailOtpSendLog" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "ipHash" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EmailOtpSendLog_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "EmailOtpSendLog_email_createdAt_idx"
  ON "EmailOtpSendLog"("email", "createdAt");
CREATE INDEX "EmailOtpSendLog_ipHash_createdAt_idx"
  ON "EmailOtpSendLog"("ipHash", "createdAt");

-- Master switch marketing (U.1). U.6 ajoutera des overrides par macro.
-- Sémantique future : envoi si master ON et override macro non-OFF.
CREATE UNIQUE INDEX "NotificationPreference_deal_alerts_user_global_key"
  ON "NotificationPreference"("userId")
  WHERE "kind" = 'DEAL_ALERTS' AND "interestCategoryId" IS NULL;
