import { Prisma } from "@prisma/client";

import { importAffiliationFeed } from "../lib/affiliation-feed/import";
import { mapFeedRow } from "../lib/affiliation-feed/map-row";
import { saveCategoryMapping } from "../lib/affiliation-feed/mapping";
import { parseFeedCsv } from "../lib/affiliation-feed/parse";
import { publishPendingLine } from "../lib/affiliation-feed/review";
import { prisma } from "../lib/db";
import { findOffersNearby } from "../lib/geo";
import { publicOfferWhere } from "../lib/offer-placement";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

const quoted = parseFeedCsv('ean;name;price\n"1";"a;b";"3"\n9;8\n4;5;6\n', {
  delimiter: ";",
});
assert(
  quoted.rows.length === 2,
  "La ligne quotée et la ligne valide doivent passer.",
);
assert(
  quoted.rows[0]?.cells[1] === "a;b",
  "Le point-virgule dans les guillemets reste dans le champ.",
);
assert(
  quoted.rejects.length === 1 && quoted.rejects[0]?.line === 3,
  "La ligne courte est rejetée.",
);

const inches = parseFeedCsv(
  'gtin;title;price\n"6942147491119";"Tv Uhd 4k 55" Hisense";"379.00"\n"12345678";"Cle Usb Philips "snow" 16 Go";"9.99"\nshort;only\n',
  { delimiter: ";" },
);
assert(
  inches.rows.length === 2,
  "Les guillemets internes ne rejettent pas la ligne.",
);
assert(
  inches.rows[0]?.cells[1] === 'Tv Uhd 4k 55" Hisense',
  "Le pouce reste dans le titre.",
);
assert(
  inches.rows[1]?.cells[1] === 'Cle Usb Philips "snow" 16 Go',
  "Les guillemets autour d'un mot restent dans le titre.",
);
assert(inches.rejects.length === 1, "Une ligne trop courte reste rejetée.");
assert(
  !inches.rejects.some((reject) =>
    reject.detail.includes("Invalid Closing Quote"),
  ),
  "Plus de rejet pour guillemet interne.",
);

const tradedoublerQuotes = parseFeedCsv(
  'ean;name;categories\n"11111111";"Chemise";";Fashion;68"\n',
  { delimiter: ";" },
);
assert(
  tradedoublerQuotes.rows.length === 1 &&
    tradedoublerQuotes.rows[0]?.cells[2] === ";Fashion;68" &&
    tradedoublerQuotes.rejects.length === 0,
  "Le champ categories Tradedoubler reste entier.",
);

const tradedoublerProfile = {
  productKeyColumns: ["ean"],
  titleColumn: "name",
  priceColumn: "price",
  priceAltColumn: null,
  priceRule: "SINGLE" as const,
  trackingLinkColumn: "productUrl",
  stockColumn: "availability",
  stockMode: "FLAG" as const,
  availabilityInTokens: ["in stock"],
  categoryColumns: ["categories", "MerchantCategoryName", "TDCategoryName"],
  categoryMode: "FALLBACK" as const,
  categoryJoiner: null,
};
const tradedoublerHeader = [
  "ean",
  "name",
  "price",
  "availability",
  "categories",
  "MerchantCategoryName",
  "TDCategoryName",
  "productUrl",
];
const emptyCategory = mapFeedRow(tradedoublerProfile, tradedoublerHeader, [
  "11111111",
  "Chemise",
  "19.99",
  "out of stock",
  "",
  "",
  "",
  "https://pdt.example/1",
]);
assert(
  emptyCategory.ok &&
    emptyCategory.row.externalCategoryRaw == null &&
    emptyCategory.row.isOnline === false,
  "Catégorie vide et hors stock.",
);
const filledCategory = mapFeedRow(tradedoublerProfile, tradedoublerHeader, [
  "11111111",
  "Chemise",
  "19.99",
  "in stock",
  ";Fashion;68",
  "",
  "",
  "https://pdt.example/1",
]);
assert(
  filledCategory.ok &&
    filledCategory.row.externalCategoryRaw === ";Fashion;68" &&
    filledCategory.row.isOnline,
  "La valeur categories présente est conservée.",
);

