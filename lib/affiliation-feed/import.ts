import type { Prisma } from "@prisma/client";

import { findCategoryMapping } from "@/lib/affiliation-feed/mapping";
import { mapFeedRow, type NormalizedFeedRow } from "@/lib/affiliation-feed/map-row";
import { parseFeedCsv, type FeedReject } from "@/lib/affiliation-feed/parse";
import { prisma } from "@/lib/db";
import { discountPercent } from "@/lib/money";
import { findFirstAdminWithEmail } from "@/lib/notifications/recipients";
import { dispatchNotification } from "@/lib/notifications/send";
import type { OutboundNotification } from "@/lib/notifications/types";
import { getSiteUrl } from "@/lib/site";
import { slugify } from "@/lib/slug";

export class AffiliationImportError extends Error {}

export type AffiliationImportMode = "normal" | "bootstrap";

export type AffiliationImportReport = {
  matched: number;
  pendingCreated: number;
  pendingExisting: number;
  offersOnline: number;
  categoryConflicts: number;
  rejects: FeedReject[];
};

type ImportDeps = {
  notify?: (message: OutboundNotification) => Promise<void>;
  findAdmin?: () => Promise<{ userId: string; email: string | null } | null>;
  mode?: AffiliationImportMode;
};

type FeedContext = {
  id: string;
  merchantId: string;
  profile: { network: Prisma.AffiliationProfileGetPayload<object>["network"] };
};

/**
 * Importe le CSV d'un flux, en pause ou actif. La visibilité publique dépend
 * du statut du flux, pas de cet import. brokerId reste null.
 * mode bootstrap : crée le produit si l'EAN est valide et inconnu, et rejette
 * le résiduel sans EAN. Le défaut reste la revue.
 * Un seul e-mail en fin de passage, s'il y a de nouvelles lignes en attente.
 */
export async function importAffiliationFeed(
  feedId: string,
  csvText: string,
  deps: ImportDeps = {},
): Promise<AffiliationImportReport> {
  const notify = deps.notify ?? dispatchNotification;
  const findAdmin = deps.findAdmin ?? findFirstAdminWithEmail;
  const mode = deps.mode ?? "normal";
  const feed = await prisma.affiliationFeed.findUnique({
    where: { id: feedId },
    include: {
      profile: true,
      merchant: { select: { id: true, name: true } },
    },
  });
  if (!feed) {
    throw new AffiliationImportError("Flux introuvable.");
  }

  const parsed = parseFeedCsv(csvText, feed.profile);
  const rejects = [...parsed.rejects];
  const report: AffiliationImportReport = {
    matched: 0,
    pendingCreated: 0,
    pendingExisting: 0,
    offersOnline: 0,
    categoryConflicts: 0,
    rejects,
  };

  for (const entry of parsed.rows) {
    const mapped = mapFeedRow(feed.profile, parsed.header, entry.cells);
    if (!mapped.ok) {
      rejects.push({ line: entry.line, reason: mapped.reason, detail: mapped.detail });
      continue;
    }
    const row = mapped.row;
    if (mode === "bootstrap" && !row.ean) {
      rejects.push({
        line: entry.line,
        reason: "invalid_ean",
        detail: "Amorçage : clé sans EAN valide, ligne non conservée",
      });
      continue;
    }

    const known = row.ean
      ? await prisma.product.findUnique({
          where: { ean: row.ean },
          select: { id: true },
        })
      : null;

    const outcome = await prisma.$transaction((tx) =>
      persistFeedRow(tx, feed, row, known?.id ?? null, mode, report),
    );
    if (outcome.online) {
      report.offersOnline += 1;
    }
  }

  for (const reject of rejects) {
    console.warn(
      `[affiliation-import] ligne ${reject.line} rejetée (${reject.reason}) : ${reject.detail}`,
    );
  }

  if (report.pendingCreated > 0) {
    const admin = await findAdmin();
    if (!admin?.email) {
      console.info(
        `[affiliation-import] Aucun administrateur avec e-mail. ${report.pendingCreated} lignes en attente.`,
      );
    } else {
      await notify({
        recipient: { userId: admin.userId, email: admin.email },
        subject: `Affiliation — ${report.pendingCreated} produit(s) à créer`,
        text: `${feed.merchant.name} : ${report.pendingCreated} nouvelle(s) ligne(s) en attente de création de produit.\n\n${getSiteUrl()}/admin/affiliation/produits`,
      });
    }
  }

  return report;
}

async function uniqueSlug(tx: Prisma.TransactionClient, name: string, ean: string | null) {
  const root = slugify(name) || "produit";
  const base = ean ? `${root}-${ean}` : root;
  let slug = base.slice(0, 80);
  let n = 2;
  while (await tx.product.findFirst({ where: { slug }, select: { id: true } })) {
    slug = `${base.slice(0, 70)}-${n}`;
    n += 1;
  }
  return slug;
}

