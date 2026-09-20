import type { MetadataRoute } from "next";

import { listSitemapEntries } from "@/lib/catalog";
import { getSiteUrl } from "@/lib/site";

export const revalidate = 600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const site = getSiteUrl();
  const now = new Date();

  const entries: MetadataRoute.Sitemap = [
    {
      url: site,
      lastModified: now,
      changeFrequency: "daily",
      priority: 1,
    },
    {
      url: `${site}/recherche`,
      lastModified: now,
      changeFrequency: "daily",
      priority: 0.8,
    },
    {
      url: `${site}/mentions-legales`,
      lastModified: now,
      changeFrequency: "yearly",
      priority: 0.2,
    },
    {
      url: `${site}/confidentialite`,
      lastModified: now,
      changeFrequency: "yearly",
      priority: 0.2,
    },
    {
      url: `${site}/cgu`,
      lastModified: now,
      changeFrequency: "yearly",
      priority: 0.2,
    },
  ];

  try {
    const { productSlugs, posSlugs, cityCategories } =
      await listSitemapEntries();

    for (const slug of productSlugs) {
      entries.push({
        url: `${site}/offre/${slug}`,
        lastModified: now,
        changeFrequency: "hourly",
        priority: 0.9,
      });
    }

    for (const slug of posSlugs) {
      entries.push({
        url: `${site}/magasin/${slug}`,
        lastModified: now,
        changeFrequency: "daily",
        priority: 0.7,
      });
    }

    for (const pair of cityCategories) {
      entries.push({
        url: `${site}/${pair.ville}/${pair.categorie}`,
        lastModified: now,
        changeFrequency: "daily",
        priority: 0.8,
      });
    }
  } catch {
    // Build CI / environnement sans Postgres : sitemap statique seulement.
  }

  return entries;
}
