import Link from "next/link";
import type { ReactNode } from "react";

import { BuyerMain, BuyerSection } from "@/components/buyer/shell";
import { FavoriteButton } from "@/components/favorite-button";
import { ProductImage } from "@/components/product-image";
import { EmptyState } from "@/components/search/empty-state";
import { auth } from "@/auth";
import { listFavoritesForUser } from "@/lib/favorites";
import { loginWithReturn, magasinPath, offerPath } from "@/lib/urls";
import { cn } from "@/lib/utils";

export const metadata = {
  title: "Mes favoris — Achille",
};

type FavorisPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function first(value: string | string[] | undefined): string {
  return Array.isArray(value) ? (value[0] ?? "") : (value ?? "");
}

export default async function FavorisPage({ searchParams }: FavorisPageProps) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    return null;
  }

  const onglet = first((await searchParams).onglet) === "magasins"
    ? "magasins"
    : "produits";
  const { products, poses } = await listFavoritesForUser(userId);
  const loginHref = loginWithReturn("/compte/favoris");

  return (
    <BuyerMain>
      <BuyerSection className="flex flex-1 flex-col gap-6 py-10">
        <div>
          <p className="font-label-xs text-label-xs text-secondary font-extrabold tracking-wider uppercase">
            Compte
          </p>
          <h1 className="font-headline-lg text-headline-lg-mobile sm:text-headline-lg text-primary-container mt-2 tracking-tight">
            Mes favoris
          </h1>
          <p className="font-body-sm text-body-sm text-on-surface-variant mt-2">
            Produits et magasins enregistrés sur votre compte — rien n’est
            partagé avec d’autres utilisateurs.
          </p>
        </div>

        <nav
          className="bg-surface-container-low inline-flex w-fit rounded-full p-1"
          aria-label="Type de favoris"
        >
          <TabLink href="/compte/favoris" active={onglet === "produits"}>
            Produits ({products.length})
          </TabLink>
          <TabLink
            href="/compte/favoris?onglet=magasins"
            active={onglet === "magasins"}
          >
            Magasins ({poses.length})
          </TabLink>
        </nav>

        {onglet === "produits" ? (
          products.length === 0 ? (
            <EmptyState
              title="Aucun produit favori"
              description="Ajoutez une offre depuis une fiche ou une carte, après connexion."
              actionHref="/recherche"
              actionLabel="Voir les offres"
            />
          ) : (
            <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {products.map((product) => (
                <li key={product.id}>
                  <article className="bg-surface-container-lowest shadow-navy-soft relative overflow-hidden rounded-2xl">
                    <div className="absolute top-3 right-3 z-10">
                      <FavoriteButton
                        kind="product"
                        targetId={product.id}
                        signedIn
                        isFavorite
                        loginHref={loginHref}
                        variant="icon"
                      />
                    </div>
                    <Link
                      href={offerPath(product.slug)}
                      className="flex h-full flex-col outline-none"
                    >
                      <ProductImage
                        src={product.imageUrl}
                        name={product.name}
                        variant="card"
                      />
                      <div className="flex flex-1 flex-col gap-1 p-4">
                        <p className="font-label-xs text-label-xs text-secondary font-extrabold tracking-wider uppercase">
                          {product.brand?.name ?? "Produit"}
                        </p>
                        <h2 className="font-headline-sm text-primary-container text-[16px] leading-tight">
                          {product.name}
                        </h2>
                      </div>
                    </Link>
                  </article>
                </li>
              ))}
            </ul>
          )
        ) : poses.length === 0 ? (
          <EmptyState
            title="Aucun magasin favori"
            description="Enregistrez un point de vente depuis sa fiche magasin."
            actionHref="/recherche"
            actionLabel="Voir les offres"
          />
        ) : (
          <ul className="grid gap-4 sm:grid-cols-2">
            {poses.map((pos) => (
              <li key={pos.id}>
                <article className="bg-surface-container-lowest shadow-navy-soft relative rounded-2xl p-5">
                  <div className="absolute top-3 right-3">
                    <FavoriteButton
                      kind="pos"
                      targetId={pos.id}
                      signedIn
                      isFavorite
                      loginHref={loginHref}
                      variant="icon"
                    />
                  </div>
                  <p className="font-label-xs text-label-xs text-secondary pr-12 font-extrabold tracking-wider uppercase">
                    {pos.merchant.name}
                  </p>
                  <h2 className="font-headline-sm text-headline-sm text-primary-container mt-1">
                    {pos.name}
                  </h2>
                  <p className="font-body-sm text-body-sm text-on-surface-variant mt-2">
                    {[pos.address, [pos.postalCode, pos.city].filter(Boolean).join(" ")]
                      .filter(Boolean)
                      .join(", ") || "Adresse non renseignée"}
                  </p>
                  <p className="mt-4">
                    <Link
                      href={magasinPath(pos.slug)}
                      className="font-label-md text-primary-container font-bold underline-offset-4 hover:underline"
                    >
                      Voir le magasin
                    </Link>
                  </p>
                </article>
              </li>
            ))}
          </ul>
        )}

        <p>
          <Link
            href="/compte"
            className="font-label-md text-primary-container font-bold underline-offset-4 hover:underline"
          >
            Retour au compte
          </Link>
        </p>
      </BuyerSection>
    </BuyerMain>
  );
}

function TabLink({
  href,
  active,
  children,
}: {
  href: string;
  active: boolean;
  children: ReactNode;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "font-label-md text-label-md rounded-full px-4 py-2 font-bold",
        active
          ? "bg-primary-container text-on-primary shadow-navy-soft"
          : "text-primary-container",
      )}
    >
      {children}
    </Link>
  );
}
