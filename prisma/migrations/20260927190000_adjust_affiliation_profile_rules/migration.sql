-- Tradedoubler : inStock est vide sur les flux observés. La disponibilité est
-- `availability` (« in stock » / « out of stock »).
-- La chaîne de catégorie reste celle d'origine (categories, MerchantCategoryName,
-- TDCategoryName, mode FALLBACK). Une cellule vide est ignorée : si les trois
-- sont vides, externalCategoryRaw est null. Le parseur ne réécrit pas une valeur
-- présente.
-- Affilae : seul « in stock » est disponible immédiatement. preorder et
-- out of stock restent hors ligne.

UPDATE "AffiliationProfile"
SET
    "stockColumn" = 'availability',
    "stockMode" = 'FLAG',
    "availabilityInTokens" = ARRAY['in stock'],
    "updatedAt" = CURRENT_TIMESTAMP
WHERE "network" = 'TRADEDOUBLER';

UPDATE "AffiliationProfile"
SET
    "availabilityInTokens" = ARRAY['in stock'],
    "updatedAt" = CURRENT_TIMESTAMP
WHERE "network" = 'AFFILAE';
