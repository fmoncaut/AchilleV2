-- Awin : prix vendu = search_price, prix barré = rrp_price.
-- Si rrp_price est vide, le mappeur relit product_price_old.
UPDATE "AffiliationProfile"
SET
    "priceAltColumn" = 'rrp_price',
    "priceRule" = 'CURRENT_AND_CROSSED',
    "updatedAt" = CURRENT_TIMESTAMP
WHERE "network" = 'AWIN';
