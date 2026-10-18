import Link from "next/link";

import {
  AdminKicker,
  AdminMain,
  AdminTable,
  AdminTh,
  AdminThead,
} from "@/components/admin/admin-shell";
import { Button } from "@/components/ui/button";
import { requireSuperAdmin } from "@/lib/admin/actor";
import { listBrokers } from "@/lib/admin/brokers";

export const metadata = {
  title: "Brokers | Back-office Akwire",
};

export default async function BrokersPage() {
  await requireSuperAdmin();
  const brokers = await listBrokers();

  return (
    <AdminMain>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <AdminKicker>Console Akwire</AdminKicker>
          <h1 className="font-headline-lg text-headline-lg-mobile sm:text-headline-lg text-primary-container mt-1 tracking-tight">
            Flux d’affiliation
          </h1>
          <p className="font-body-md text-body-md text-on-surface-variant mt-2">
            Brokers CPC ou CPA. Le gabarit construit l’URL de sortie après
            l’enregistrement du clic.
          </p>
        </div>
        <Button asChild>
          <Link href="/admin/brokers/nouveau">Nouveau broker</Link>
        </Button>
      </div>
      {brokers.length === 0 ? (
        <p className="font-body-md text-body-md text-on-surface-variant">
          Aucun broker. Créez-en un pour tracer les renvois d’affiliation.
        </p>
      ) : (
        <AdminTable caption="Brokers" className="min-w-[40rem]">
          <AdminThead>
            <tr>
              <AdminTh className="px-4 py-3">Nom</AdminTh>
              <AdminTh className="px-4 py-3">Type</AdminTh>
              <AdminTh className="px-4 py-3">Offres</AdminTh>
              <AdminTh className="px-4 py-3">Gabarit</AdminTh>
              <AdminTh className="px-4 py-3">
                <span className="sr-only">Actions</span>
              </AdminTh>
            </tr>
          </AdminThead>
          <tbody>
            {brokers.map((broker) => (
              <tr
                key={broker.id}
                className="border-surface-container-high border-t"
              >
                <td className="px-4 py-3">
                  <p className="font-body-md text-body-md text-primary-container font-bold">
                    {broker.name}
                  </p>
                  <p className="font-body-sm text-body-sm text-on-surface-variant">
                    {broker.slug}
                  </p>
                </td>
                <td className="px-4 py-3">
                  <span className="font-body-sm text-body-sm bg-secondary-fixed text-on-secondary-fixed rounded-full px-2.5 py-1 font-bold">
                    {broker.billingType}
                  </span>
                </td>
                <td className="font-body-md text-body-md text-primary-container px-4 py-3 font-bold">
                  {broker._count.offers}
                </td>
                <td className="font-body-sm text-body-sm text-on-surface-variant max-w-xs truncate px-4 py-3">
                  {broker.urlTemplate}
                </td>
                <td className="px-4 py-3">
                  <Link
                    href={`/admin/brokers/${broker.id}`}
                    className="font-body-md text-body-md text-primary-container inline-flex min-h-11 items-center font-bold underline-offset-4 hover:underline"
                  >
                    Éditer
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </AdminTable>
      )}
    </AdminMain>
  );
}
