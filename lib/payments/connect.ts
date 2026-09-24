import { Prisma } from "@prisma/client";
import { z } from "zod";

import { prisma } from "@/lib/db";
import { getPaymentProvider } from "@/lib/payments";
import { PaymentError } from "@/lib/payments/types";
import { getSiteUrl } from "@/lib/site";

export function assertMerchantPaymentAccess(
  actor: { role: "ADMIN" | "MERCHANT"; merchantId: string | null },
  merchantId: string,
) {
  if (actor.role === "MERCHANT" && actor.merchantId !== merchantId) {
    throw new PaymentError("Enseigne hors périmètre.");
  }
}

const contactEmailSchema = z.string().trim().email();

const MISSING_CONTACT_EMAIL =
  "Impossible d'activer l'encaissement : aucune adresse e-mail de contact disponible pour cette enseigne";

export async function startMerchantOnboarding(
  merchantId: string,
  actor: { role: "ADMIN" | "MERCHANT"; email: string | null },
): Promise<string> {
  const merchant = await prisma.merchant.findUnique({
    where: { id: merchantId },
    select: {
      id: true,
      name: true,
      stripeAccountId: true,
      users: {
        where: { role: "MERCHANT", email: { not: null } },
        select: { email: true },
        take: 1,
      },
    },
  });
  if (!merchant) {
    throw new PaymentError("Enseigne introuvable.");
  }

  const provider = getPaymentProvider();
  let accountId = merchant.stripeAccountId;
  if (!accountId) {
    const candidate =
      merchant.users[0]?.email ?? (actor.role === "ADMIN" ? actor.email : null);
    const parsed = contactEmailSchema.safeParse(candidate ?? "");
    if (!parsed.success) {
      throw new PaymentError(MISSING_CONTACT_EMAIL);
    }
    const created = await provider.createConnectAccount({
      merchantId: merchant.id,
      displayName: merchant.name,
      contactEmail: parsed.data,
    });
    accountId = created.accountId;
    await prisma.merchant.update({
      where: { id: merchant.id },
      data: { stripeAccountId: accountId },
    });
  }

  const origin = getSiteUrl();
  const link = await provider.createOnboardingLink({
    accountId,
    refreshUrl: `${origin}/admin/paiements?refresh=1&merchant=${merchant.id}`,
    returnUrl: `${origin}/admin/paiements?retour=1&merchant=${merchant.id}`,
  });
  return link.url;
}

export async function syncConnectAccount(merchantId: string) {
  const merchant = await prisma.merchant.findUnique({
    where: { id: merchantId },
    select: { id: true, stripeAccountId: true },
  });
  if (!merchant?.stripeAccountId) {
    return null;
  }
  const status = await getPaymentProvider().retrieveConnectAccount(
    merchant.stripeAccountId,
  );
  return prisma.merchant.update({
    where: { id: merchant.id },
    data: {
      chargesEnabled: status.chargesEnabled,
      payoutsEnabled: status.payoutsEnabled,
      detailsSubmitted: status.detailsSubmitted,
    },
  });
}

export function parseFeePercent(raw: string): Prisma.Decimal | null {
  const trimmed = raw.trim().replace(",", ".");
  if (!trimmed) {
    return null;
  }
  let percent: Prisma.Decimal;
  try {
    percent = new Prisma.Decimal(trimmed);
  } catch {
    throw new PaymentError("Taux de commission invalide.");
  }
  if (percent.lt(0) || percent.gt(30)) {
    throw new PaymentError("Le taux doit être compris entre 0 et 30 %.");
  }
  return percent.div(100).toDecimalPlaces(4);
}

export async function updateMerchantFeeRate(
  actor: { role: "ADMIN" | "MERCHANT"; merchantId: string | null },
  merchantId: string,
  feePercent: string,
) {
  if (actor.role !== "ADMIN") {
    throw new PaymentError("Seul un administrateur modifie la commission.");
  }
  assertMerchantPaymentAccess(actor, merchantId);
  const feeRate = parseFeePercent(feePercent);
  await prisma.merchant.update({
    where: { id: merchantId },
    data: { feeRate },
  });
}
