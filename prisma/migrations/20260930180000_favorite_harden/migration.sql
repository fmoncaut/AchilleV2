-- U.3 — Durcissement Favorite : FK Cascade, CHECK XOR, index partiels uniques.

-- 1) Audit / nettoyage avant contraintes
DELETE FROM "Favorite"
WHERE ("productId" IS NULL AND "posId" IS NULL)
   OR ("productId" IS NOT NULL AND "posId" IS NOT NULL);

DELETE FROM "Favorite" f
WHERE f."productId" IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM "Product" p WHERE p.id = f."productId");

DELETE FROM "Favorite" f
WHERE f."posId" IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM "Pos" p WHERE p.id = f."posId");

-- Doublons produit (garde le plus récent)
DELETE FROM "Favorite" f
USING "Favorite" newer
WHERE f."productId" IS NOT NULL
  AND newer."productId" IS NOT NULL
  AND f."userId" = newer."userId"
  AND f."productId" = newer."productId"
  AND f."createdAt" < newer."createdAt";

-- Doublons POS (garde le plus récent)
DELETE FROM "Favorite" f
USING "Favorite" newer
WHERE f."posId" IS NOT NULL
  AND newer."posId" IS NOT NULL
  AND f."userId" = newer."userId"
  AND f."posId" = newer."posId"
  AND f."createdAt" < newer."createdAt";

-- 2) Remplace l'unique faible (NULL distincts) + FK user RESTRICT
DROP INDEX IF EXISTS "Favorite_userId_productId_posId_key";

ALTER TABLE "Favorite" DROP CONSTRAINT IF EXISTS "Favorite_userId_fkey";
ALTER TABLE "Favorite"
  ADD CONSTRAINT "Favorite_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Favorite"
  ADD CONSTRAINT "Favorite_productId_fkey"
  FOREIGN KEY ("productId") REFERENCES "Product"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Favorite"
  ADD CONSTRAINT "Favorite_posId_fkey"
  FOREIGN KEY ("posId") REFERENCES "Pos"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

-- XOR : exactement un des deux
ALTER TABLE "Favorite"
  ADD CONSTRAINT "Favorite_product_xor_pos_check"
  CHECK (("productId" IS NOT NULL) <> ("posId" IS NOT NULL));

CREATE UNIQUE INDEX "Favorite_userId_productId_key"
  ON "Favorite" ("userId", "productId")
  WHERE "productId" IS NOT NULL;

CREATE UNIQUE INDEX "Favorite_userId_posId_key"
  ON "Favorite" ("userId", "posId")
  WHERE "posId" IS NOT NULL;

CREATE INDEX "Favorite_userId_idx" ON "Favorite"("userId");
CREATE INDEX "Favorite_productId_idx" ON "Favorite"("productId");
CREATE INDEX "Favorite_posId_idx" ON "Favorite"("posId");
