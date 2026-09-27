-- Flux d'affiliation : profils réseau, flux, file de réconciliation produit, clés externes sur Offer.
-- Le CHECK impose feedId et externalProductKey ensemble, ou aucun des deux (offres saisies à la main).

CREATE TYPE "AffiliationNetwork" AS ENUM ('KWANKO', 'TRADEDOUBLER', 'AWIN', 'AFFILAE', 'EFFILIATION', 'MARKETPLACE');
CREATE TYPE "AffiliationFeedStatus" AS ENUM ('ACTIVE', 'PAUSED');
CREATE TYPE "AffiliationImportStatus" AS ENUM ('MATCHED', 'PENDING_PRODUCT_CREATION', 'READY_TO_PUBLISH');
CREATE TYPE "AffiliationPriceRule" AS ENUM ('SINGLE', 'CURRENT_AND_CROSSED', 'SALE_THEN_LIST');
CREATE TYPE "AffiliationStockMode" AS ENUM ('QUANTITY', 'FLAG');
CREATE TYPE "AffiliationCategoryMode" AS ENUM ('SINGLE', 'FALLBACK', 'CONCAT');

CREATE TABLE "AffiliationProfile" (
    "id" TEXT NOT NULL,
    "network" "AffiliationNetwork" NOT NULL,
    "delimiter" TEXT NOT NULL,
    "quoted" BOOLEAN NOT NULL DEFAULT false,
    "productKeyColumns" TEXT[],
    "titleColumn" TEXT,
    "priceColumn" TEXT,
    "priceAltColumn" TEXT,
    "priceRule" "AffiliationPriceRule",
    "imageColumns" TEXT[],
    "brandColumns" TEXT[],
    "trackingLinkColumn" TEXT,
    "stockColumn" TEXT,
    "stockMode" "AffiliationStockMode",
    "availabilityInTokens" TEXT[],
    "categoryColumns" TEXT[],
    "categoryMode" "AffiliationCategoryMode",
    "categoryJoiner" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AffiliationProfile_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "AffiliationProfile_network_key" ON "AffiliationProfile"("network");

CREATE TABLE "AffiliationFeed" (
    "id" TEXT NOT NULL,
    "merchantId" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "sourceUrl" TEXT,
    "status" "AffiliationFeedStatus" NOT NULL DEFAULT 'PAUSED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AffiliationFeed_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "AffiliationFeed_merchantId_idx" ON "AffiliationFeed"("merchantId");
CREATE INDEX "AffiliationFeed_profileId_idx" ON "AffiliationFeed"("profileId");

CREATE TABLE "AffiliationImportLine" (
    "id" TEXT NOT NULL,
    "feedId" TEXT NOT NULL,
    "externalProductKey" TEXT NOT NULL,
    "externalCategoryRaw" TEXT,
    "status" "AffiliationImportStatus" NOT NULL,
    "productId" TEXT,
    "offerId" TEXT,
    "payload" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AffiliationImportLine_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "AffiliationImportLine_feedId_externalProductKey_key" ON "AffiliationImportLine"("feedId", "externalProductKey");
CREATE UNIQUE INDEX "AffiliationImportLine_offerId_key" ON "AffiliationImportLine"("offerId");
CREATE INDEX "AffiliationImportLine_status_idx" ON "AffiliationImportLine"("status");
CREATE INDEX "AffiliationImportLine_productId_idx" ON "AffiliationImportLine"("productId");

ALTER TABLE "Offer" ADD COLUMN "feedId" TEXT;
ALTER TABLE "Offer" ADD COLUMN "externalProductKey" TEXT;
ALTER TABLE "Offer" ADD COLUMN "externalCategoryRaw" TEXT;
ALTER TABLE "Offer" ADD COLUMN "reconciledCategoryId" TEXT;

CREATE UNIQUE INDEX "Offer_feedId_externalProductKey_key" ON "Offer"("feedId", "externalProductKey");
CREATE INDEX "Offer_feedId_idx" ON "Offer"("feedId");
CREATE INDEX "Offer_reconciledCategoryId_idx" ON "Offer"("reconciledCategoryId");

ALTER TABLE "Offer" ADD CONSTRAINT "Offer_feed_key_pair_check"
CHECK (
    ("feedId" IS NULL AND "externalProductKey" IS NULL)
    OR ("feedId" IS NOT NULL AND "externalProductKey" IS NOT NULL)
);

ALTER TABLE "AffiliationFeed" ADD CONSTRAINT "AffiliationFeed_merchantId_fkey"
    FOREIGN KEY ("merchantId") REFERENCES "Merchant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "AffiliationFeed" ADD CONSTRAINT "AffiliationFeed_profileId_fkey"
    FOREIGN KEY ("profileId") REFERENCES "AffiliationProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "AffiliationImportLine" ADD CONSTRAINT "AffiliationImportLine_feedId_fkey"
    FOREIGN KEY ("feedId") REFERENCES "AffiliationFeed"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "AffiliationImportLine" ADD CONSTRAINT "AffiliationImportLine_productId_fkey"
    FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "AffiliationImportLine" ADD CONSTRAINT "AffiliationImportLine_offerId_fkey"
    FOREIGN KEY ("offerId") REFERENCES "Offer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Offer" ADD CONSTRAINT "Offer_feedId_fkey"
    FOREIGN KEY ("feedId") REFERENCES "AffiliationFeed"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Offer" ADD CONSTRAINT "Offer_reconciledCategoryId_fkey"
    FOREIGN KEY ("reconciledCategoryId") REFERENCES "Category"("id") ON DELETE SET NULL ON UPDATE CASCADE;

INSERT INTO "AffiliationProfile" (
    "id",
    "network",
    "delimiter",
    "quoted",
    "productKeyColumns",
    "titleColumn",
    "priceColumn",
    "priceAltColumn",
    "priceRule",
    "imageColumns",
    "brandColumns",
    "trackingLinkColumn",
    "stockColumn",
    "stockMode",
    "availabilityInTokens",
    "categoryColumns",
    "categoryMode",
    "categoryJoiner",
    "updatedAt"
) VALUES
(
    'affprofile_kwanko',
    'KWANKO',
    '|',
    false,
    ARRAY['EAN or ISBN', 'internal reference'],
    'name of the product',
    'current price',
    'crossed price',
    'CURRENT_AND_CROSSED',
    ARRAY['big image'],
    ARRAY['brand'],
    'product page URL',
    'stock indicator',
    'QUANTITY',
    ARRAY[]::TEXT[],
    ARRAY['product category'],
    'SINGLE',
    '>',
    CURRENT_TIMESTAMP
),
(
    'affprofile_tradedoubler',
    'TRADEDOUBLER',
    ';',
    true,
    ARRAY['ean', 'TDProductId', 'sku'],
    'name',
    'price',
    NULL,
    'SINGLE',
    ARRAY['productImage', 'imageUrl'],
    ARRAY['brand', 'manufacturer'],
    'productUrl',
    'inStock',
    'FLAG',
    ARRAY['yes'],
    ARRAY['categories', 'MerchantCategoryName', 'TDCategoryName'],
    'FALLBACK',
    NULL,
    CURRENT_TIMESTAMP
),
(
    'affprofile_awin',
    'AWIN',
    ';',
    false,
    ARRAY['ean', 'product_GTIN', 'aw_product_id'],
    'product_name',
    'search_price',
    NULL,
    'SINGLE',
    ARRAY['merchant_image_url'],
    ARRAY['brand_name'],
    'aw_deep_link',
    'in_stock',
    'FLAG',
    ARRAY['1'],
    ARRAY['merchant_category', 'category_name', 'merchant_product_category_path'],
    'FALLBACK',
    NULL,
    CURRENT_TIMESTAMP
),
(
    'affprofile_affilae',
    'AFFILAE',
    '|',
    false,
    ARRAY['gtin'],
    'title',
    'sale price',
    'price',
    'SALE_THEN_LIST',
    ARRAY['image link'],
    ARRAY['brand'],
    'link',
    'availability',
    'FLAG',
    ARRAY[]::TEXT[],
    ARRAY['google product category'],
    'SINGLE',
    NULL,
    CURRENT_TIMESTAMP
),
(
    'affprofile_effiliation',
    'EFFILIATION',
    ';',
    true,
    ARRAY['gtin', 'id'],
    'title',
    'price',
    'price_norebate',
    'CURRENT_AND_CROSSED',
    ARRAY['image_link', 'additional_image_link'],
    ARRAY['brand'],
    'link',
    'stock',
    'FLAG',
    ARRAY['1'],
    ARRAY['category', 'category_level2', 'category_level3', 'category_level4'],
    'CONCAT',
    ' > ',
    CURRENT_TIMESTAMP
);
