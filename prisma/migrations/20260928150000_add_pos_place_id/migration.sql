-- Clé d'idempotence de l'import POS. Nullable : un POS saisi à la main n'a pas de place_id.
ALTER TABLE "Pos" ADD COLUMN "placeId" TEXT;

-- Plusieurs NULL restent autorisés (PostgreSQL). Les lignes importées ont toujours une valeur.
CREATE UNIQUE INDEX "Pos_merchantId_placeId_key" ON "Pos"("merchantId", "placeId");
