import { redirect } from "next/navigation";

import { getDashboardActor } from "@/lib/admin/actor";

export default async function AdminIndexPage() {
  const actor = await getDashboardActor();
  if (!actor) {
    redirect("/admin/non-autorise");
  }
  if (actor.role === "ADMIN" && !actor.merchantId) {
    redirect("/admin/renvois");
  }
  redirect("/admin/offres");
}
