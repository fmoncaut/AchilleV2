import { Prisma } from "@prisma/client";

import type { AdminActor } from "@/lib/admin/actor";
import type { MerchantPosFormInput } from "@/lib/admin/merchant-pos-schemas";
import { WEEK_DAYS } from "@/lib/admin/platform-schemas";
import { prisma } from "@/lib/db";
import { geocodeAddress } from "@/lib/geocode";
import { slugify } from "@/lib/slug";

export class MerchantPosError extends Error {
  constructor(
    message: string,
    readonly code:
      | "not_found"
      | "forbidden"
      | "geocode"
      | "duplicate"
      | "validation" = "validation",
  ) {
    super(message);
  }
}

const DUPLICATE_RADIUS_M = 80;
const PAGE_SIZE = 50;

function openingHoursJson(
  hours: MerchantPosFormInput["hours"],
): Prisma.InputJsonValue {
  const value: Record<string, string> = {};
  for (const day of WEEK_DAYS) {
    const raw = hours[day].trim();
    if (!raw) continue;
    value[day] = /^ferm/i.test(raw) ? "fermé" : raw.replace(/\s/g, "");
  }
  return value;
}

async function uniquePosSlug(
  base: string,
  excludeId?: string,
): Promise<string> {
  const root = slugify(base) || "magasin";
  let slug = root;
  let n = 2;
  while (n < 50) {
    const existing = await prisma.pos.findFirst({
      where: { slug, ...(excludeId ? { NOT: { id: excludeId } } : {}) },
      select: { id: true },
    });
    if (!existing) return slug;
    slug = `${root}-${n}`.slice(0, 80);
    n += 1;
  }
  throw new MerchantPosError("Impossible de générer un slug unique.");
}

/** Charge un POS de l’enseigne de l’acteur, sinon not_found (pas de fuite cross-tenant). */
export async function requireMerchantPos(actor: AdminActor, posId: string) {
  const pos = await prisma.pos.findFirst({
    where: { id: posId, merchantId: actor.merchantId },
  });
  if (!pos) {
    throw new MerchantPosError("Magasin introuvable.", "not_found");
  }
  return pos;
}

