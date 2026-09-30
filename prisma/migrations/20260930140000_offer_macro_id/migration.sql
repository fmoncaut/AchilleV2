-- Denormalized resolved interest macro on Offer (U.2.0 feed perf).
-- Distinct from Category.macroId (direct node mapping).

ALTER TABLE "Offer" ADD COLUMN "macroId" TEXT;

CREATE INDEX "Offer_macroId_idx" ON "Offer"("macroId");

ALTER TABLE "Offer" ADD CONSTRAINT "Offer_macroId_fkey"
  FOREIGN KEY ("macroId") REFERENCES "InterestCategory"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
