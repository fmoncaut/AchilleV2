import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { Breadcrumb } from "@/components/buyer/breadcrumb";
import { BuyerMain, BuyerSection } from "@/components/buyer/shell";
import { PosDistance, PosOfferList } from "@/components/catalog/pos-offers";
import { FavoriteButton } from "@/components/favorite-button";
import { MaterialIcon } from "@/components/material-icon";
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
    <BuyerMain>
      <div className="bg-surface-container-low">
        <BuyerSection className="py-3">
          <Breadcrumb
            items={[
              { href: "/", label: "Accueil" },
              { label: "Magasins" },
              { label: pos.name },
            ]}
          />
        </BuyerSection>
      </div>

      <BuyerSection
        as="article"
        className="flex flex-1 flex-col gap-8 py-6 lg:py-8"
      >
        <header className="bg-primary-container text-on-primary shadow-navy overflow-hidden rounded-2xl">
          <div className="flex flex-col gap-6 p-6 md:flex-row md:items-end md:justify-between md:p-8">
            <div className="flex items-start gap-4">
              <div className="border-primary bg-surface-container-lowest shadow-navy flex size-24 shrink-0 flex-col items-center justify-center rounded-2xl border-4 p-2 text-center">
                <span className="font-headline-sm text-primary leading-tight font-extrabold tracking-tighter uppercase">
                  {pos.merchantName.length > 8
                    ? pos.merchantName.slice(0, 5)
                    : pos.merchantName}
                </span>
                {pos.merchantName.length > 8 ? (
                  <span className="bg-secondary-container text-primary mt-1 rounded-full px-2 py-0.5 text-[10px] font-extrabold tracking-wider uppercase">
                    {pos.merchantName.slice(5)}
                  </span>
                ) : null}
              </div>
              <div>
                <p className="font-label-md text-label-md text-secondary-container tracking-wider uppercase">
                  {pos.merchantName}
                </p>
                <h1 className="font-headline-lg text-headline-lg-mobile sm:text-headline-lg text-on-primary mt-1 tracking-tight">
                  {pos.name}
                </h1>
                {address ? (
                  <p className="font-body-md text-body-md text-on-primary-container mt-2 flex items-center gap-1">
                    <MaterialIcon
                      name="location_on"
                      className="text-secondary-container text-[18px]"
                    />
                    {address}
                  </p>
                ) : null}
                {pos.phone ? (
                  <p className="font-body-sm text-body-sm mt-1">
                    <a
                      href={`tel:${pos.phone.replace(/\s+/g, "")}`}
                      className="text-on-primary inline-flex items-center gap-1 hover:underline"
                    >
                      <MaterialIcon name="call" className="text-[16px]" />
                      {pos.phone}
                    </a>
                  </p>
                ) : null}
                <div className="text-on-primary-container mt-2">
                  <PosDistance posLat={pos.lat} posLng={pos.lng} />
                </div>
              </div>
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
          <div className="border-on-primary/10 bg-primary/40 border-t px-6 py-4 md:px-8">
            <p className="font-label-md text-label-md text-on-primary mb-2 font-bold">
              Horaires
            </p>
            <div className="text-on-primary [&_dd]:text-on-primary-container [&_dt]:text-on-primary">
              <OpeningHoursList value={pos.openingHours} />
            </div>
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
            <h2 className="font-headline-md text-headline-md text-primary-container">
              {cards.length > 1
                ? `${cards.length} offres en déstockage`
                : "1 offre en déstockage"}
            </h2>
            <PosOfferList
              posSlug={pos.slug}
              offers={cards}
              signedIn={favorites.signedIn}
              favoriteProductIds={favorites.productIds}
            />
          </section>
        )}
      </BuyerSection>
    </BuyerMain>
  );
}
