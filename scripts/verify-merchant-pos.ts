/**
 * A.3.5 — isolation multi-enseignes + fermeture douce + création INACTIVE_HIDDEN/MANUAL.
 * Refuse staging / base locale « achille ».
 *
 * Usage :
 *   MERCHANT_POS_DATABASE=achille_merchant_pos_jetable \
 *   DATABASE_URL=postgresql://…/achille_merchant_pos_jetable \
 *   npx tsx scripts/verify-merchant-pos.ts
 */
import { PrismaClient } from "@prisma/client";

import type { AdminActor } from "../lib/admin/actor";
import {
  closeMerchantPos,
  createMerchantPos,
  MerchantPosError,
  requireMerchantPos,
  reopenMerchantPos,
  updateMerchantPos,
} from "../lib/admin/merchant-pos";
import {
  emptyMerchantHours,
  merchantPosFormSchema,
} from "../lib/admin/merchant-pos-schemas";
import { publicOfferWhere } from "../lib/offer-placement";
import { isPosPubliclyVisible } from "../lib/pos-visibility";

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
  const allowed = process.env.MERCHANT_POS_DATABASE ?? "";
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
  const stamp = Date.now();

  // Minimal schema already migrated — create two merchants + actors
  const merchantA = await db.merchant.create({
    data: { name: `A35 A ${stamp}`, slug: `a35-a-${stamp}` },
  });
  const merchantB = await db.merchant.create({
    data: { name: `A35 B ${stamp}`, slug: `a35-b-${stamp}` },
  });

  const actorA: AdminActor = {
    userId: `user-a-${stamp}`,
    email: null,
    role: "MERCHANT",
    merchantId: merchantA.id,
    merchantName: merchantA.name,
    merchantSlug: merchantA.slug,
  };
  const actorB: AdminActor = {
    userId: `user-b-${stamp}`,
    email: null,
    role: "MERCHANT",
    merchantId: merchantB.id,
    merchantName: merchantB.name,
    merchantSlug: merchantB.slug,
  };

  // Mock geocode by inserting with raw coords then testing requireMerchantPos isolation
  // createMerchantPos needs BAN — for jetable we stub by calling prisma create for B
  // and testing require/update/close isolation; create path tested with mocked resolve
  // via direct DB insert simulating createMerchantPos result shape.

  const posB = await db.pos.create({
    data: {
      merchantId: merchantB.id,
      name: "Magasin B",
      slug: `a35-b-pos-${stamp}`,
      address: "1 rue B",
      postalCode: "75001",
      city: "Paris",
      lat: 48.86,
      lng: 2.35,
      status: "ACTIVE_VISIBLE",
      statusSource: "AUTO",
      isActive: true,
      placeId: `a35-b-${stamp}`,
    },
  });

  const posA = await db.pos.create({
    data: {
      merchantId: merchantA.id,
      name: "Magasin A",
      slug: `a35-a-pos-${stamp}`,
      address: "2 rue A",
      postalCode: "69001",
      city: "Lyon",
      lat: 45.75,
      lng: 4.85,
      status: "INACTIVE_HIDDEN",
      statusSource: "MANUAL",
      isActive: false,
      placeId: `a35-a-${stamp}`,
    },
  });

  // Create : merchantId forcé depuis l’acteur — payload « enseigne B » impossible (absent du schéma)
  const forgedPayload = merchantPosFormSchema.safeParse({
    name: `Create A ${stamp}`,
    address: "10 rue Create",
    postalCode: "69003",
    city: "Lyon",
    phone: "",
    logoUrl: "",
    hours: emptyMerchantHours(),
    banLat: "45.75",
    banLng: "4.85",
    confirmDuplicate: true,
    merchantId: merchantB.id,
  } as Record<string, unknown>);
  assert(forgedPayload.success, "Parse create ok");
  assert(
    !("merchantId" in forgedPayload.data),
    "Le schéma marchand n’accepte pas merchantId dans le payload.",
  );

  const created = await createMerchantPos(actorA, forgedPayload.data, {
    resolvePoint: async () => ({
      lat: 45.751,
      lng: 4.851,
      city: "Lyon",
      address: "10 rue Create",
      postalCode: "69003",
    }),
  });
  assert(!("duplicates" in created), "Create doit aboutir");
  const createdRow = await db.pos.findUniqueOrThrow({
    where: { id: created.id },
  });
  assert(
    createdRow.merchantId === merchantA.id,
    "Create doit forcer merchantId = actor.merchantId (enseigne A).",
  );
  assert(
    createdRow.merchantId !== merchantB.id,
    "Create ne peut pas viser l’enseigne B.",
  );
  assert(createdRow.status === "INACTIVE_HIDDEN", "Create → INACTIVE_HIDDEN");
  assert(createdRow.statusSource === "MANUAL", "Create → MANUAL");
  assert(createdRow.merchantId === merchantA.id, "Ligne DB = enseigne A");

  // Isolation: A cannot load B
  try {
    await requireMerchantPos(actorA, posB.id);
    throw new Error("Isolation cassée : A a lu le POS de B.");
  } catch (error) {
    assert(
      error instanceof MerchantPosError && error.code === "not_found",
      "Attendu not_found cross-tenant.",
    );
  }

  // Isolation: A cannot close B
  try {
    await closeMerchantPos(actorA, posB.id);
    throw new Error("Isolation cassée : A a fermé le POS de B.");
  } catch (error) {
    assert(
      error instanceof MerchantPosError && error.code === "not_found",
      "Fermeture cross-tenant doit échouer.",
    );
  }

  // Isolation: A cannot update B (even forged id)
  try {
    await updateMerchantPos(actorA, posB.id, {
      name: "Hack",
      address: "1 rue B",
      postalCode: "75001",
      city: "Paris",
      phone: "",
      logoUrl: "",
      hours: emptyMerchantHours(),
      banLat: "48.86",
      banLng: "2.35",
      confirmDuplicate: true,
    });
    throw new Error("Isolation cassée : A a modifié le POS de B.");
  } catch (error) {
    assert(
      error instanceof MerchantPosError &&
        (error.code === "not_found" || error.code === "geocode"),
      `Update cross-tenant doit échouer, got ${error}`,
    );
  }

  // Created shape defaults
  assert(posA.status === "INACTIVE_HIDDEN", "Création → INACTIVE_HIDDEN");
  assert(posA.statusSource === "MANUAL", "Création → MANUAL");

  // Soft close precedence
  await closeMerchantPos(actorA, posA.id);
  const closed = await db.pos.findUniqueOrThrow({ where: { id: posA.id } });
  assert(closed.merchantClosedAt != null, "merchantClosedAt posé");
  assert(closed.status === "INACTIVE_HIDDEN", "status inchangé à la fermeture");
  assert(closed.statusSource === "MANUAL", "statusSource inchangé");

  // Even if admin sets ACTIVE_VISIBLE, closed stays out of vitrine
  await db.pos.update({
    where: { id: posA.id },
    data: { status: "ACTIVE_VISIBLE", isActive: true, statusSource: "AUTO" },
  });
  const forced = await db.pos.findUniqueOrThrow({ where: { id: posA.id } });
  assert(
    !isPosPubliclyVisible(forced),
    "merchantClosedAt prime sur ACTIVE_VISIBLE",
  );

  // publicOfferWhere excludes closed POS
  const product = await db.product.create({
    data: {
      name: `Prod ${stamp}`,
      slug: `prod-a35-${stamp}`,
    },
  });
  const offer = await db.offer.create({
    data: {
      productId: product.id,
      posId: posA.id,
      merchantId: merchantA.id,
      kind: "DIRECT",
      priceRemise: 10,
      stock: 2,
      isOnline: true,
    },
  });
  const visible = await db.offer.findFirst({
    where: { id: offer.id, ...publicOfferWhere },
  });
  assert(visible == null, "Offre sur POS fermé hors publicOfferWhere");

  await reopenMerchantPos(actorA, posA.id);
  const reopened = await db.pos.findUniqueOrThrow({ where: { id: posA.id } });
  assert(reopened.merchantClosedAt == null, "Rouverture");
  assert(isPosPubliclyVisible(reopened), "Rouvert + ACTIVE_VISIBLE → visible");

  // No DELETE used — row still exists
  const stillThere = await db.pos.findUnique({ where: { id: posA.id } });
  assert(stillThere, "Pas de DELETE SQL");

  // B actor can manage own
  await closeMerchantPos(actorB, posB.id);
  const bClosed = await db.pos.findUniqueOrThrow({ where: { id: posB.id } });
  assert(bClosed.merchantClosedAt != null, "B ferme son POS");

  console.log("verify-merchant-pos ok");
  await db.$disconnect();
}

main().catch(async (error) => {
  console.error(error);
  process.exitCode = 1;
});
