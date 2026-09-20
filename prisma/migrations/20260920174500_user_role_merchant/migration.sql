-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('USER', 'MERCHANT', 'ADMIN');

-- AlterTable User : rôle + rattachement enseigne (champs auth existants conservés)
ALTER TABLE "User" ADD COLUMN "role" "UserRole" NOT NULL DEFAULT 'USER';
ALTER TABLE "User" ADD COLUMN "merchantId" TEXT;

-- CreateIndex
CREATE INDEX "User_merchantId_idx" ON "User"("merchantId");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_merchantId_fkey" FOREIGN KEY ("merchantId") REFERENCES "Merchant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AlterTable Offer : une offre par produit et POS + index enseigne
CREATE UNIQUE INDEX "Offer_productId_posId_key" ON "Offer"("productId", "posId");
CREATE INDEX "Offer_merchantId_idx" ON "Offer"("merchantId");
