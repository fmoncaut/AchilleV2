import { prisma } from "@/lib/db";
import { slugify } from "@/lib/slug";

import type { BrokerFormInput } from "@/lib/admin/broker-schemas";

export class BrokerError extends Error {}

async function uniqueBrokerSlug(name: string, excludeId?: string) {
  const root = slugify(name) || "broker";
  let slug = root;
  let n = 2;
  while (n < 50) {
    const existing = await prisma.broker.findFirst({
      where: { slug, ...(excludeId ? { NOT: { id: excludeId } } : {}) },
      select: { id: true },
    });
    if (!existing) {
      return slug;
    }
    slug = `${root}-${n}`.slice(0, 80);
    n += 1;
  }
  throw new BrokerError("Impossible de générer un slug unique.");
}

export async function listBrokers() {
  return prisma.broker.findMany({
    orderBy: { name: "asc" },
    include: { _count: { select: { offers: true } } },
  });
}

export async function listBrokerOptions() {
  return prisma.broker.findMany({
    orderBy: { name: "asc" },
    select: { id: true, name: true, billingType: true },
  });
}

export async function getBroker(id: string) {
  return prisma.broker.findUnique({ where: { id } });
}

export async function createBroker(input: BrokerFormInput) {
  const slug = await uniqueBrokerSlug(input.name);
  return prisma.broker.create({
    data: {
      name: input.name,
      slug,
      billingType: input.billingType,
      urlTemplate: input.urlTemplate.trim(),
    },
  });
}

export async function updateBroker(id: string, input: BrokerFormInput) {
  const current = await prisma.broker.findUnique({
    where: { id },
    select: { id: true },
  });
  if (!current) {
    throw new BrokerError("Broker introuvable.");
  }
  const slug = await uniqueBrokerSlug(input.name, id);
  return prisma.broker.update({
    where: { id },
    data: {
      name: input.name,
      slug,
      billingType: input.billingType,
      urlTemplate: input.urlTemplate.trim(),
    },
  });
}
