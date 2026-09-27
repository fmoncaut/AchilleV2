import type { Prisma } from "@prisma/client";

import { findCategoryMapping } from "@/lib/affiliation-feed/mapping";
import { mapFeedRow } from "@/lib/affiliation-feed/map-row";
import { prisma } from "@/lib/db";
import { discountPercent } from "@/lib/money";
import { findFirstMerchantWithEmail } from "@/lib/notifications/recipients";
import { dispatchNotification } from "@/lib/notifications/send";
import { getSiteUrl } from "@/lib/site";
import { slugify } from "@/lib/slug";

export class AffiliationReviewError extends Error {}

function payloadRecord(payload: Prisma.JsonValue): Record<string, string> | null {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return null;
  }
  const record: Record<string, string> = {};
  for (const [key, value] of Object.entries(payload)) {
    if (typeof value === "string") {
      record[key] = value;
    }
  }
  return record;
}

async function uniqueSlug(name: string, ean: string | null) {
  const root = slugify(name) || "produit";
  const base = (ean ? `${root}-${ean}` : root).slice(0, 80);
  let slug = base;
  let n = 2;
  while (await prisma.product.findFirst({ where: { slug }, select: { id: true } })) {
    slug = `${base.slice(0, 70)}-${n}`;
    n += 1;
  }
  return slug;
}

/** Crée ou rattache le produit, crée l'offre, passe la ligne à READY_TO_PUBLISH. */
export async function publishPendingLine(lineId: string) {
  const line = await prisma.affiliationImportLine.findUnique({
    where: { id: lineId },
    include: {
      feed: {
        include: {
          profile: true,
          merchant: { select: { id: true, name: true } },
        },
      },
    },
  });
  if (!line || line.status !== "PENDING_PRODUCT_CREATION") {
    throw new AffiliationReviewError("Ligne introuvable ou déjà traitée.");
  }
  const payload = payloadRecord(line.payload);
  if (!payload) {
    throw new AffiliationReviewError("La ligne n'a pas de contenu exploitable.");
  }
  const header = Object.keys(payload);
  const mapped = mapFeedRow(
    line.feed.profile,
    header,
    header.map((name) => payload[name] ?? ""),
  );
  if (!mapped.ok) {
    throw new AffiliationReviewError(mapped.detail);
  }
  const row = mapped.row;
  const existing = row.ean
    ? await prisma.product.findUnique({ where: { ean: row.ean }, select: { id: true } })
    : null;
  const productId =
    existing?.id ??
    (
      await prisma.product.create({
        data: {
          ean: row.ean,
          name: row.title,
          slug: await uniqueSlug(row.title, row.ean),
          imageUrl: row.imageUrl,
          images: row.imageUrl ? [row.imageUrl] : [],
          publicPrice: row.priceReference,
          categoryId: null,
          brandId: null,
        },
        select: { id: true },
      })
    ).id;

  const mapping = await findCategoryMapping(
    prisma,
    line.feed.profile.network,
    row.externalCategoryRaw,
  );
  if (mapping?.categoryId) {
    const product = await prisma.product.findUnique({
      where: { id: productId },
      select: { categoryId: true },
    });
    if (product && !product.categoryId) {
      await prisma.product.update({
        where: { id: productId },
        data: { categoryId: mapping.categoryId },
      });
    }
  }
  const priceReference = row.priceReference;
  const offer = await prisma.offer.upsert({
    where: {
      feedId_externalProductKey: {
        feedId: line.feedId,
        externalProductKey: row.externalProductKey,
      },
    },
    create: {
      productId,
      merchantId: line.feed.merchantId,
      feedId: line.feedId,
      externalProductKey: row.externalProductKey,
      kind: "AFFILIATION",
      scope: "ENSEIGNE",
      brokerId: null,
      posId: null,
      priceRemise: row.priceRemise,
      priceReference,
      discountPct: discountPercent(row.priceRemise, priceReference),
      stock: row.stock,
      isOnline: row.isOnline,
      merchantUrl: row.merchantUrl,
      externalCategoryRaw: row.externalCategoryRaw,
      ...(mapping ? { reconciledCategoryId: mapping.categoryId } : {}),
    },
    update: {
      productId,
      priceRemise: row.priceRemise,
      priceReference,
      discountPct: discountPercent(row.priceRemise, priceReference),
      stock: row.stock,
      isOnline: row.isOnline,
      merchantUrl: row.merchantUrl,
      externalCategoryRaw: row.externalCategoryRaw,
      ...(mapping ? { reconciledCategoryId: mapping.categoryId } : {}),
    },
    select: { id: true },
  });
  if (priceReference && !existing) {
    await prisma.product.update({
      where: { id: productId },
      data: { publicPrice: priceReference },
    });
  }
  await prisma.affiliationImportLine.update({
    where: { id: line.id },
    data: {
      status: "READY_TO_PUBLISH",
      productId,
      offerId: offer.id,
    },
  });

  const merchant = await findFirstMerchantWithEmail(line.feed.merchantId);
  if (!merchant?.email) {
    console.info(
      `[affiliation-review] Aucun marchand avec e-mail pour ${line.feed.merchant.name}.`,
    );
    return;
  }
  await dispatchNotification({
    recipient: merchant,
    subject: "Affiliation — un produit est prêt à publier",
    text: `${row.title} est prêt pour ${line.feed.merchant.name}.\n\n${getSiteUrl()}/admin/affiliation/en-attente`,
  });
}
