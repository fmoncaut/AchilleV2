import { notFound } from "next/navigation";

import { BrokerForm } from "@/components/admin/broker-form";
import {
  AdminCard,
  AdminKicker,
  AdminMain,
} from "@/components/admin/admin-shell";
import { requireSuperAdmin } from "@/lib/admin/actor";
import { getBroker } from "@/lib/admin/brokers";

export const metadata = {
  title: "Éditer un broker | Back-office Achille",
};

type EditBrokerPageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function EditBrokerPage({
  params,
  searchParams,
}: EditBrokerPageProps) {
  await requireSuperAdmin();
  const { id } = await params;
  const query = await searchParams;
  const broker = await getBroker(id);
  if (!broker) {
    notFound();
  }

  return (
    <AdminMain width="form">
      <div>
        <AdminKicker>Console Achille</AdminKicker>
        <h1 className="font-headline-lg text-headline-lg-mobile sm:text-headline-lg text-primary-container mt-1 tracking-tight">
          Éditer le broker
        </h1>
      </div>
      {query.ok === "1" ? (
        <p className="font-body-sm bg-secondary-fixed text-on-secondary-fixed rounded-2xl px-3 py-2">
          Broker enregistré. Slug {broker.slug}.
        </p>
      ) : null}
      <AdminCard>
        <BrokerForm
          mode="edit"
          brokerId={broker.id}
          defaults={{
            name: broker.name,
            slug: broker.slug,
            billingType: broker.billingType,
            urlTemplate: broker.urlTemplate,
          }}
        />
      </AdminCard>
    </AdminMain>
  );
}