const awinProfile = {
  productKeyColumns: ["ean"],
  titleColumn: "product_name",
  priceColumn: "search_price",
  priceAltColumn: "rrp_price",
  priceRule: "CURRENT_AND_CROSSED" as const,
  trackingLinkColumn: "aw_deep_link",
  stockColumn: "in_stock",
  stockMode: "FLAG" as const,
  availabilityInTokens: ["1"],
  categoryColumns: ["merchant_category"],
  categoryMode: "SINGLE" as const,
  categoryJoiner: null,
};
const awinHeader = [
  "ean",
  "product_name",
  "search_price",
  "rrp_price",
  "product_price_old",
  "in_stock",
  "aw_deep_link",
];
const fromRrp = mapFeedRow(awinProfile, awinHeader, [
  "12345678",
  "Manteau",
  "80.00",
  "120.00",
  "",
  "1",
  "https://www.awin1.com/p/1",
]);
assert(
  fromRrp.ok &&
    fromRrp.row.priceRemise.equals(new Prisma.Decimal("80.00")) &&
    fromRrp.row.priceReference?.equals(new Prisma.Decimal("120.00")),
  "Awin lit rrp_price comme prix barré.",
);
const fromOld = mapFeedRow(awinProfile, awinHeader, [
  "12345678",
  "Manteau",
  "80.00",
  "",
  "100.00",
  "1",
  "https://www.awin1.com/p/1",
]);
assert(
  fromOld.ok &&
    fromOld.row.priceReference?.equals(new Prisma.Decimal("100.00")),
  "Awin retombe sur product_price_old si rrp_price est vide.",
);
const awinFullPrice = mapFeedRow(awinProfile, awinHeader, [
  "12345678",
  "Manteau",
  "80.00",
  "",
  "",
  "1",
  "https://www.awin1.com/p/1",
]);
assert(
  awinFullPrice.ok && awinFullPrice.row.priceReference == null,
  "Awin sans prix barré reste sans référence.",
);

