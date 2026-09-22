"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireSuperAdmin } from "@/lib/admin/actor";
import { brokerFormSchema } from "@/lib/admin/broker-schemas";
import { BrokerError, createBroker, updateBroker } from "@/lib/admin/brokers";

export type BrokerActionState = {
  error?: string;
  fieldErrors?: Record<string, string>;
};

function first(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

function fieldErrors(issues: Array<{ path: PropertyKey[]; message: string }>) {
  const errors: Record<string, string> = {};
  for (const issue of issues) {
    const key = String(issue.path[0] ?? "form");
    if (!errors[key]) {
      errors[key] = issue.message;
    }
  }
  return errors;
}

function parseBrokerForm(formData: FormData) {
  return brokerFormSchema.safeParse({
    name: first(formData, "name"),
    billingType: first(formData, "billingType") || "CPC",
    urlTemplate: first(formData, "urlTemplate"),
  });
}

export async function createBrokerAction(
  _prev: BrokerActionState,
  formData: FormData,
): Promise<BrokerActionState> {
  await requireSuperAdmin();
  const parsed = parseBrokerForm(formData);
  if (!parsed.success) {
    return { fieldErrors: fieldErrors(parsed.error.issues) };
  }
  try {
    const broker = await createBroker(parsed.data);
    revalidatePath("/admin/brokers");
    revalidatePath("/admin");
    redirect(`/admin/brokers/${broker.id}?ok=1`);
  } catch (error) {
    if (error instanceof BrokerError) {
      return { error: error.message };
    }
    throw error;
  }
}

export async function updateBrokerAction(
  _prev: BrokerActionState,
  formData: FormData,
): Promise<BrokerActionState> {
  await requireSuperAdmin();
  const id = first(formData, "id");
  if (!id) {
    return { error: "Broker manquant." };
  }
  const parsed = parseBrokerForm(formData);
  if (!parsed.success) {
    return { fieldErrors: fieldErrors(parsed.error.issues) };
  }
  try {
    await updateBroker(id, parsed.data);
  } catch (error) {
    if (error instanceof BrokerError) {
      return { error: error.message };
    }
    throw error;
  }
  revalidatePath("/admin/brokers");
  revalidatePath(`/admin/brokers/${id}`);
  redirect(`/admin/brokers/${id}?ok=1`);
}
