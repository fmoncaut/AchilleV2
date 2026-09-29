-- Alignement profil acheteur + macro-catégories (intérêts).
-- Revert :
--   DROP INDEX IF EXISTS "NotificationPreference_order_updates_user_key";
--   DROP INDEX IF EXISTS "NotificationPreference_deal_alerts_user_macro_key";
--   DROP TABLE IF EXISTS "NotificationPreference";
--   DROP TABLE IF EXISTS "UserAddress";
--   DROP TABLE IF EXISTS "UserInterest";
--   DROP TYPE IF EXISTS "NotificationKind";
--   ALTER TABLE "Category" DROP CONSTRAINT IF EXISTS "Category_macroId_fkey";
--   DROP INDEX IF EXISTS "Category_macroId_idx";
--   ALTER TABLE "Category" DROP COLUMN IF EXISTS "macroId";
--   ALTER TABLE "Category" DROP COLUMN IF EXISTS "displayOrder";
--   DROP TABLE IF EXISTS "InterestCategory";

CREATE TABLE "InterestCategory" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "displayOrder" INTEGER NOT NULL,
    "icon" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InterestCategory_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "InterestCategory_code_key" ON "InterestCategory"("code");

ALTER TABLE "Category" ADD COLUMN "displayOrder" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Category" ADD COLUMN "macroId" TEXT;

CREATE INDEX "Category_macroId_idx" ON "Category"("macroId");

ALTER TABLE "Category" ADD CONSTRAINT "Category_macroId_fkey"
  FOREIGN KEY ("macroId") REFERENCES "InterestCategory"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "UserInterest" (
    "userId" TEXT NOT NULL,
    "interestCategoryId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserInterest_pkey" PRIMARY KEY ("userId","interestCategoryId")
);

CREATE INDEX "UserInterest_interestCategoryId_idx" ON "UserInterest"("interestCategoryId");

ALTER TABLE "UserInterest" ADD CONSTRAINT "UserInterest_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "UserInterest" ADD CONSTRAINT "UserInterest_interestCategoryId_fkey"
  FOREIGN KEY ("interestCategoryId") REFERENCES "InterestCategory"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "UserAddress" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "street" TEXT NOT NULL,
    "postalCode" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "country" TEXT NOT NULL DEFAULT 'FR',
    "phone" TEXT,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserAddress_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "UserAddress_userId_idx" ON "UserAddress"("userId");

ALTER TABLE "UserAddress" ADD CONSTRAINT "UserAddress_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TYPE "NotificationKind" AS ENUM ('ORDER_UPDATES', 'DEAL_ALERTS');

CREATE TABLE "NotificationPreference" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "kind" "NotificationKind" NOT NULL,
    "interestCategoryId" TEXT,
    "emailEnabled" BOOLEAN NOT NULL DEFAULT true,
    "pushEnabled" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NotificationPreference_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "NotificationPreference_userId_idx" ON "NotificationPreference"("userId");
CREATE INDEX "NotificationPreference_interestCategoryId_idx" ON "NotificationPreference"("interestCategoryId");

-- Unicité : une préférence ORDER_UPDATES globale / user ; une DEAL_ALERTS / user / macro.
CREATE UNIQUE INDEX "NotificationPreference_order_updates_user_key"
  ON "NotificationPreference"("userId")
  WHERE "kind" = 'ORDER_UPDATES' AND "interestCategoryId" IS NULL;

CREATE UNIQUE INDEX "NotificationPreference_deal_alerts_user_macro_key"
  ON "NotificationPreference"("userId", "interestCategoryId")
  WHERE "kind" = 'DEAL_ALERTS' AND "interestCategoryId" IS NOT NULL;

ALTER TABLE "NotificationPreference" ADD CONSTRAINT "NotificationPreference_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "NotificationPreference" ADD CONSTRAINT "NotificationPreference_interestCategoryId_fkey"
  FOREIGN KEY ("interestCategoryId") REFERENCES "InterestCategory"("id") ON DELETE CASCADE ON UPDATE CASCADE;