async function main() {
  const tradedoubler = await prisma.affiliationProfile.findUnique({
    where: { network: "TRADEDOUBLER" },
  });
  const affilae = await prisma.affiliationProfile.findUnique({
    where: { network: "AFFILAE" },
  });
  assert(
    tradedoubler?.stockColumn === "availability",
    "Tradedoubler doit lire availability.",
  );
  assert(
    tradedoubler.availabilityInTokens.join() === "in stock",
    "Jeton Tradedoubler in stock.",
  );
  assert(
    tradedoubler.categoryColumns.join() ===
      "categories,MerchantCategoryName,TDCategoryName" &&
      tradedoubler.categoryMode === "FALLBACK",
    "La chaîne de catégorie Tradedoubler reste configurée.",
  );
  assert(
    affilae?.availabilityInTokens.join() === "in stock",
    "Jeton Affilae in stock.",
  );
  const awin = await prisma.affiliationProfile.findUnique({
    where: { network: "AWIN" },
  });
  assert(
    awin?.priceAltColumn === "rrp_price" &&
      awin.priceRule === "CURRENT_AND_CROSSED",
    "Awin mappe rrp_price en prix barré.",
  );

  const merchant = await prisma.merchant.create({
    data: { name: "Vérif affiliation", slug: "verif-affiliation-feed" },
  });
  const admin = await prisma.user.create({
    data: { email: "admin-feed@example.com", role: "ADMIN" },
  });
  await prisma.user.create({
    data: {
      email: "merchant-feed@example.com",
      role: "MERCHANT",
      merchantId: merchant.id,
    },
  });
  await prisma.product.create({
    data: { ean: "11111111", name: "Chemise", slug: "verif-chemise" },
  });
  await prisma.product.create({
    data: { ean: "33333333", name: "Jeu", slug: "verif-jeu" },
  });

  const feedTd = await prisma.affiliationFeed.create({
    data: {
      merchantId: merchant.id,
      profileId: tradedoubler.id,
      status: "ACTIVE",
    },
  });
  const feedAf = await prisma.affiliationFeed.create({
    data: { merchantId: merchant.id, profileId: affilae.id, status: "ACTIVE" },
  });
  const paused = await prisma.affiliationFeed.create({
    data: { merchantId: merchant.id, profileId: affilae.id, status: "PAUSED" },
  });

  const pausedReport = await importAffiliationFeed(
    paused.id,
    [
      "gtin|title|sale price|price|availability|link|google product category",
      "11111111|Chemise|19.99|29.99|in stock|https://www.cultura.com/p/chemise|Mode",
    ].join("\n"),
    { notify: async () => undefined },
  );
  assert(pausedReport.matched === 1, "Un flux en pause s'importe.");
  assert(
    pausedReport.exclusions.length === 0,
    "Une vraie promo n'est pas exclue.",
  );
  const pausedOffer = await prisma.offer.findFirst({
    where: { feedId: paused.id, externalProductKey: "11111111" },
  });
  assert(pausedOffer?.isOnline === true, "Le stock met l'offre en ligne.");
  const pausedPublic = await prisma.offer.count({
    where: { id: pausedOffer?.id, ...publicOfferWhere },
  });
  assert(pausedPublic === 0, "Un flux en pause n'est pas public.");

  const notices: string[] = [];
  const td = await importAffiliationFeed(
    feedTd.id,
    [
      "ean;name;price;availability;categories;MerchantCategoryName;TDCategoryName;productUrl",
      "11111111;Chemise;19.99;in stock;;;;https://pdt.tradedoubler.com/click?x=1",
      "22222222;Manteau;59.99;out of stock;;;;https://pdt.tradedoubler.com/click?x=2",
    ].join("\n"),
    {
      notify: async (message) => {
        notices.push(message.text);
      },
    },
  );
  assert(
    td.matched === 0 && td.offersOnline === 0 && td.pendingCreated === 0,
    "Tradedoubler sans prix barré ne crée pas d'offre.",
  );
  assert(
    td.exclusions.length === 2 &&
      td.exclusions.every((item) => item.reason === "no_discount"),
    "Les lignes Tradedoubler sont exclues, pas rejetées.",
  );
  assert(
    td.rejects.length === 0,
    "L'absence de promo n'est pas un rejet de parsing.",
  );
  assert(notices.length === 0, "Pas d'e-mail sans ligne en attente.");
  const offerTd = await prisma.offer.findFirst({
    where: { feedId: feedTd.id },
  });
  assert(offerTd == null, "Aucune offre Tradedoubler.");

  const af = await importAffiliationFeed(
    feedAf.id,
    [
      "gtin|title|sale price|price|availability|link|google product category",
      "33333333|Jeu|34.99|44.99|in stock|https://www.cultura.com/p/jeu|Jeux",
      "44444444|Livre||19.99|out of stock|https://www.cultura.com/p/livre|Livres",
      "55555555|Pre||29.99|preorder|https://www.cultura.com/p/pre|Jeux",
      "66666666|Vide|||in stock|https://www.cultura.com/p/vide|Jeux",
    ].join("\n"),
    { notify: async () => undefined },
  );
  assert(
    af.matched === 1 && af.offersOnline === 1,
    "Le jeu soldé est en ligne.",
  );
  assert(af.pendingCreated === 0, "Sans promo, pas de ligne en attente.");
  assert(
    af.exclusions.filter((item) => item.reason === "no_discount").length === 2,
    "Livre et preorder sont exclus, pas rejetés.",
  );
  assert(
    af.rejects.some((reject) => reject.reason === "missing_price") &&
      !af.rejects.some((reject) => reject.reason === "no_discount"),
    "La ligne sans prix est rejetée, le filtre promo reste à part.",
  );
  const absent = await prisma.affiliationImportLine.findFirst({
    where: { feedId: feedAf.id, externalProductKey: "66666666" },
  });
  assert(absent == null, "Pas de ligne d'import sans prix.");
  const jeu = await prisma.offer.findFirst({
    where: { feedId: feedAf.id, externalProductKey: "33333333" },
    include: { product: true },
  });
  assert(jeu, "Offre Affilae manquante.");
  assert(
    jeu.priceRemise.equals(new Prisma.Decimal("34.99")),
    "Prix soldé prioritaire.",
  );
  assert(
    jeu.priceReference?.equals(new Prisma.Decimal("44.99")),
    "Prix public sur l'offre.",
  );
  assert(
    jeu.product.publicPrice?.equals(new Prisma.Decimal("44.99")),
    "Prix public sur le produit.",
  );
  assert(jeu.discountPct === 22, "Le badge de remise se calcule.");
  const preorder = await prisma.affiliationImportLine.findFirst({
    where: { feedId: feedAf.id, externalProductKey: "55555555" },
  });
  assert(preorder == null, "Le preorder sans promo n'est pas conservé.");
  const livreLine = await prisma.affiliationImportLine.findFirst({
    where: { feedId: feedAf.id, externalProductKey: "44444444" },
  });
  assert(livreLine == null, "Le livre au prix catalogue n'est pas une offre.");

  notices.length = 0;
  const pending = await importAffiliationFeed(
    feedAf.id,
    [
      "gtin|title|sale price|price|availability|link|google product category",
      "99999999|Nouveau|10.00|20.00|in stock|https://www.cultura.com/p/nouveau|Jeux",
    ].join("\n"),
    {
      notify: async (message) => {
        notices.push(message.text);
      },
    },
  );
  assert(
    pending.pendingCreated === 1 && pending.offersOnline === 0,
    "EAN inconnu en promo : revue, pas d'offre.",
  );
  assert(
    notices.length === 1 && notices[0]?.includes("1 nouvelle"),
    "Un seul e-mail, avec le nombre.",
  );
  notices.length = 0;
  const again = await importAffiliationFeed(
    feedAf.id,
    [
      "gtin|title|sale price|price|availability|link|google product category",
      "33333333|Jeu|30.00|44.99|in stock|https://www.cultura.com/p/jeu|Jeux",
      "99999999|Nouveau|10.00|20.00|in stock|https://www.cultura.com/p/nouveau|Jeux",
    ].join("\n"),
    {
      notify: async (message) => {
        notices.push(message.subject);
      },
    },
  );
  assert(
    again.pendingCreated === 0 && again.pendingExisting === 1,
    "Pas de nouvelle ligne en attente.",
  );
  assert(notices.length === 0, "Pas de second e-mail.");
  const updated = await prisma.offer.findFirst({
    where: { feedId: feedAf.id, externalProductKey: "33333333" },
  });
  assert(
    updated?.priceRemise.equals(new Prisma.Decimal("30.00")),
    "Réimport idempotent du prix.",
  );
  assert(updated?.brokerId == null, "brokerId reste null.");

  const adminHit = await prisma.user.findFirst({
    where: { role: "ADMIN", email: { not: null } },
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
  });
  assert(
    adminHit?.id === admin.id,
    "L'e-mail part au premier ADMIN, pas au marchand.",
  );

  const mode = await prisma.category.create({
    data: { name: "Mode vérif", slug: "mode-verif" },
  });
  const autre = await prisma.category.create({
    data: { name: "Autre vérif", slug: "autre-verif" },
  });
  const mapped = await saveCategoryMapping("AFFILAE", "Robes", mode.id);
  assert(mapped.offers === 0, "Aucune offre n'a encore cette catégorie.");
  const withCategory = await importAffiliationFeed(
    feedAf.id,
    [
      "gtin|title|sale price|price|availability|link|google product category",
      "88888888|Robe|25.00|40.00|in stock|https://www.cultura.com/p/robe|Robes",
    ].join("\n"),
    { notify: async () => undefined },
  );
  assert(withCategory.pendingCreated === 1, "L'EAN inconnu reste en revue.");
  const robeLine = await prisma.affiliationImportLine.findFirst({
    where: { feedId: feedAf.id, externalProductKey: "88888888" },
  });
  assert(
    robeLine?.status === "PENDING_PRODUCT_CREATION",
    "Pas d'offre sans produit.",
  );
  assert(robeLine, "Ligne robe manquante.");
  await publishPendingLine(robeLine.id);
  const robe = await prisma.offer.findFirst({
    where: { feedId: feedAf.id, externalProductKey: "88888888" },
    include: { product: true },
  });
  assert(
    robe?.reconciledCategoryId === mode.id,
    "La revue applique le mapping.",
  );
  assert(
    robe?.product.categoryId === mode.id,
    "La catégorie est recopiée sur le produit.",
  );
  assert(robe?.product.name === "Robe", "Le titre vient du fichier.");

  await prisma.product.update({
    where: { ean: "33333333" },
    data: { categoryId: autre.id },
  });
  await saveCategoryMapping("AFFILAE", "Jeux soldes", mode.id);
  const conflict = await importAffiliationFeed(
    feedAf.id,
    [
      "gtin|title|sale price|price|availability|link|google product category",
      "33333333|Jeu|30.00|44.99|in stock|https://www.cultura.com/p/jeu|Jeux soldes",
    ].join("\n"),
    { notify: async () => undefined },
  );
  assert(
    conflict.categoryConflicts === 1,
    "Un produit déjà classé n'est pas écrasé.",
  );
  const kept = await prisma.product.findUnique({ where: { ean: "33333333" } });
  assert(kept?.categoryId === autre.id, "La catégorie existante reste.");
  const jeuOffer = await prisma.offer.findFirst({
    where: { feedId: feedAf.id, externalProductKey: "33333333" },
  });
  assert(
    jeuOffer?.reconciledCategoryId === mode.id,
    "L'offre reçoit quand même le mapping.",
  );

  const bootstrap = await importAffiliationFeed(
    paused.id,
    [
      "gtin|title|sale price|price|availability|link|google product category",
      "77777777|Pantalon|30.00|40.00|in stock|https://www.cultura.com/p/pantalon|Mode",
      "SKU-1|Sans ean|12.00|20.00|in stock|https://www.cultura.com/p/sku|Mode",
    ].join("\n"),
    { notify: async () => undefined, mode: "bootstrap" },
  );
  assert(bootstrap.matched === 1, "L'amorçage crée le produit à EAN valide.");
  assert(
    bootstrap.rejects.some((reject) => reject.reason === "invalid_ean"),
    "L'amorçage rejette la clé qui n'est pas un EAN.",
  );
  const skuLine = await prisma.affiliationImportLine.findFirst({
    where: { externalProductKey: "SKU-1" },
  });
  assert(skuLine == null, "Pas de ligne pour une clé sans EAN.");
  const pantalon = await prisma.product.findUnique({
    where: { ean: "77777777" },
  });
  assert(
    pantalon?.name === "Pantalon" && pantalon.categoryId == null,
    "Produit amorcé sans catégorie.",
  );
  const pantalonPublic = await prisma.offer.count({
    where: {
      feedId: paused.id,
      externalProductKey: "77777777",
      ...publicOfferWhere,
    },
  });
  assert(
    pantalonPublic === 0,
    "L'amorçage sur un flux en pause reste invisible.",
  );

  const pos = await prisma.pos.create({
    data: {
      merchantId: merchant.id,
      name: "Magasin vérif",
      slug: "verif-magasin-feed",
      lat: 45.75,
      lng: 4.85,
    },
  });
  const manualProduct = await prisma.product.create({
    data: { name: "Marteau", slug: "verif-marteau" },
  });
  const manual = await prisma.offer.create({
    data: {
      productId: manualProduct.id,
      posId: pos.id,
      merchantId: merchant.id,
      kind: "DIRECT",
      priceRemise: new Prisma.Decimal("10.00"),
      stock: 3,
      isOnline: true,
    },
  });
  assert(manual.feedId == null, "L'offre saisie à la main n'a pas de flux.");
  const nearby = await findOffersNearby(45.75, 4.85, 5_000);
  const nearbyIds = new Set(nearby.map((offer) => offer.id));
  assert(
    nearbyIds.has(manual.id),
    "Une offre sans flux, en ligne, reste dans la recherche.",
  );
  assert(
    pausedOffer && !nearbyIds.has(pausedOffer.id),
    "Une offre de flux en pause sort de la recherche.",
  );
  const manualPublic = await prisma.offer.count({
    where: { id: manual.id, ...publicOfferWhere },
  });
  assert(
    manualPublic === 1,
    "Une offre sans flux reste dans le catalogue public.",
  );

  const withdrawn = await importAffiliationFeed(
    feedAf.id,
    [
      "gtin|title|sale price|price|availability|link|google product category",
      "33333333|Jeu|44.99|44.99|in stock|https://www.cultura.com/p/jeu|Jeux",
    ].join("\n"),
    { notify: async () => undefined },
  );
  assert(
    withdrawn.exclusions.length === 1 && withdrawn.offersWithdrawn === 1,
    "Une offre devenue sans promo est retirée.",
  );
  assert(
    !withdrawn.rejects.some((reject) => reject.reason === "no_discount"),
    "no_discount n'est pas un rejet.",
  );
  const gone = await prisma.offer.findFirst({
    where: { feedId: feedAf.id, externalProductKey: "33333333" },
  });
  assert(gone == null, "L'offre sans promo n'est plus en base.");
  const stillThere = await importAffiliationFeed(
    feedAf.id,
    [
      "gtin|title|sale price|price|availability|link|google product category",
      "33333333|Jeu|44.99|44.99|in stock|https://www.cultura.com/p/jeu|Jeux",
    ].join("\n"),
    { notify: async () => undefined },
  );
  assert(
    stillThere.exclusions.length === 1 && stillThere.offersWithdrawn === 0,
    "Second passage : exclue, plus rien à retirer.",
  );

  console.log("verify-affiliation-feed ok");
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
