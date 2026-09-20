import Link from "next/link";
import type { ReactNode } from "react";

import { FavoriteButton } from "@/components/favorite-button";
import { auth } from "@/auth";
import { listFavoritesForUser } from "@/lib/favorites";
import { loginWithReturn, magasinPath, offerPath } from "@/lib/urls";

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
    <main className="bg-paper flex flex-1 flex-col">
      <section className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 px-6 py-10">
        <div>
          <p className="text-orange text-sm font-semibold tracking-wide uppercase">
            Compte
          </p>
          <h1 className="text-navy mt-2 text-3xl">Mes favoris</h1>
          <p className="text-slate mt-2 text-sm font-medium">
            Produits et magasins enregistrés sur votre compte — rien n’est
            partagé avec d’autres utilisateurs.
          </p>
        </div>

        <nav
          className="bg-muted ring-border inline-flex w-fit rounded-xl p-1 ring-1"
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
            <EmptyFavorites
              title="Aucun produit favori"
              description="Ajoutez une offre depuis une fiche ou une carte, après connexion."
            />
          ) : (
            <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {products.map((product) => (
                <li key={product.id}>
                  <article className="bg-card ring-border relative overflow-hidden rounded-2xl shadow-sm ring-1">
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
                      <div className="bg-muted aspect-[4/3] overflow-hidden">
                        {product.imageUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={product.imageUrl}
                            alt=""
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="bg-navy text-orange flex h-full w-full items-center justify-center text-3xl font-bold">
                            {product.name.slice(0, 1)}
                          </div>
                        )}
                      </div>
                      <div className="flex flex-1 flex-col gap-1 p-4">
                        <p className="text-orange text-xs font-semibold tracking-wide uppercase">
                          {product.brand?.name ?? "Produit"}
                        </p>
                        <h2 className="text-navy text-base font-bold">
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
          <EmptyFavorites
            title="Aucun magasin favori"
            description="Enregistrez un point de vente depuis sa fiche magasin."
          />
        ) : (
          <ul className="grid gap-4 sm:grid-cols-2">
            {poses.map((pos) => (
              <li key={pos.id}>
                <article className="bg-card ring-border relative rounded-2xl p-5 shadow-sm ring-1">
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
                  <p className="text-orange pr-12 text-sm font-semibold tracking-wide uppercase">
                    {pos.merchant.name}
                  </p>
                  <h2 className="text-navy mt-1 text-xl font-bold">{pos.name}</h2>
                  <p className="text-slate mt-2 text-sm font-medium">
                    {[pos.address, [pos.postalCode, pos.city].filter(Boolean).join(" ")]
                      .filter(Boolean)
                      .join(", ") || "Adresse non renseignée"}
                  </p>
                  <p className="mt-4">
                    <Link
                      href={magasinPath(pos.slug)}
                      className="text-navy text-sm font-bold underline-offset-4 hover:underline"
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
            className="text-navy text-sm font-semibold underline-offset-4 hover:underline"
          >
            Retour au compte
          </Link>
        </p>
      </section>
    </main>
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
      className={
        active
          ? "bg-navy text-paper rounded-lg px-4 py-2 text-sm font-semibold"
          : "text-navy rounded-lg px-4 py-2 text-sm font-semibold"
      }
    >
      {children}
    </Link>
  );
}

function EmptyFavorites({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="bg-card ring-border rounded-2xl p-8 text-center ring-1">
      <h2 className="text-navy text-xl font-bold">{title}</h2>
      <p className="text-slate mt-2 text-sm font-medium">{description}</p>
      <p className="mt-6">
        <Link
          href="/recherche"
          className="bg-orange text-navy inline-flex h-11 items-center rounded-xl px-6 text-sm font-bold"
        >
          Voir les offres
        </Link>
      </p>
    </div>
  );
}
