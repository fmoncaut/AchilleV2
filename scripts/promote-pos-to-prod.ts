/**
 * A.3.6 / A.5.4 — Promotion cross-env de POS staging → prod.
 *
 * Clé stable : Merchant.slug + Pos.placeId (jamais les cuid).
 * Usage :
 *   STAGING_DATABASE_URL=postgresql://…/staging \
 *   PROD_DATABASE_URL=postgresql://…/prod \
 *   npx tsx scripts/promote-pos-to-prod.ts electrodepot [--dry-run]
 *
 * Soft-launch : force statusSource=MANUAL (R3 — visible sans dépendre de l'AUTO / offres).
 * Ne copie jamais Stripe Connect / feeRate / logoUrl POS.
 */
import {
  PrismaClient,
  type PosStatus,
  type PosStatusSource,
} from "@prisma/client";

const EXCLUDED_MERCHANT_SLUGS = new Set([
  "adbb",
  // préfixe e2e-stripe-*
]);

function isExcludedMerchant(slug: string): boolean {
  if (EXCLUDED_MERCHANT_SLUGS.has(slug)) return true;
  if (slug.startsWith("e2e-stripe-")) return true;
  return false;
}

function dbName(url: string): string {
  try {
    return new URL(url).pathname.replace(/^\//, "");
  } catch {
    return "";
  }
}

function assertDistinctUrls(stagingUrl: string, prodUrl: string): void {
  const s = dbName(stagingUrl);
  const p = dbName(prodUrl);
  if (!s || !p) {
    throw new Error("STAGING_DATABASE_URL et PROD_DATABASE_URL sont obligatoires.");
  }
  if (s === p) {
    throw new Error("Refus : staging et prod pointent vers la même base.");
  }
  // Garde-fous connus Clever Akwire
  if (s !== "bwljfjzai3tw8itz8ilf") {
    console.warn(`Attention : base staging inattendue (${s}).`);
  }
  if (p === "bwljfjzai3tw8itz8ilf") {
    throw new Error("Refus : PROD_DATABASE_URL pointe vers la base staging.");
  }
}

type SourcePos = {
  placeId: string;
  name: string;
  status: PosStatus;
  statusSource: PosStatusSource;
};

async function main(): Promise<void> {
  const args = process.argv.slice(2).filter((a) => a !== "--dry-run");
  const dryRun = process.argv.includes("--dry-run");
  const merchantSlug = (args[0] ?? "electrodepot").trim().toLowerCase();

  if (!merchantSlug) {
    console.error(
      "Usage : npx tsx scripts/promote-pos-to-prod.ts <merchant-slug> [--dry-run]",
    );
    process.exit(1);
  }
  if (isExcludedMerchant(merchantSlug)) {
    throw new Error(`Refus : enseigne exclue de la promotion (${merchantSlug}).`);
  }

  const stagingUrl = process.env.STAGING_DATABASE_URL?.trim() ?? "";
  const prodUrl = process.env.PROD_DATABASE_URL?.trim() ?? "";
  assertDistinctUrls(stagingUrl, prodUrl);

  const staging = new PrismaClient({
    datasources: { db: { url: stagingUrl } },
  });
  const prod = new PrismaClient({
    datasources: { db: { url: prodUrl } },
  });

  const now = new Date();
  let promoted = 0;
  let skippedMissing = 0;
  const byStatus = new Map<string, number>();

  try {
    const stagingMerchant = await staging.merchant.findUnique({
      where: { slug: merchantSlug },
      select: { id: true, name: true, slug: true, stripeAccountId: true },
    });
    if (!stagingMerchant) {
      throw new Error(`Enseigne absente en staging : ${merchantSlug}`);
    }
    if (stagingMerchant.stripeAccountId) {
      console.warn(
        `Attention : ${merchantSlug} a un stripeAccountId en staging — il ne sera PAS copié.`,
      );
    }

    const prodMerchant = await prod.merchant.findUnique({
      where: { slug: merchantSlug },
      select: {
        id: true,
        name: true,
        slug: true,
        stripeAccountId: true,
        posPublished: true,
      },
    });
    if (!prodMerchant) {
      throw new Error(`Enseigne absente en prod : ${merchantSlug}`);
    }

    const sourcePos: SourcePos[] = await staging.pos.findMany({
      where: {
        merchantId: stagingMerchant.id,
        placeId: { not: null },
      },
      select: {
        placeId: true,
        name: true,
        status: true,
        statusSource: true,
      },
    }).then((rows) =>
      rows
        .filter((r): r is SourcePos & { placeId: string } => Boolean(r.placeId))
        .map((r) => ({
          placeId: r.placeId!,
          name: r.name,
          status: r.status,
          statusSource: r.statusSource,
        })),
    );

    if (sourcePos.length === 0) {
      throw new Error(`Aucun POS avec placeId pour ${merchantSlug} en staging.`);
    }

    console.log(
      `Source staging : ${stagingMerchant.name} — ${sourcePos.length} POS.`,
    );
    console.log(
      `Cible prod : ${prodMerchant.name}${dryRun ? " (dry-run)" : ""}.`,
    );

    for (const src of sourcePos) {
      // Miroir du statut staging ; statusSource forcé MANUAL (R3 soft-launch).
      const targetStatus = src.status;
      if (
        targetStatus !== "ACTIVE_VISIBLE" &&
        targetStatus !== "INACTIVE_VISIBLE" &&
        targetStatus !== "INACTIVE_HIDDEN"
      ) {
        throw new Error(`Statut inattendu ${targetStatus} pour ${src.placeId}`);
      }

      const target = await prod.pos.findFirst({
        where: {
          merchantId: prodMerchant.id,
          placeId: src.placeId,
        },
        select: { id: true, status: true, statusSource: true },
      });

      if (!target) {
        skippedMissing += 1;
        console.warn(
          `POS prod introuvable (placeId=${src.placeId}, ${src.name}) — skip.`,
        );
        continue;
      }

      const key = `${targetStatus}/MANUAL`;
      byStatus.set(key, (byStatus.get(key) ?? 0) + 1);

      if (dryRun) {
        promoted += 1;
        continue;
      }

      await prod.pos.update({
        where: { id: target.id },
        data: {
          status: targetStatus,
          isActive: targetStatus === "ACTIVE_VISIBLE",
          statusSource: "MANUAL",
          promotedToProdAt: now,
          // jamais : stripe*, feeRate, logoUrl POS
        },
      });

      await staging.pos.updateMany({
        where: {
          merchantId: stagingMerchant.id,
          placeId: src.placeId,
        },
        data: { promotedToProdAt: now },
      });

      promoted += 1;
    }

    if (!dryRun) {
      await prod.merchant.update({
        where: { id: prodMerchant.id },
        data: { posPublished: true },
      });
      // Garde-fou : ne jamais écrire de Stripe sur prod
      const stripeCheck = await prod.merchant.findUnique({
        where: { id: prodMerchant.id },
        select: { stripeAccountId: true },
      });
      if (stripeCheck?.stripeAccountId) {
        throw new Error(
          "Abort : stripeAccountId non null en prod après promotion (ne devrait pas arriver).",
        );
      }
    }

    console.log(`Promus : ${promoted}. Manquants en prod : ${skippedMissing}.`);
    console.log("Par status/source (cible) :");
    for (const [k, n] of [...byStatus.entries()].sort()) {
      console.log(`  ${k} : ${n}`);
    }
    if (!dryRun) {
      console.log(`Merchant prod posPublished=true. Stamp promotedToProdAt=${now.toISOString()} (staging + prod).`);
    }
  } finally {
    await Promise.all([staging.$disconnect(), prod.$disconnect()]);
  }
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(message);
  process.exit(1);
});