async function persistFeedRow(
  tx: Prisma.TransactionClient,
  feed: FeedContext & { merchantId: string },
  row: NormalizedFeedRow,
  knownProductId: string | null,
  mode: AffiliationImportMode,
  report: AffiliationImportReport,
): Promise<{ online: boolean }> {
  let productId = knownProductId;
  if (!productId && mode === "bootstrap" && row.ean) {
    const created = await tx.product.create({
      data: {
        ean: row.ean,
        name: row.title,
        slug: await uniqueSlug(tx, row.title, row.ean),
        imageUrl: row.imageUrl,
        images: row.imageUrl ? [row.imageUrl] : [],
        publicPrice: row.priceReference,
        categoryId: null,
        brandId: null,
      },
      select: { id: true },
    });
    productId = created.id;
  }

  let offerId: string | null = null;
  if (productId) {
    offerId = await upsertFeedOffer(tx, feed, row, productId, report);
    if (row.priceReference) {
      await tx.product.update({
        where: { id: productId },
        data: { publicPrice: row.priceReference },
      });
    }
  }

  const line = await tx.affiliationImportLine.findUnique({
    where: {
      feedId_externalProductKey: {
        feedId: feed.id,
        externalProductKey: row.externalProductKey,
      },
    },
    select: { id: true, status: true },
  });
  const status = productId ? "MATCHED" : "PENDING_PRODUCT_CREATION";
  if (!line) {
    await tx.affiliationImportLine.create({
      data: {
        feedId: feed.id,
        externalProductKey: row.externalProductKey,
        externalCategoryRaw: row.externalCategoryRaw,
        status,
        productId,
        offerId,
        payload: row.payload,
      },
    });
    if (productId) {
      report.matched += 1;
    } else {
      report.pendingCreated += 1;
    }
  } else if (productId) {
    await tx.affiliationImportLine.update({
      where: { id: line.id },
      data: {
        externalCategoryRaw: row.externalCategoryRaw,
        status: "MATCHED",
        productId,
        offerId,
        payload: row.payload,
      },
    });
    report.matched += 1;
  } else {
    await tx.affiliationImportLine.update({
      where: { id: line.id },
      data: {
        externalCategoryRaw: row.externalCategoryRaw,
        payload: row.payload,
        ...(line.status === "MATCHED" ? {} : { status: "PENDING_PRODUCT_CREATION" }),
      },
    });
    if (line.status === "PENDING_PRODUCT_CREATION") {
      report.pendingExisting += 1;
    }
  }

  return { online: Boolean(productId && row.isOnline) };
}

async function upsertFeedOffer(
  tx: Prisma.TransactionClient,
  feed: FeedContext,
  row: NormalizedFeedRow,
  productId: string,
  report: AffiliationImportReport,
) {
  const priceReference = row.priceReference;
  const commercial = {
    priceRemise: row.priceRemise,
    priceReference,
    discountPct: discountPercent(row.priceRemise, priceReference),
    stock: row.stock,
    isOnline: row.isOnline,
    merchantUrl: row.merchantUrl,
    externalCategoryRaw: row.externalCategoryRaw,
  };
  const existingOffer = await tx.offer.findUnique({
    where: {
      feedId_externalProductKey: {
        feedId: feed.id,
        externalProductKey: row.externalProductKey,
      },
    },
    select: { id: true, externalCategoryRaw: true },
  });
  const rawChanged = existingOffer
    ? existingOffer.externalCategoryRaw !== row.externalCategoryRaw
    : true;
  const mapping = rawChanged
    ? await findCategoryMapping(tx, feed.profile.network, row.externalCategoryRaw)
    : null;
  const reconciled = mapping ? { reconciledCategoryId: mapping.categoryId } : {};

  let offerId: string;
  if (existingOffer) {
    await tx.offer.update({
      where: { id: existingOffer.id },
      data: { ...commercial, ...reconciled },
    });
    offerId = existingOffer.id;
  } else {
    const created = await tx.offer.create({
      data: {
        ...commercial,
        ...reconciled,
        productId,
        merchantId: feed.merchantId,
        feedId: feed.id,
        externalProductKey: row.externalProductKey,
        kind: "AFFILIATION",
        scope: "ENSEIGNE",
        brokerId: null,
        posId: null,
      },
      select: { id: true },
    });
    offerId = created.id;
  }

  if (mapping?.categoryId) {
    const product = await tx.product.findUnique({
      where: { id: productId },
      select: { categoryId: true },
    });
    if (product && !product.categoryId) {
      await tx.product.update({
        where: { id: productId },
        data: { categoryId: mapping.categoryId },
      });
    } else if (product?.categoryId && product.categoryId !== mapping.categoryId) {
      report.categoryConflicts += 1;
    }
  }

  return offerId;
}
