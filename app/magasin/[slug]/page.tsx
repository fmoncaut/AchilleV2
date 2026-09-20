import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { PosDistance, PosOfferList } from "@/components/catalog/pos-offers";
import { FavoriteButton } from "@/components/favorite-button";
import { OpeningHoursList } from "@/components/opening-hours";
import { EmptyState } from "@/components/search/empty-state";
import { auth } from "@/auth";
import { getCachedPosPage } from "@/lib/catalog";
import { getFavoriteFlags } from "@/lib/favorites";
import { getSiteUrl } from "@/lib/site";
import { loginWithReturn } from "@/lib/urls";

export const revalidate = 600;

type MagasinPageProps = {
  params: Promise<{ slug: string }>;
};

function formatAddress(pos: {
  address: string | null;
  postalCode: string | null;
  city: string | null;
}): string {
  return [pos.address, [pos.postalCode, pos.city].filter(Boolean).join(" ")]
    .filter(Boolean)
    .join(", ");
}

export async function generateMetadata({
  params,
}: MagasinPageProps): Promise<Metadata> {
  const { slug } = await params;
  const pos = await getCachedPosPage(slug);
  if (!pos) {
    return { title: "Magasin introuvable | Achille" };
  }

  const where = [pos.name, pos.city].filter(Boolean).join(", ");
  const description = `Offres en déstockage chez ${pos.merchantName} — ${where}.`;
  const url = `${getSiteUrl()}/magasin/${pos.slug}`;

  return {
    title: `${pos.name} | Achille`,
    description,
    alternates: { canonical: url },
    openGraph: {
      title: `${pos.name} | Achille`,
      description,
      locale: "fr_FR",
      type: "website",
      siteName: "Achille",
      url,
      images: pos.merchantLogoUrl
        ? [{ url: pos.merchantLogoUrl, alt: pos.merchantName }]
        : undefined,
    },
  };
}

export default async function MagasinPage({ params }: MagasinPageProps) {
  const { slug } = await params;
  const pos = await getCachedPosPage(slug);
  if (!pos) {
    notFound();
  }

  const session = await auth();
  const favorites = await getFavoriteFlags(session?.user?.id);
  const address = formatAddress(pos);
  const cards = pos.offers;
  const loginHref = loginWithReturn(`/magasin/${pos.slug}`);

  return (
    <main className="bg-paper flex flex-1 flex-col">
      <article className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-8 px-6 py-10">
        <nav className="text-slate text-sm font-medium">
          <Link href="/" className="hover:text-navy underline-offset-4 hover:underline">
            Accueil
          </Link>
          <span aria-hidden> · </span>
          <span>Magasins</span>
        </nav>

        <header className="bg-card ring-border rounded-2xl p-6 shadow-sm ring-1">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-orange text-sm font-semibold tracking-wide uppercase">
                {pos.merchantName}
              </p>
              <h1 className="text-navy mt-2 text-3xl">{pos.name}</h1>
            </div>
            <FavoriteButton
              kind="pos"
              targetId={pos.id}
              signedIn={favorites.signedIn}
              isFavorite={favorites.posIds.includes(pos.id)}
              loginHref={loginHref}
              variant="label"
            />
          </div>
          {address ? (
            <p className="text-slate mt-2 text-sm font-medium">{address}</p>
          ) : null}
          {pos.phone ? (
            <p className="text-slate mt-1 text-sm font-medium">{pos.phone}</p>
          ) : null}
          <PosDistance posLat={pos.lat} posLng={pos.lng} />
          <div className="mt-4">
            <p className="text-navy mb-2 text-sm font-semibold">Horaires</p>
            <OpeningHoursList value={pos.openingHours} />
          </div>
        </header>

        {cards.length === 0 ? (
          <EmptyState
            title="Aucune offre en ligne"
            description="Ce magasin n’a pas d’offre publiée pour le moment."
            actionHref="/recherche"
            actionLabel="Chercher ailleurs"
          />
        ) : (
          <section className="flex flex-col gap-4">
            <h2 className="text-navy text-2xl">
              {cards.length} offre{cards.length > 1 ? "s" : ""} en ligne
            </h2>
            <PosOfferList
              posSlug={pos.slug}
              offers={cards}
              signedIn={favorites.signedIn}
              favoriteProductIds={favorites.productIds}
            />
          </section>
        )}
      </article>
    </main>
  );
}
