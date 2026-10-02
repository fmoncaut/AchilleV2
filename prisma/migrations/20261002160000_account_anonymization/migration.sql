-- U.6b : anonymisation compte + snapshot identité facture
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMP(3);

ALTER TABLE "Reservation" ADD COLUMN IF NOT EXISTS "buyerName" TEXT;
ALTER TABLE "Reservation" ADD COLUMN IF NOT EXISTS "buyerEmail" TEXT;