export async function listMerchantPosPage(
  merchantId: string,
  filters: { q?: string; status?: string; page: number },
) {
  const page = Math.max(1, filters.page);
  const where: Prisma.PosWhereInput = { merchantId };
  if (
    filters.status === "ACTIVE_VISIBLE" ||
    filters.status === "INACTIVE_VISIBLE" ||
    filters.status === "INACTIVE_HIDDEN"
  ) {
    where.status = filters.status;
  }
  const q = filters.q?.trim();
  if (q) {
    where.OR = [
      { name: { contains: q, mode: "insensitive" } },
      { city: { contains: q, mode: "insensitive" } },
      { address: { contains: q, mode: "insensitive" } },
    ];
  }
  const [total, rows] = await prisma.$transaction([
    prisma.pos.count({ where }),
    prisma.pos.findMany({
      where,
      orderBy: [{ name: "asc" }],
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
  ]);
  return { rows, total, page, pageSize: PAGE_SIZE };
}

export type DuplicateHit = {
  id: string;
  name: string;
  address: string | null;
  city: string | null;
  distanceM: number | null;
};

export async function findMerchantPosDuplicates(
  merchantId: string,
  input: { name: string; lat: number; lng: number; excludeId?: string },
): Promise<DuplicateHit[]> {
  const rows = await prisma.$queryRaw<
    Array<{
      id: string;
      name: string;
      address: string | null;
      city: string | null;
      distanceM: number;
    }>
  >`
    SELECT
      p.id,
      p.name,
      p.address,
      p.city,
      ST_Distance(
        p.geog,
        ST_MakePoint(${input.lng}, ${input.lat})::geography
      ) AS "distanceM"
    FROM "Pos" p
    WHERE p."merchantId" = ${merchantId}
      ${input.excludeId ? Prisma.sql`AND p.id <> ${input.excludeId}` : Prisma.empty}
      AND (
        ST_DWithin(
          p.geog,
          ST_MakePoint(${input.lng}, ${input.lat})::geography,
          ${DUPLICATE_RADIUS_M}
        )
        OR lower(p.name) = lower(${input.name})
      )
    ORDER BY "distanceM" ASC
    LIMIT 5
  `;
  return rows.map((row) => ({
    ...row,
    distanceM: Number(row.distanceM),
  }));
}

/**
 * Géocode BAN obligatoire. Les banLat/banLng du formulaire (choix autocomplete)
 * sont re-validés serveur via une requête BAN — jamais confiance aveugle au front.
 */
export async function resolveMerchantPosPoint(input: MerchantPosFormInput): Promise<{
  lat: number;
  lng: number;
  city: string;
  address: string;
  postalCode: string;
}> {
  const query = `${input.address}, ${input.postalCode} ${input.city}`;
  let hits;
  try {
    hits = await geocodeAddress(query, 5);
  } catch {
    throw new MerchantPosError(
      "La Base Adresse Nationale est indisponible. Réessayez ou signalez au support.",
      "geocode",
    );
  }
  if (hits.length === 0) {
    throw new MerchantPosError(
      "Adresse introuvable dans la Base Adresse Nationale. Choisissez une suggestion ou signalez au support.",
      "geocode",
    );
  }

  const banLat = Number(input.banLat.replace(",", "."));
  const banLng = Number(input.banLng.replace(",", "."));
  if (!Number.isFinite(banLat) || !Number.isFinite(banLng)) {
    throw new MerchantPosError(
      "Choisissez une adresse dans les suggestions BAN.",
      "geocode",
    );
  }

  const matched =
    hits.find(
      (hit) =>
        Math.abs(hit.lat - banLat) < 0.00015 &&
        Math.abs(hit.lng - banLng) < 0.00015,
    ) ?? null;

  if (!matched) {
    throw new MerchantPosError(
      "L’adresse sélectionnée n’a pas pu être confirmée. Resélectionnez une suggestion BAN.",
      "geocode",
    );
  }

  return {
    lat: matched.lat,
    lng: matched.lng,
    city: input.city || matched.city || "",
    address: input.address,
    postalCode: input.postalCode || matched.postcode || "",
  };
}

export async function createMerchantPos(
  actor: AdminActor,
  input: MerchantPosFormInput,
  deps?: {
    resolvePoint?: (
      input: MerchantPosFormInput,
    ) => Promise<{
      lat: number;
      lng: number;
      city: string;
      address: string;
      postalCode: string;
    }>;
  },
): Promise<{ id: string } | { duplicates: DuplicateHit[] }> {
  // merchantId uniquement depuis la session — jamais depuis le payload.
  const point = await (deps?.resolvePoint ?? resolveMerchantPosPoint)(input);
  const duplicates = await findMerchantPosDuplicates(actor.merchantId, {
    name: input.name,
    lat: point.lat,
    lng: point.lng,
  });
  if (duplicates.length > 0 && !input.confirmDuplicate) {
    return { duplicates };
  }

  const slug = await uniquePosSlug(
    `${actor.merchantSlug}-${input.name}-${point.city}`,
  );

  const created = await prisma.pos.create({
    data: {
      merchantId: actor.merchantId,
      name: input.name,
      slug,
      address: point.address,
      postalCode: point.postalCode,
      city: point.city,
      phone: input.phone || null,
      logoUrl: input.logoUrl || null,
      openingHours: openingHoursJson(input.hours),
      lat: point.lat,
      lng: point.lng,
      status: "INACTIVE_HIDDEN",
      statusSource: "MANUAL",
      isActive: false,
      merchantClosedAt: null,
      placeId: `merchant:${actor.merchantId}:${slug}`,
    },
    select: { id: true, merchantId: true },
  });
  return created;
}

export async function updateMerchantPos(
  actor: AdminActor,
  posId: string,
  input: MerchantPosFormInput,
): Promise<{ id: string } | { duplicates: DuplicateHit[] }> {
  const current = await requireMerchantPos(actor, posId);

  const banLat = Number(input.banLat.replace(",", "."));
  const banLng = Number(input.banLng.replace(",", "."));
  const coordsMatchCurrent =
    Number.isFinite(banLat) &&
    Number.isFinite(banLng) &&
    Math.abs(current.lat - banLat) < 0.00015 &&
    Math.abs(current.lng - banLng) < 0.00015;

  const addressUnchanged =
    (current.address ?? "") === input.address.trim() &&
    (current.postalCode ?? "") === input.postalCode.trim() &&
    (current.city ?? "") === input.city.trim();

  let point: {
    lat: number;
    lng: number;
    city: string;
    address: string;
    postalCode: string;
  };

  if (addressUnchanged && coordsMatchCurrent) {
    point = {
      lat: current.lat,
      lng: current.lng,
      city: input.city.trim() || current.city || "",
      address: input.address.trim(),
      postalCode: input.postalCode.trim(),
    };
  } else {
    point = await resolveMerchantPosPoint(input);
    const duplicates = await findMerchantPosDuplicates(actor.merchantId, {
      name: input.name,
      lat: point.lat,
      lng: point.lng,
      excludeId: posId,
    });
    if (duplicates.length > 0 && !input.confirmDuplicate) {
      return { duplicates };
    }
  }

  const slug = await uniquePosSlug(
    `${actor.merchantSlug}-${input.name}-${point.city}`,
    posId,
  );

  await prisma.pos.update({
    where: { id: posId },
    data: {
      name: input.name,
      slug,
      address: point.address,
      postalCode: point.postalCode,
      city: point.city,
      phone: input.phone || null,
      logoUrl: input.logoUrl || null,
      openingHours: openingHoursJson(input.hours),
      lat: point.lat,
      lng: point.lng,
      // Ne jamais toucher status / statusSource / merchantClosedAt ici
    },
  });
  return { id: posId };
}

export async function closeMerchantPos(actor: AdminActor, posId: string) {
  await requireMerchantPos(actor, posId);
  await prisma.pos.update({
    where: { id: posId },
    data: { merchantClosedAt: new Date() },
  });
}

export async function reopenMerchantPos(actor: AdminActor, posId: string) {
  await requireMerchantPos(actor, posId);
  await prisma.pos.update({
    where: { id: posId },
    data: { merchantClosedAt: null },
  });
}

export function supportMailto(details: {
  merchantName: string;
  address: string;
  postalCode: string;
  city: string;
}): string {
  const to = process.env.SUPPORT_EMAIL || process.env.EMAIL_FROM || "support@akwire.fr";
  const subject = encodeURIComponent(
    `[Achille] Géocodage magasin — ${details.merchantName}`,
  );
  const body = encodeURIComponent(
    `Bonjour,\n\nImpossible de géocoder cette adresse magasin :\n${details.address}\n${details.postalCode} ${details.city}\n\nEnseigne : ${details.merchantName}\n\nMerci de la positionner côté superadmin (fallback lat/lng).\n`,
  );
  return `mailto:${to}?subject=${subject}&body=${body}`;
}
