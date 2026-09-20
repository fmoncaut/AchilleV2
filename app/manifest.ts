import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Achille — Think global, shop local",
    short_name: "Achille",
    description:
      "Bonnes affaires locales géolocalisées. Achille vous renvoie vers le marchand.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#002642",
    theme_color: "#002642",
    lang: "fr",
    icons: [
      {
        src: "/icon-192",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon-512",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
