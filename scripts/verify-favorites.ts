/**
 * U.3 — Favorite durci : XOR, unicité, cascade, toggle, anon.
 * Refuse staging / base « achille ».
 *
 * Usage :
 *   FAVORITE_DATABASE=achille_favorite_jetable \
 *   DATABASE_URL=postgresql://…/achille_favorite_jetable \
 *   npx tsx scripts/verify-favorites.ts
 */
import { Prisma, PrismaClient } from "@prisma/client";

import {
  getFavoriteProductIdsIn,
  toggleFavorite,
} from "../lib/favorites";

const STAGING = "bwljfjzai3tw8itz8ilf";
const LOCAL = "achille";

function databaseName(): string {
  try {
    return new URL(process.env.DATABASE_URL ?? "").pathname.replace(/^\//, "");
  } catch {
    return "";
  }
}

function assertDisposable(): void {
  const name = databaseName();
  const allowed = process.env.FAVORITE_DATABASE ?? "";
  if (!allowed || name !== allowed || name === LOCAL || name === STAGING) {
    throw new Error("Refus : ce test n'écrit pas hors d'une base jetable.");
  }
}

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

async function main() {
  assertDisposable();
  const db = new PrismaClient();
  const stamp = Date.now().toString(36);

  try {
    const merchant = await db.merchant.create({
      data: { name: `Fav ${stamp}`, slug: `fav-${stamp}` },
    });
    const pos = await db.pos.create({
      data: {
        merchantId: merchant.id,
        name: "Mag favori",
        slug: `fav-pos-${stamp}`,
        city: "Lyon",
        lat: 45.75,
        lng: 4.85,
        status: "ACTIVE_VISIBLE",
        placeId: `fav-${stamp}`,
      },
    });
    const product = await db.product.create({
      data: {
        name: `Prod favori ${stamp}`,
        slug: `fav-prod-${stamp}`,
        ean: `1${stamp}`.padEnd(13, "0").slice(0, 13),
      },
    });
    const product2 = await db.product.create({
      data: {
        name: `Prod 2 ${stamp}`,
        slug: `fav-prod2-${stamp}`,
        ean: `2${stamp}`.padEnd(13, "0").slice(0, 13),
      },
    });
    const user = await db.user.create({
      data: { email: `fav-${stamp}@example.com` },
    });

    // Toggle add / remove / idempotent remove
    const a1 = await toggleFavorite(user.id, "product", product.id);
    assert(a1.favorited, "add produit");
    const a2 = await toggleFavorite(user.id, "product", product.id);
    assert(!a2.favorited, "remove produit");
    const a3 = await toggleFavorite(user.id, "product", product.id);
    assert(a3.favorited, "re-add");

    const p1 = await toggleFavorite(user.id, "pos", pos.id);
    assert(p1.favorited, "add pos");
    const p2 = await toggleFavorite(user.id, "pos", pos.id);
    assert(!p2.favorited, "remove pos");
    await toggleFavorite(user.id, "pos", pos.id);

    // Unicité
    let dupOk = false;
    try {
      await db.favorite.create({
        data: { userId: user.id, productId: product.id, posId: null },
      });
    } catch (error) {
      dupOk =
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002";
    }
    assert(dupOk, "unicité product");

    // XOR : les deux
    let xorBoth = false;
    try {
      await db.$executeRaw`
        INSERT INTO "Favorite" (id, "userId", "productId", "posId", "createdAt")
        VALUES (${`xor-both-${stamp}`}, ${user.id}, ${product2.id}, ${pos.id}, NOW())
      `;
    } catch {
      xorBoth = true;
    }
    assert(xorBoth, "CHECK XOR refuse les deux");

    // XOR : aucun
    let xorNone = false;
    try {
      await db.$executeRaw`
        INSERT INTO "Favorite" (id, "userId", "productId", "posId", "createdAt")
        VALUES (${`xor-none-${stamp}`}, ${user.id}, NULL, NULL, NOW())
      `;
    } catch {
      xorNone = true;
    }
    assert(xorNone, "CHECK XOR refuse aucun");

    // Flags scopés IN
    await toggleFavorite(user.id, "product", product2.id);
    const scoped = await getFavoriteProductIdsIn(user.id, [
      product.id,
      product2.id,
      "cmnonexistent000000000000",
    ]);
    assert(scoped.has(product.id) && scoped.has(product2.id), "IN scopé");
    assert(scoped.size === 2, "pas d'id fantôme");

    // Cascade product
    await db.product.delete({ where: { id: product.id } });
    const afterProduct = await db.favorite.count({
      where: { userId: user.id, productId: product.id },
    });
    assert(afterProduct === 0, "cascade delete product");

    // Cascade pos
    const posFavBefore = await db.favorite.count({
      where: { userId: user.id, posId: pos.id },
    });
    assert(posFavBefore === 1, "pos favori présent");
    await db.pos.delete({ where: { id: pos.id } });
    const afterPos = await db.favorite.count({
      where: { userId: user.id, posId: pos.id },
    });
    assert(afterPos === 0, "cascade delete pos");

    console.log(
      JSON.stringify({
        ok: true,
        toggle: true,
        unique: true,
        xor: true,
        scopedIn: true,
        cascadeProduct: true,
        cascadePos: true,
      }),
    );
  } finally {
    await db.$disconnect();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
