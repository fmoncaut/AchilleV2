import { prisma } from "@/lib/db";
import { mapFeedRow } from "@/lib/affiliation-feed/map-row";
import { parseFeedCsv, type FeedReject } from "@/lib/affiliation-feed/parse";
import { discountPercent } from "@/lib/money";
import { dispatchNotification } from "@/lib/notifications/send";
import { findFirstAdminWithEmail } from "@/lib/notifications/recipients";
import type { OutboundNotification } from "@/lib/notifications/types";
import { getSiteUrl } from "@/lib/site";

export class AffiliationImportError extends Error {}

export type AffiliationImportReport = {
  matched: number;
  pendingCreated: number;
  pendingExisting: number;
  offersOnline: number;
  rejects: FeedReject[];
};

type ImportDeps = {
  notify?: (message: OutboundNotification) => Promise<void>;
  findAdmin?: () => Promise<{ userId: string; email: string | null } | null>;
};

/**
 * Importe le CSV d'un flux actif. La config vient du profil en base.
 * brokerId reste null : le lien de tracking est déjà dans le fichier.
 * Un seul e-mail en fin de passage, s'il y a de nouvelles lignes en attente.
 */
export async function importAffiliationFeed(
  feedId: string,
  csvText: string,
  deps: ImportDeps = {},
): Promise<AffiliationImportReport> {
  const notify = deps.notify ?? dispatchNotification;
  const findAdmin = deps.findAdmin ?? findFirstAdminWithEmail;
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
  if (feed.status !== "ACTIVE") {
    throw new AffiliationImportError("Ce flux est en pause.");
  }

  const parsed = parseFeedCsv(csvText, feed.profile);
  const rejects = [...parsed.rejects];
  const report: AffiliationImportReport = {
    matched: 0,
    pendingCreated: 0,
    pendingExisting: 0,
    offersOnline: 0,
    rejects,
  };

  for (const entry of parsed.rows) {
    const mapped = mapFeedRow(feed.profile, parsed.header, entry.cells);
    if (!mapped.ok) {
      rejects.push({ line: entry.line, reason: mapped.reason, detail: mapped.detail });
      continue;
    }
    const row = mapped.row;
    const product = row.ean
      ? await prisma.product.findUnique({
          where: { ean: row.ean },
          select: { id: true },
        })
      : null;

    await prisma.$transaction(async (tx) => {
      let offerId: string | null = null;
      if (product) {
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
              feedId,
              externalProductKey: row.externalProductKey,
            },
          },
          select: { id: true },
        });
        if (existingOffer) {
          await tx.offer.update({ where: { id: existingOffer.id }, data: commercial });
          offerId = existingOffer.id;
        } else {
          const created = await tx.offer.create({
            data: {
              ...commercial,
              productId: product.id,
              merchantId: feed.merchantId,
              feedId,
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
        if (priceReference) {
          await tx.product.update({
            where: { id: product.id },
            data: { publicPrice: priceReference },
          });
        }
      }

      const line = await tx.affiliationImportLine.findUnique({
        where: {
          feedId_externalProductKey: {
            feedId,
            externalProductKey: row.externalProductKey,
          },
        },
        select: { id: true, status: true },
      });
      const status = product ? "MATCHED" : "PENDING_PRODUCT_CREATION";
      if (!line) {
        await tx.affiliationImportLine.create({
          data: {
            feedId,
            externalProductKey: row.externalProductKey,
            externalCategoryRaw: row.externalCategoryRaw,
            status,
            productId: product?.id ?? null,
            offerId,
            payload: row.payload,
          },
        });
        if (product) {
          report.matched += 1;
        } else {
          report.pendingCreated += 1;
        }
      } else if (product) {
        await tx.affiliationImportLine.update({
          where: { id: line.id },
          data: {
            externalCategoryRaw: row.externalCategoryRaw,
            status: "MATCHED",
            productId: product.id,
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
    });

    if (product && row.isOnline) {
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
        text: `${feed.merchant.name} : ${report.pendingCreated} nouvelle(s) ligne(s) en attente de création de produit.\n\n${getSiteUrl()}/admin`,
      });
    }
  }

  return report;
}
