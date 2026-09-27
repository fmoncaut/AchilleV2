-- CreateEnum
CREATE TYPE "PosStatus" AS ENUM ('ACTIVE_VISIBLE', 'INACTIVE_VISIBLE', 'INACTIVE_HIDDEN');

-- AlterTable
ALTER TABLE "Category" ADD COLUMN "googleCategoryCode" TEXT;

-- AlterTable
ALTER TABLE "Pos" ADD COLUMN "status" "PosStatus" NOT NULL DEFAULT 'ACTIVE_VISIBLE',
ADD COLUMN "legacyDealerId" TEXT,
ADD COLUMN "legacyFuzionContainerId" TEXT,
ADD COLUMN "promotedToProdAt" TIMESTAMP(3),
ADD COLUMN "logoUrl" TEXT;

-- Les POS déjà masqués par isActive restent hors vitrine.
UPDATE "Pos" SET "status" = 'INACTIVE_HIDDEN' WHERE "isActive" = false;
