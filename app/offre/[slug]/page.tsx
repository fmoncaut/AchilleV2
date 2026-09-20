import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { auth } from "@/auth";
import { OfferShowcase } from "@/components/catalog/offer-showcase";
import { getCachedProductPage } from "@/lib/catalog";
import { getFavoriteFlags } from "@/lib/favorites";
import { getSiteUrl } from "@/lib/site";

export const revalidate = 600;

type OffrePageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({
  params,
}: OffrePageProps): Promise<Metadata> {
  const { slug } = await params;
  const page = await getCachedProductPage(slug);
  if (!page) {
    return { title: "Offre introuvable | Achille" };
  }

  const description =
    page.shortDescription ??
    page.description ??
    `Bonne affaire locale : ${page.name} près de chez vous.`;
  const url = `${getSiteUrl()}/offre/${page.slug}`;

  return {
    title: `${page.name} | Achille`,
    description,
    alternates: { canonical: url },
    openGraph: {
      title: `${page.name} | Achille`,
      description,
      locale: "fr_FR",
      type: "website",
      siteName: "Achille",
      url,
      images: page.imageUrl
        ? [{ url: page.imageUrl, alt: page.name }]
        : undefined,
    },
  };
}

export default async function OffrePage({ params }: OffrePageProps) {
  const { slug } = await params;
  const page = await getCachedProductPage(slug);
  if (!page) {
    notFound();
  }

  const session = await auth();
  const favorites = await getFavoriteFlags(session?.user?.id);

  return (
    <OfferShowcase
      product={page.product}
      offers={page.offers}
      favorites={favorites}
    />
  );
}
