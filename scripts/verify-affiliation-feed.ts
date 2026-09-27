import { Prisma } from "@prisma/client";

import { importAffiliationFeed } from "../lib/affiliation-feed/import";
import { mapFeedRow } from "../lib/affiliation-feed/map-row";
import { parseFeedCsv } from "../lib/affiliation-feed/parse";
import { prisma } from "../lib/db";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

const quoted = parseFeedCsv('ean;name;price\n"1";"a;b";"3"\n9;8\n4;5;6\n', {
  delimiter: ";",
});
assert(quoted.rows.length === 2, "La ligne quotée et la ligne valide doivent passer.");
assert(quoted.rows[0]?.cells[1] === "a;b", "Le point-virgule dans les guillemets reste dans le champ.");
assert(quoted.rejects.length === 1 && quoted.rejects[0]?.line === 3, "La ligne courte est rejetée.");

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
  emptyCategory.ok && emptyCategory.row.externalCategoryRaw == null && emptyCategory.row.isOnline === false,
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
  filledCategory.ok && filledCategory.row.externalCategoryRaw === ";Fashion;68" && filledCategory.row.isOnline,
  "La valeur categories présente est conservée.",
);

async function main() {
  const tradedoubler = await prisma.affiliationProfile.findUnique({
    where: { network: "TRADEDOUBLER" },
  });
  const affilae = await prisma.affiliationProfile.findUnique({
    where: { network: "AFFILAE" },
  });
  assert(tradedoubler?.stockColumn === "availability", "Tradedoubler doit lire availability.");
  assert(
    tradedoubler.availabilityInTokens.join() === "in stock",
    "Jeton Tradedoubler in stock.",
  );
  assert(
    tradedoubler.categoryColumns.join() === "categories,MerchantCategoryName,TDCategoryName" &&
      tradedoubler.categoryMode === "FALLBACK",
    "La chaîne de catégorie Tradedoubler reste configurée.",
  );
  assert(affilae?.availabilityInTokens.join() === "in stock", "Jeton Affilae in stock.");

  const merchant = await prisma.merchant.create({
    data: { name: "Vérif affiliation", slug: "verif-affiliation-feed" },
  });
  const admin = await prisma.user.create({
    data: { email: "admin-feed@example.com", role: "ADMIN" },
  });
  await prisma.user.create({
    data: { email: "merchant-feed@example.com", role: "MERCHANT", merchantId: merchant.id },
  });
  await prisma.product.create({
    data: { ean: "11111111", name: "Chemise", slug: "verif-chemise" },
  });
  await prisma.product.create({
    data: { ean: "33333333", name: "Jeu", slug: "verif-jeu" },
  });

  const feedTd = await prisma.affiliationFeed.create({
    data: { merchantId: merchant.id, profileId: tradedoubler.id, status: "ACTIVE" },
  });
  const feedAf = await prisma.affiliationFeed.create({
    data: { merchantId: merchant.id, profileId: affilae.id, status: "ACTIVE" },
  });
  const paused = await prisma.affiliationFeed.create({
    data: { merchantId: merchant.id, profileId: tradedoubler.id, status: "PAUSED" },
  });

  let pausedThrew = false;
  try {
    await importAffiliationFeed(paused.id, "ean;name;price\n1;a;1\n");
  } catch (error) {
    pausedThrew = error instanceof Error && error.message === "Ce flux est en pause.";
  }
  assert(pausedThrew, "Un flux en pause ne s'importe pas.");

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
  assert(td.matched === 1 && td.offersOnline === 1, "Une offre Tradedoubler en ligne.");
  assert(td.pendingCreated === 1, "La ligne sans produit est en attente.");
  assert(notices.length === 1 && notices[0]?.includes("1 nouvelle"), "Un seul e-mail, avec le nombre.");

  const offer = await prisma.offer.findFirst({
    where: { feedId: feedTd.id, externalProductKey: "11111111" },
  });
  assert(offer, "Offre Tradedoubler manquante.");
  assert(offer.brokerId == null, "brokerId reste null.");
  assert(offer.merchantUrl === "https://pdt.tradedoubler.com/click?x=1", "Lien de tracking inchangé.");
  assert(offer.isOnline === true && offer.scope === "ENSEIGNE" && offer.posId == null, "Offre enseigne en ligne.");
  assert(offer.externalCategoryRaw == null, "Catégorie Tradedoubler laissée vide.");
  assert(offer.priceReference == null, "Pas de prix barré en règle SINGLE.");
  const lineTd = await prisma.affiliationImportLine.findFirst({
    where: { feedId: feedTd.id, externalProductKey: "22222222" },
  });
  assert(
    lineTd?.status === "PENDING_PRODUCT_CREATION" && lineTd.productId == null && lineTd.offerId == null,
    "Ligne en attente sans offre.",
  );

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
  assert(af.matched === 1 && af.offersOnline === 1, "Le jeu soldé est en ligne.");
  assert(af.pendingCreated === 2, "Livre et preorder sont en attente, pas la ligne sans prix.");
  assert(
    af.rejects.some((reject) => reject.reason === "missing_price"),
    "La ligne sans prix est rejetée.",
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
  assert(jeu.priceRemise.equals(new Prisma.Decimal("34.99")), "Prix soldé prioritaire.");
  assert(jeu.priceReference?.equals(new Prisma.Decimal("44.99")), "Prix public sur l'offre.");
  assert(jeu.product.publicPrice?.equals(new Prisma.Decimal("44.99")), "Prix public sur le produit.");
  assert(jeu.discountPct === 22, "Le badge de remise se calcule.");
  const preorder = await prisma.affiliationImportLine.findFirst({
    where: { feedId: feedAf.id, externalProductKey: "55555555" },
  });
  assert(preorder?.status === "PENDING_PRODUCT_CREATION", "Le preorder n'est pas une offre.");

  notices.length = 0;
  const again = await importAffiliationFeed(
    feedTd.id,
    [
      "ean;name;price;availability;categories;MerchantCategoryName;TDCategoryName;productUrl",
      "11111111;Chemise;18.00;in stock;;;;https://pdt.tradedoubler.com/click?x=1",
      "22222222;Manteau;59.99;out of stock;;;;https://pdt.tradedoubler.com/click?x=2",
    ].join("\n"),
    {
      notify: async (message) => {
        notices.push(message.subject);
      },
    },
  );
  assert(again.pendingCreated === 0 && again.pendingExisting === 1, "Pas de nouvelle ligne en attente.");
  assert(notices.length === 0, "Pas de second e-mail.");
  const updated = await prisma.offer.findFirst({
    where: { id: offer.id },
  });
  assert(updated?.priceRemise.equals(new Prisma.Decimal("18.00")), "Réimport idempotent du prix.");

  const adminHit = await prisma.user.findFirst({
    where: { role: "ADMIN", email: { not: null } },
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
  });
  assert(adminHit?.id === admin.id, "L'e-mail part au premier ADMIN, pas au marchand.");

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
