import Link from "next/link";

import { togglePosAction } from "@/app/admin/platform-actions";
import {
  AdminKicker,
  AdminMain,
  AdminTable,
  AdminThead,
  StatusChip,
} from "@/components/admin/admin-shell";
import { Button } from "@/components/ui/button";
import { requireSuperAdmin } from "@/lib/admin/actor";
import { listPos } from "@/lib/admin/platform";

export const metadata = {
  title: "Magasins | Back-office Achille",
};

export default async function MagasinsPage() {
  await requireSuperAdmin();
  const poses = await listPos();

  return (
    <AdminMain>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <AdminKicker>Console Achille</AdminKicker>
          <h1 className="font-headline-lg text-headline-lg-mobile sm:text-headline-lg text-primary-container mt-1 tracking-tight">
            Magasins
          </h1>
          <p className="font-body-sm text-body-sm text-on-surface-variant mt-2">
            L’adresse est géocodée (Base Adresse Nationale) pour alimenter la
            recherche autour de vous.
          </p>
        </div>
        <Button asChild>
          <Link href="/admin/magasins/nouveau">Nouveau magasin</Link>
        </Button>
      </div>
      {poses.length === 0 ? (
        <p className="font-body-sm text-body-sm text-on-surface-variant">
          Aucun magasin. Créez-en un sur une enseigne existante.
        </p>
      ) : (
        <AdminTable className="min-w-[48rem]">
          <AdminThead>
            <tr>
              <th className="px-3 py-3">Enseigne</th>
              <th className="px-3 py-3">Magasin</th>
              <th className="px-3 py-3">Ville</th>
              <th className="px-3 py-3">Position</th>
              <th className="px-3 py-3">Statut</th>
              <th className="px-3 py-3">Actions</th>
            </tr>
          </AdminThead>
          <tbody>
            {poses.map((pos) => (
              <tr key={pos.id} className="border-surface-container-high border-t">
                <td className="font-body-sm text-primary-container px-3 py-2">
                  {pos.merchant.name}
                </td>
                <td className="px-3 py-2">
                  <p className="font-headline-sm text-primary-container text-[15px]">
                    {pos.name}
                  </p>
                  <p className="font-body-sm text-on-surface-variant text-xs">
                    {[pos.address, pos.postalCode].filter(Boolean).join(", ")}
                  </p>
                </td>
                <td className="font-body-sm px-3 py-2">{pos.city ?? "—"}</td>
                <td className="font-body-sm text-on-surface-variant px-3 py-2 whitespace-nowrap">
                  {pos.lat.toFixed(4)}, {pos.lng.toFixed(4)}
                </td>
                <td className="px-3 py-2">
                  <StatusChip active={pos.isActive} />
                </td>
                <td className="px-3 py-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <Link
                      href={`/admin/magasins/${pos.id}`}
                      className="font-label-md text-primary-container text-xs font-bold underline-offset-4 hover:underline"
                    >
                      Éditer
                    </Link>
                    <form action={togglePosAction}>
                      <input type="hidden" name="id" value={pos.id} />
                      <input
                        type="hidden"
                        name="isActive"
                        value={pos.isActive ? "true" : "false"}
                      />
                      <button
                        type="submit"
                        className="font-label-xs text-label-xs text-primary-container font-bold underline-offset-4 hover:underline"
                      >
                        {pos.isActive ? "Désactiver" : "Activer"}
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
