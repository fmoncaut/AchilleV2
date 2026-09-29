-- Fermeture douce POS par le marchand (A.3.5). Orthogonal au tri-état status/statusSource.
-- Revert :
--   DROP INDEX IF EXISTS "Pos_merchantClosedAt_idx";
--   ALTER TABLE "Pos" DROP COLUMN IF EXISTS "merchantClosedAt";

ALTER TABLE "Pos" ADD COLUMN "merchantClosedAt" TIMESTAMP(3);

CREATE INDEX "Pos_merchantClosedAt_idx" ON "Pos"("merchantClosedAt");
