import { Prisma } from "@prisma/client";

import type { MerchantFormInput, PosFormInput, UserRoleInput } from "@/lib/admin/platform-schemas";
import { WEEK_DAYS } from "@/lib/admin/platform-schemas";
import { prisma } from "@/lib/db";
import { geocodeAddress, type GeocodeHit } from "@/lib/geocode";
import { slugify } from "@/lib/slug";

export class PlatformError extends Error {}

async function uniqueSlug(
  kind: "merchant" | "pos",
  base: string,
  excludeId?: string,
): Promise<string> {
  const root = slugify(base) || (kind === "merchant" ? "enseigne" : "magasin");
  let slug = root;
  let n = 2;
  while (n < 50) {
    const existing =
      kind === "merchant"
        ? await prisma.merchant.findFirst({
            where: { slug, ...(excludeId ? { NOT: { id: excludeId } } : {}) },
            select: { id: true },
          })
        : await prisma.pos.findFirst({
            where: { slug, ...(excludeId ? { NOT: { id: excludeId } } : {}) },
            select: { id: true },
          });
    if (!existing) {
      return slug;
    }
    slug = `${root}-${n}`.slice(0, 80);
    n += 1;
  }
  throw new PlatformError("Impossible de générer un slug unique.");
}

function openingHoursJson(
  hours: PosFormInput["hours"],
): Prisma.InputJsonValue {
  const value: Record<string, string> = {};
  for (const day of WEEK_DAYS) {
    const raw = hours[day].trim();
    if (!raw) {
      continue;
    }
    value[day] = /^ferm/i.test(raw) ? "fermé" : raw.replace(/\s/g, "");
  }
  return value;
}

function pickGeocodeHit(
  hits: GeocodeHit[],
  postalCode: string,
): GeocodeHit | null {
  return hits.find((hit) => hit.postcode === postalCode) ?? hits[0] ?? null;
}

async function geocodePos(input: PosFormInput): Promise<GeocodeHit> {
  const query = `${input.address}, ${input.postalCode} ${input.city}`;
  let hits: GeocodeHit[] = [];
  try {
    hits = await geocodeAddress(query, 5);
  } catch {
    throw new PlatformError(
      "La Base Adresse Nationale est indisponible. Réessayez dans un instant.",
    );
  }
  const hit = pickGeocodeHit(hits, input.postalCode);
  if (!hit) {
    throw new PlatformError(
      "Adresse introuvable dans la Base Adresse Nationale. Précisez la rue, le code postal et la ville.",
    );
  }
  return hit;
}

export async function getPlatformCounts() {
  const [merchants, poses, offers, users] = await Promise.all([
    prisma.merchant.count(),
    prisma.pos.count(),
    prisma.offer.count(),
    prisma.user.count(),
  ]);
  return { merchants, poses, offers, users };
}

export async function listMerchants() {
  return prisma.merchant.findMany({
    orderBy: { name: "asc" },
    include: { _count: { select: { pos: true, users: true, offers: true } } },
  });
}

export async function getMerchant(id: string) {
  return prisma.merchant.findUnique({ where: { id } });
}

export async function createMerchant(input: MerchantFormInput) {
  const slug = await uniqueSlug("merchant", input.name);
  return prisma.merchant.create({
    data: {
      name: input.name,
      slug,
      logoUrl: input.logoUrl || null,
      isActive: input.isActive,
    },
  });
}

export async function updateMerchant(id: string, input: MerchantFormInput) {
  const current = await prisma.merchant.findUnique({
    where: { id },
    select: { id: true },
  });
  if (!current) {
    throw new PlatformError("Enseigne introuvable.");
  }
  const slug = await uniqueSlug("merchant", input.name, id);
  return prisma.merchant.update({
    where: { id },
    data: {
      name: input.name,
      slug,
      logoUrl: input.logoUrl || null,
      isActive: input.isActive,
    },
  });
}

export async function setMerchantActive(id: string, isActive: boolean) {
  const merchant = await prisma.merchant.findUnique({
    where: { id },
    select: { id: true, slug: true },
  });
  if (!merchant) {
    throw new PlatformError("Enseigne introuvable.");
  }
  await prisma.merchant.update({ where: { id }, data: { isActive } });
  return merchant;
}

export async function listMerchantOptions() {
  return prisma.merchant.findMany({
    orderBy: { name: "asc" },
    select: { id: true, name: true, slug: true, isActive: true },
  });
}

