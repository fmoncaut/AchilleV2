import { Prisma } from "@prisma/client";

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

export async function startMerchantOnboarding(merchantId: string): Promise<string> {
  const merchant = await prisma.merchant.findUnique({
    where: { id: merchantId },
    select: { id: true, stripeAccountId: true },
  });
  if (!merchant) {
    throw new PaymentError("Enseigne introuvable.");
  }

  const provider = getPaymentProvider();
  let accountId = merchant.stripeAccountId;
  if (!accountId) {
    const created = await provider.createConnectAccount({ merchantId: merchant.id });
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
