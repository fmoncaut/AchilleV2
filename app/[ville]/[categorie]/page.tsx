import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { CityOffers } from "@/components/catalog/city-offers";
import { getCachedCityCategoryPage } from "@/lib/catalog";
import { getSiteUrl } from "@/lib/site";

export const revalidate = 600;

const RESERVED_VILLE_SLUGS = new Set([
  "offre",
  "magasin",
  "recherche",
  "login",
  "compte",
  "admin",
  "api",
]);

type VilleCategoriePageProps = {
  params: Promise<{ ville: string; categorie: string }>;
};

export async function generateMetadata({
  params,
}: VilleCategoriePageProps): Promise<Metadata> {
  const { ville, categorie } = await params;
  if (RESERVED_VILLE_SLUGS.has(ville)) {
    return { title: "Page introuvable | Achille" };
  }

  const page = await getCachedCityCategoryPage(ville, categorie);
  if (!page) {
    return { title: "Page introuvable | Achille" };
  }

  const title = `${page.categoryName} à ${page.cityName} | Achille`;
  const description = `Bonnes affaires ${page.categoryName.toLowerCase()} en magasin à ${page.cityName}.`;
  const url = `${getSiteUrl()}/${ville}/${page.categorySlug}`;

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      title,
      description,
      locale: "fr_FR",
      type: "website",
      siteName: "Achille",
      url,
    },
  };
}

export default async function VilleCategoriePage({
  params,
}: VilleCategoriePageProps) {
  const { ville, categorie } = await params;
  if (RESERVED_VILLE_SLUGS.has(ville)) {
    notFound();
  }

  const page = await getCachedCityCategoryPage(ville, categorie);
  if (!page) {
    notFound();
  }

  return (
    <CityOffers
      villeSlug={ville}
      cityName={page.cityName}
      categorySlug={page.categorySlug}
      categoryName={page.categoryName}
      offers={page.offers}
    />
  );
}
