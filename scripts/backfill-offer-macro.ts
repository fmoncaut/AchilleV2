/**
 * Backfill Offer.macroId via resolveCategoryMacro (U.2.0).
 *
 * Idempotent / rejouable. Après un reclassement admin/seed de Category.macroId
 * (rare), rejouer ce script : pas de propagation live en V1 sur le mapping
 * Category → InterestCategory.
 *
 * Usage :
 *   DATABASE_URL=postgresql://… npx tsx scripts/backfill-offer-macro.ts
 */
import { PrismaClient } from "@prisma/client";

import { computeOfferMacroId } from "../lib/categories/offer-macro";

const BATCH = 500;

async function main() {
  const db = new PrismaClient();
  let processed = 0;
  let unchanged = 0;
  let setNull = 0;
  let updated = 0;
  const byMacro = new Map<string, number>();

  try {
    for (;;) {
      const batch = await db.offer.findMany({
        select: {
          id: true,
          macroId: true,
          reconciledCategoryId: true,
          product: { select: { categoryId: true } },
        },
        orderBy: { id: "asc" },
        skip: processed,
        take: BATCH,
      });
      if (batch.length === 0) break;

      for (const offer of batch) {
        const next = await computeOfferMacroId(db, {
          reconciledCategoryId: offer.reconciledCategoryId,
          productCategoryId: offer.product.categoryId,
        });

        if (next === offer.macroId) {
          unchanged += 1;
        } else {
          await db.offer.update({
            where: { id: offer.id },
            data: { macroId: next },
          });
          updated += 1;
        }

        if (next == null) {
          setNull += 1;
        } else {
          byMacro.set(next, (byMacro.get(next) ?? 0) + 1);
        }
      }

      processed += batch.length;
      console.log(`… ${processed} offres traitées`);
    }

    const macros = await db.interestCategory.findMany({
      where: { id: { in: [...byMacro.keys()] } },
      select: { id: true, code: true, name: true },
    });
    const codeById = new Map(macros.map((m) => [m.id, m.code]));

    const distribution = [...byMacro.entries()]
      .map(([id, count]) => ({
        macroId: id,
        code: codeById.get(id) ?? "?",
        count,
      }))
      .sort((a, b) => b.count - a.count);

    console.log(
      JSON.stringify(
        {
          ok: true,
          offers: processed,
          updated,
          unchanged,
          macroIdNull: setNull,
          distribution,
        },
        null,
        2,
      ),
    );
  } finally {
    await db.$disconnect();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
