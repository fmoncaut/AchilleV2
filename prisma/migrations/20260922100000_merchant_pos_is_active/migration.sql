-- AlterTable
ALTER TABLE "Merchant" ADD COLUMN "isActive" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "Pos" ADD COLUMN "isActive" BOOLEAN NOT NULL DEFAULT true;
