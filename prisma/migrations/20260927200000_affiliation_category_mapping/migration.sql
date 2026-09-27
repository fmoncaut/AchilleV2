-- Décision de réconciliation : une valeur exacte de catégorie externe par réseau.
-- Chaîne vide = catégorie absente. categoryId null = non classé explicite.

CREATE TABLE "AffiliationCategoryMapping" (
    "id" TEXT NOT NULL,
    "network" "AffiliationNetwork" NOT NULL,
    "externalCategoryRaw" TEXT NOT NULL,
    "categoryId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AffiliationCategoryMapping_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "AffiliationCategoryMapping_network_externalCategoryRaw_key"
    ON "AffiliationCategoryMapping"("network", "externalCategoryRaw");
CREATE INDEX "AffiliationCategoryMapping_categoryId_idx"
    ON "AffiliationCategoryMapping"("categoryId");

ALTER TABLE "AffiliationCategoryMapping"
    ADD CONSTRAINT "AffiliationCategoryMapping_categoryId_fkey"
    FOREIGN KEY ("categoryId") REFERENCES "Category"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
