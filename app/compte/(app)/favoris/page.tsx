import Link from "next/link";
import { BuyerMain, BuyerSection } from "@/components/buyer/shell";
import { FavoriteButton } from "@/components/favorite-button";
import { ProductImage } from "@/components/product-image";
import { EmptyState } from "@/components/search/empty-state";
import { Chip } from "@/components/ui/chip";
import { auth } from "@/auth";
import { listFavoritesForUser } from "@/lib/favorites";
import { loginWithReturn, magasinPath, offerPath } from "@/lib/urls";

export const metadata = {
  title: "Mes favoris — Akwire",
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
          <p className="font-label-xs text-label-xs text-primary-container font-extrabold tracking-wider uppercase">
            Compte
          </p>
          <h1 className="font-headline-lg text-headline-lg-mobile sm:text-headline-lg text-primary-container mt-2 tracking-tight">
            Mes favoris
          </h1>
          <p className="font-body-md text-body-md text-on-surface-variant mt-2">
            Produits et magasins enregistrés sur votre compte — rien n’est
            partagé avec d’autres utilisateurs.
          </p>
        </div>

        <nav className="flex flex-wrap gap-2" aria-label="Type de favoris">
          <Chip href="/compte/favoris" current={onglet === "produits"}>
            Produits ({products.length})
          </Chip>
          <Chip
            href="/compte/favoris?onglet=magasins"
            current={onglet === "magasins"}
          >
            Magasins ({poses.length})
          </Chip>
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
                  <article className="bg-surface-container-lowest shadow-sm relative overflow-hidden rounded-2xl">
                    <div className="absolute top-3 right-3 z-10">
                      <FavoriteButton
                        kind="product"
                        targetId={product.id}
                        signedIn
                        isFavorite
                        loginHref={loginHref}
                        variant="icon"
                        className="size-11 min-h-11 min-w-11"
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
                        <p className="font-label-xs text-label-xs text-on-surface-variant font-extrabold tracking-wider uppercase">
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
                <article className="bg-surface-container-lowest shadow-sm relative rounded-2xl p-5">
                  <div className="absolute top-3 right-3">
                    <FavoriteButton
                      kind="pos"
                      targetId={pos.id}
                      signedIn
                      isFavorite
                      loginHref={loginHref}
                      variant="icon"
                      className="size-11 min-h-11 min-w-11"
                    />
                  </div>
                  <p className="font-label-xs text-label-xs text-on-surface-variant pr-12 font-extrabold tracking-wider uppercase">
                    {pos.merchant.name}
                  </p>
                  <h2 className="font-headline-sm text-headline-sm text-primary-container mt-1">
                    {pos.name}
                  </h2>
                  <p className="font-body-md text-body-md text-on-surface-variant mt-2">
                    {[pos.address, [pos.postalCode, pos.city].filter(Boolean).join(" ")]
                      .filter(Boolean)
                      .join(", ") || "Adresse non renseignée"}
                  </p>
                  <p className="mt-4">
                    <Link
                      href={magasinPath(pos.slug)}
                      className="font-label-md text-primary-container inline-flex min-h-11 items-center font-bold underline-offset-4 hover:underline"
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
            className="font-label-md text-primary-container inline-flex min-h-11 items-center font-bold underline-offset-4 hover:underline"
          >
            Retour au compte
          </Link>
        </p>
      </BuyerSection>
    </BuyerMain>
  );
}
