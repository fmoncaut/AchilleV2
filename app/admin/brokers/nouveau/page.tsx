import { BrokerForm } from "@/components/admin/broker-form";
import {
  AdminCard,
  AdminKicker,
  AdminMain,
} from "@/components/admin/admin-shell";
import { requireSuperAdmin } from "@/lib/admin/actor";

export const metadata = {
  title: "Nouveau broker | Back-office Achille",
};

export default async function NouveauBrokerPage() {
  await requireSuperAdmin();

  return (
    <AdminMain width="form">
      <div>
        <AdminKicker>Console Achille</AdminKicker>
        <h1 className="font-headline-lg text-headline-lg-mobile sm:text-headline-lg text-primary-container mt-1 tracking-tight">
          Nouveau broker
        </h1>
      </div>
      <AdminCard>
        <BrokerForm mode="create" />
      </AdminCard>
    </AdminMain>
  );
}
