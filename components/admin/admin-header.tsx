import { signOutAction } from "@/app/compte/actions";
import { AdminNav, type AdminNavLink } from "@/components/admin/admin-nav";
import { MaterialIcon } from "@/components/material-icon";
import { Button } from "@/components/ui/button";

type AdminHeaderProps = {
  merchantName: string;
  showOffers: boolean;
  showPlatform: boolean;
  showPending?: boolean;
  showMerchantStores?: boolean;
  unreadReservations?: number;
};

export function AdminHeader({
  merchantName,
  showOffers,
  showPlatform,
  showPending = false,
  showMerchantStores = false,
  unreadReservations = 0,
}: AdminHeaderProps) {
  const links: AdminNavLink[] = [];

  if (showPlatform) {
    links.push(
      { href: "/admin", label: "Vue d’ensemble" },
      { href: "/admin/enseignes", label: "Enseignes" },
      { href: "/admin/magasins", label: "Magasins" },
      { href: "/admin/vendeurs", label: "Vendeurs" },
      { href: "/admin/brokers", label: "Brokers" },
      { href: "/admin/affiliation/categories", label: "Catégories" },
      { href: "/admin/affiliation/produits", label: "Produits à créer" },
      { href: "/admin/affiliation/runs", label: "Ingestion" },
    );
  }

  if (showOffers) {
    if (showMerchantStores) {
      links.push({ href: "/admin/mes-magasins", label: "Mes magasins" });
    }
    links.push({ href: "/admin/offres", label: "Offres" });
    if (showPending) {
      links.push({
        href: "/admin/affiliation/en-attente",
        label: "En attente",
      });
    }
    links.push(
      { href: "/admin/offres/import", label: "Import CSV" },
      {
        href: "/admin/reservations",
        label: "Réservations",
        badge: unreadReservations,
      },
      { href: "/admin/paiements", label: "Paiements" },
    );
  } else if (showPlatform) {
    links.push({ href: "/admin/paiements", label: "Paiements" });
  }

  links.push({ href: "/admin/renvois", label: "Renvois" });

  return (
    <div className="bg-surface-container-lowest print:hidden shadow-sm">
      <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-3 sm:px-6">
        <p className="font-headline-sm text-primary-container flex items-center gap-2 text-[16px] font-bold">
          <MaterialIcon
            name="storefront"
            className="text-primary-container text-[20px]"
          />
          Back-office · {merchantName}
        </p>
        <AdminNav links={links}>
          <form action={signOutAction}>
            <Button type="submit" variant="outline">
              Déconnexion
            </Button>
          </form>
        </AdminNav>
      </div>
    </div>
  );
}
