-- CreateEnum
CREATE TYPE "PosStatusSource" AS ENUM ('AUTO', 'MANUAL');

-- AlterTable
ALTER TABLE "Merchant" ADD COLUMN "posPublished" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Merchant" ADD COLUMN "legacyNetwork" TEXT;

-- AlterTable
ALTER TABLE "Pos" ADD COLUMN "statusSource" "PosStatusSource" NOT NULL DEFAULT 'AUTO';

-- CreateIndex
CREATE INDEX "Pos_status_idx" ON "Pos"("status");

-- CreateIndex
CREATE INDEX "Pos_merchantId_statusSource_idx" ON "Pos"("merchantId", "statusSource");
