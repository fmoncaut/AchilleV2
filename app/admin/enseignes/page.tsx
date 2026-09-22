import Link from "next/link";

import { toggleMerchantAction } from "@/app/admin/platform-actions";
import {
  AdminKicker,
  AdminMain,
  AdminTable,
  AdminThead,
  StatusChip,
} from "@/components/admin/admin-shell";
import { ProductImage } from "@/components/product-image";
import { Button } from "@/components/ui/button";
import { requireSuperAdmin } from "@/lib/admin/actor";
import { listMerchants } from "@/lib/admin/platform";

export const metadata = {
  title: "Enseignes | Back-office Achille",
};

export default async function EnseignesPage() {
  await requireSuperAdmin();
  const merchants = await listMerchants();

  return (
    <AdminMain>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <AdminKicker>Console Achille</AdminKicker>
          <h1 className="font-headline-lg text-headline-lg-mobile sm:text-headline-lg text-primary-container mt-1 tracking-tight">
            Enseignes
          </h1>
        </div>
        <Button asChild>
          <Link href="/admin/enseignes/nouveau">Nouvelle enseigne</Link>
        </Button>
      </div>
      {merchants.length === 0 ? (
        <p className="font-body-sm text-body-sm text-on-surface-variant">
          Aucune enseigne. Créez-en une pour y rattacher des magasins.
        </p>
      ) : (
        <AdminTable className="min-w-[40rem]">
          <AdminThead>
            <tr>
              <th className="px-3 py-3">Logo</th>
              <th className="px-3 py-3">Nom</th>
              <th className="px-3 py-3">Slug</th>
              <th className="px-3 py-3">Magasins</th>
              <th className="px-3 py-3">Statut</th>
              <th className="px-3 py-3">Actions</th>
            </tr>
          </AdminThead>
          <tbody>
            {merchants.map((merchant) => (
              <tr
                key={merchant.id}
                className="border-surface-container-high border-t"
              >
                <td className="px-3 py-2">
                  <ProductImage
                    src={merchant.logoUrl}
                    name={merchant.name}
                    variant="thumb"
                  />
                </td>
                <td className="font-headline-sm text-primary-container px-3 py-2 text-[15px]">
                  {merchant.name}
                </td>
                <td className="font-body-sm text-on-surface-variant px-3 py-2">
                  {merchant.slug}
                </td>
                <td className="font-body-sm px-3 py-2">{merchant._count.pos}</td>
                <td className="px-3 py-2">
                  <StatusChip active={merchant.isActive} />
                </td>
                <td className="px-3 py-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <Link
                      href={`/admin/enseignes/${merchant.id}`}
                      className="font-label-md text-primary-container text-xs font-bold underline-offset-4 hover:underline"
                    >
                      Éditer
                    </Link>
                    <form action={toggleMerchantAction}>
                      <input type="hidden" name="id" value={merchant.id} />
                      <input
                        type="hidden"
                        name="isActive"
                        value={merchant.isActive ? "true" : "false"}
                      />
                      <button
                        type="submit"
                        className="font-label-xs text-label-xs text-primary-container font-bold underline-offset-4 hover:underline"
                      >
                        {merchant.isActive ? "Désactiver" : "Activer"}
                      </button>
                    </form>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </AdminTable>
      )}
    </AdminMain>
  );
}
