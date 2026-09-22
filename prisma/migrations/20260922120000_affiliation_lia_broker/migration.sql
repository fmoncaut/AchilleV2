-- Affiliation v2 : kind, portée LIA, brokers.
-- Revert (après avoir réaffecté un posId aux offres ENSEIGNE) :
--   DROP TABLE "OfferPos";
--   ALTER TABLE "Offer" DROP CONSTRAINT "Offer_brokerId_fkey";
--   DROP INDEX "Offer_brokerId_idx";
--   ALTER TABLE "Offer" DROP COLUMN "brokerRate", DROP COLUMN "brokerId", DROP COLUMN "scope", DROP COLUMN "kind";
--   DELETE FROM "Offer" WHERE "posId" IS NULL;
--   ALTER TABLE "Offer" ALTER COLUMN "posId" SET NOT NULL;
--   DROP TABLE "Broker";
--   DROP TYPE "BrokerType";
--   DROP TYPE "OfferScope";
--   DROP TYPE "OfferKind";

CREATE TYPE "OfferKind" AS ENUM ('DIRECT', 'AFFILIATION');
CREATE TYPE "OfferScope" AS ENUM ('ENSEIGNE', 'POS_CIBLES');
CREATE TYPE "BrokerType" AS ENUM ('CPC', 'CPA');

CREATE TABLE "Broker" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "billingType" "BrokerType" NOT NULL DEFAULT 'CPC',
    "urlTemplate" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Broker_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Broker_slug_key" ON "Broker"("slug");

ALTER TABLE "Offer" ADD COLUMN "kind" "OfferKind" NOT NULL DEFAULT 'AFFILIATION';
ALTER TABLE "Offer" ADD COLUMN "scope" "OfferScope" NOT NULL DEFAULT 'POS_CIBLES';
ALTER TABLE "Offer" ADD COLUMN "brokerId" TEXT;
ALTER TABLE "Offer" ADD COLUMN "brokerRate" DECIMAL(10,2);
ALTER TABLE "Offer" ALTER COLUMN "posId" DROP NOT NULL;

CREATE INDEX "Offer_brokerId_idx" ON "Offer"("brokerId");

ALTER TABLE "Offer" ADD CONSTRAINT "Offer_brokerId_fkey"
    FOREIGN KEY ("brokerId") REFERENCES "Broker"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "OfferPos" (
    "offerId" TEXT NOT NULL,
    "posId" TEXT NOT NULL,
    CONSTRAINT "OfferPos_pkey" PRIMARY KEY ("offerId","posId")
);

CREATE INDEX "OfferPos_posId_idx" ON "OfferPos"("posId");

-- Offres existantes : affiliation ciblée sur leur magasin actuel.
INSERT INTO "OfferPos" ("offerId", "posId")
SELECT "id", "posId" FROM "Offer" WHERE "posId" IS NOT NULL;

ALTER TABLE "OfferPos" ADD CONSTRAINT "OfferPos_offerId_fkey"
    FOREIGN KEY ("offerId") REFERENCES "Offer"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "OfferPos" ADD CONSTRAINT "OfferPos_posId_fkey"
    FOREIGN KEY ("posId") REFERENCES "Pos"("id") ON DELETE CASCADE ON UPDATE CASCADE;