export async function listPos() {
  return prisma.pos.findMany({
    orderBy: [{ merchant: { name: "asc" } }, { name: "asc" }],
    include: { merchant: { select: { id: true, name: true, slug: true } } },
  });
}

export async function getPos(id: string) {
  return prisma.pos.findUnique({
    where: { id },
    include: { merchant: { select: { id: true, name: true, slug: true } } },
  });
}

function posData(input: PosFormInput, hit: GeocodeHit, slug: string) {
  return {
    merchantId: input.merchantId,
    name: input.name,
    slug,
    address: input.address,
    postalCode: input.postalCode,
    city: input.city || hit.city,
    phone: input.phone || null,
    openingHours: openingHoursJson(input.hours),
    lat: hit.lat,
    lng: hit.lng,
    isActive: input.isActive,
  };
}

export async function createPos(input: PosFormInput) {
  const merchant = await prisma.merchant.findUnique({
    where: { id: input.merchantId },
    select: { id: true, slug: true },
  });
  if (!merchant) {
    throw new PlatformError("Enseigne introuvable.");
  }
  const hit = await geocodePos(input);
  const slug = await uniqueSlug(
    "pos",
    `${merchant.slug}-${input.name}-${input.city}`,
  );
  return prisma.pos.create({ data: posData(input, hit, slug) });
}

export async function updatePos(id: string, input: PosFormInput) {
  const current = await prisma.pos.findUnique({
    where: { id },
    select: { id: true },
  });
  if (!current) {
    throw new PlatformError("Magasin introuvable.");
  }
  const merchant = await prisma.merchant.findUnique({
    where: { id: input.merchantId },
    select: { id: true, slug: true },
  });
  if (!merchant) {
    throw new PlatformError("Enseigne introuvable.");
  }
  const hit = await geocodePos(input);
  const slug = await uniqueSlug(
    "pos",
    `${merchant.slug}-${input.name}-${input.city}`,
    id,
  );
  return prisma.pos.update({
    where: { id },
    data: posData(input, hit, slug),
  });
}

export async function setPosActive(id: string, isActive: boolean) {
  const pos = await prisma.pos.findUnique({
    where: { id },
    select: { id: true, slug: true },
  });
  if (!pos) {
    throw new PlatformError("Magasin introuvable.");
  }
  await prisma.pos.update({ where: { id }, data: { isActive } });
  return pos;
}

export async function listUsers(query: string) {
  const q = query.trim().slice(0, 80);
  return prisma.user.findMany({
    where: q
      ? {
          OR: [
            { email: { contains: q, mode: "insensitive" } },
            { name: { contains: q, mode: "insensitive" } },
          ],
        }
      : undefined,
    orderBy: [{ role: "asc" }, { email: "asc" }],
    take: 100,
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      merchantId: true,
      merchant: { select: { name: true, slug: true } },
    },
  });
}

export async function assignUserRole(actorUserId: string, input: UserRoleInput) {
  if (input.userId === actorUserId && (input.intent === "revoke" || input.role !== "ADMIN")) {
    throw new PlatformError(
      "Vous ne pouvez pas retirer votre propre accès administrateur.",
    );
  }

  const user = await prisma.user.findUnique({
    where: { id: input.userId },
    select: { id: true, email: true },
  });
  if (!user) {
    throw new PlatformError("Utilisateur introuvable.");
  }

  if (input.intent === "revoke") {
    return prisma.user.update({
      where: { id: user.id },
      data: { role: "USER", merchantId: null },
    });
  }

  let merchantId: string | null = input.merchantId || null;
  if (input.role === "MERCHANT") {
    const merchant = await prisma.merchant.findUnique({
      where: { id: input.merchantId },
      select: { id: true },
    });
    if (!merchant) {
      throw new PlatformError("Enseigne introuvable.");
    }
    merchantId = merchant.id;
  } else if (merchantId) {
    const merchant = await prisma.merchant.findUnique({
      where: { id: merchantId },
      select: { id: true },
    });
    if (!merchant) {
      throw new PlatformError("Enseigne introuvable.");
    }
  }

  return prisma.user.update({
    where: { id: user.id },
    data: { role: input.role === "ADMIN" ? "ADMIN" : "MERCHANT", merchantId },
  });
}
