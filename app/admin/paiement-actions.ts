"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireDashboardActor } from "@/lib/admin/actor";
import {
  assertMerchantPaymentAccess,
  startMerchantOnboarding,
  updateMerchantFeeRate,
} from "@/lib/payments/connect";
import { PaymentError } from "@/lib/payments/types";

function first(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

export async function startOnboardingAction(formData: FormData) {
  const actor = await requireDashboardActor();
  const merchantId = first(formData, "merchantId");
  try {
    assertMerchantPaymentAccess(actor, merchantId);
    const url = await startMerchantOnboarding(merchantId);
    redirect(url);
  } catch (error) {
    if (error instanceof PaymentError) {
      redirect(
        `/admin/paiements?erreur=${encodeURIComponent(error.message)}`,
      );
    }
    throw error;
  }
}

export async function saveFeeRateAction(formData: FormData) {
  const actor = await requireDashboardActor();
  const merchantId = first(formData, "merchantId");
  try {
    await updateMerchantFeeRate(actor, merchantId, first(formData, "feePercent"));
  } catch (error) {
    if (error instanceof PaymentError) {
      redirect(`/admin/paiements?erreur=${encodeURIComponent(error.message)}`);
    }
    throw error;
  }
  revalidatePath("/admin/paiements");
  redirect("/admin/paiements?enregistre=1");
}
