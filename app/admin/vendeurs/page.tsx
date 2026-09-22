import {
  AdminCard,
  AdminKicker,
  AdminMain,
  AdminTable,
  AdminThead,
  StatusChip,
  adminFieldClass,
} from "@/components/admin/admin-shell";
import { UserRoleForm } from "@/components/admin/user-role-form";
import { Button } from "@/components/ui/button";
import { requireSuperAdmin } from "@/lib/admin/actor";
import { listMerchantOptions, listUsers } from "@/lib/admin/platform";

export const metadata = {
  title: "Vendeurs | Back-office Achille",
};

type VendeursPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function first(value: string | string[] | undefined): string {
  return Array.isArray(value) ? (value[0] ?? "") : (value ?? "");
}

const roleLabel = {
  USER: "Acheteur",
  MERCHANT: "Vendeur",
  ADMIN: "Admin",
} as const;

export default async function VendeursPage({ searchParams }: VendeursPageProps) {
  await requireSuperAdmin();
  const raw = await searchParams;
  const q = first(raw.q).trim();
  const saved = raw.ok === "1";
  const [users, merchants] = await Promise.all([
    listUsers(q),
    listMerchantOptions(),
  ]);

  return (
    <AdminMain>
      <div>
        <AdminKicker>Console Achille</AdminKicker>
        <h1 className="font-headline-lg text-headline-lg-mobile sm:text-headline-lg text-primary-container mt-1 tracking-tight">
          Vendeurs
        </h1>
        <p className="font-body-sm text-body-sm text-on-surface-variant mt-2">
          Le compte doit déjà exister (connexion sur Achille). Rattachez-le à
          une enseigne en vendeur, ou donnez-lui le rôle administrateur.
        </p>
      </div>
      {saved ? (
        <p className="font-body-sm bg-secondary-fixed text-on-secondary-fixed rounded-2xl px-3 py-2">
          Rôle mis à jour.
        </p>
      ) : null}
      <AdminCard>
        <UserRoleForm
          users={users.map((user) => ({
            id: user.id,
            label: user.email ?? user.name ?? user.id,
          }))}
          merchants={merchants.map((merchant) => ({
            id: merchant.id,
            label: merchant.name,
          }))}
        />
      </AdminCard>
      <form className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <label className="font-label-md text-label-md text-primary-container flex flex-1 flex-col gap-1">
          Rechercher
          <input
            name="q"
            defaultValue={q}
            placeholder="E-mail ou nom"
            className={adminFieldClass}
          />
        </label>
        <Button type="submit" variant="secondary">
          Filtrer
        </Button>
      </form>
      {users.length === 0 ? (
        <p className="font-body-sm text-body-sm text-on-surface-variant">
          Aucun compte pour cette recherche.
        </p>
      ) : (
        <AdminTable className="min-w-[40rem]">
          <AdminThead>
            <tr>
              <th className="px-3 py-3">E-mail</th>
              <th className="px-3 py-3">Nom</th>
              <th className="px-3 py-3">Rôle</th>
              <th className="px-3 py-3">Enseigne</th>
            </tr>
          </AdminThead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id} className="border-surface-container-high border-t">
                <td className="font-body-sm text-primary-container px-3 py-2">
                  {user.email ?? "—"}
                </td>
                <td className="font-body-sm px-3 py-2">{user.name ?? "—"}</td>
                <td className="px-3 py-2">
                  <StatusChip
                    active={user.role !== "USER"}
                    activeLabel={roleLabel[user.role]}
                    inactiveLabel={roleLabel.USER}
                  />
                </td>
                <td className="font-body-sm text-on-surface-variant px-3 py-2">
                  {user.merchant?.name ?? "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </AdminTable>
      )}
    </AdminMain>
  );
}
