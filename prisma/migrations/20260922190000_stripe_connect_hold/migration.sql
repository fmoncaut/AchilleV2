-- Empreinte Stripe Connect (incrément 2.3). N’altère pas les réservations existantes.
-- Revert :
--   ALTER TABLE "Reservation" DROP COLUMN "paymentIntentId", DROP COLUMN "paymentState";
--   ALTER TABLE "Merchant" DROP COLUMN "stripeAccountId", DROP COLUMN "chargesEnabled",
--     DROP COLUMN "payoutsEnabled", DROP COLUMN "detailsSubmitted", DROP COLUMN "feeRate";
--   DROP TABLE "ProcessedStripeEvent";
--   DROP TYPE "PaymentState";

CREATE TYPE "PaymentState" AS ENUM (
    'NONE',
    'REQUIRES_ACTION',
    'AUTHORIZED',
    'CAPTURED',
    'CANCELED'
);

ALTER TABLE "Merchant" ADD COLUMN "stripeAccountId" TEXT;
ALTER TABLE "Merchant" ADD COLUMN "chargesEnabled" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Merchant" ADD COLUMN "payoutsEnabled" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Merchant" ADD COLUMN "detailsSubmitted" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Merchant" ADD COLUMN "feeRate" DECIMAL(6,4);

CREATE UNIQUE INDEX "Merchant_stripeAccountId_key" ON "Merchant"("stripeAccountId");

ALTER TABLE "Reservation" ADD COLUMN "paymentIntentId" TEXT;
ALTER TABLE "Reservation" ADD COLUMN "paymentState" "PaymentState" NOT NULL DEFAULT 'NONE';

CREATE UNIQUE INDEX "Reservation_paymentIntentId_key" ON "Reservation"("paymentIntentId");

CREATE TABLE "ProcessedStripeEvent" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ProcessedStripeEvent_pkey" PRIMARY KEY ("id")
);
