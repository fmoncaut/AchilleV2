import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { prisma } from "@/lib/db";

type OffrePageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({
  params,
}: OffrePageProps): Promise<Metadata> {
  const { slug } = await params;
  const product = await prisma.product.findUnique({
    where: { slug },
    select: { name: true, shortDescription: true },
  });

  if (!product) {
    return { title: "Offre introuvable | Achille" };
  }

  return {
    title: `${product.name} | Achille`,
    description:
      product.shortDescription ??
      "Offre locale en déstockage. Fiche détaillée bientôt disponible.",
  };
}

export default async function OffreStubPage({ params }: OffrePageProps) {
  const { slug } = await params;
  const product = await prisma.product.findUnique({
    where: { slug },
    select: { name: true, shortDescription: true },
  });

  if (!product) {
    notFound();
  }

  return (
    <main className="bg-paper flex flex-1 flex-col">
      <section className="mx-auto w-full max-w-5xl px-6 py-16">
        <div className="bg-card ring-border max-w-xl rounded-2xl p-8 shadow-sm ring-1">
          <p className="text-orange text-sm font-semibold tracking-wide uppercase">
            Fiche offre
          </p>
          <h1 className="text-navy mt-3 text-3xl">{product.name}</h1>
          {product.shortDescription ? (
            <p className="text-slate mt-3 text-sm font-medium">
              {product.shortDescription}
            </p>
          ) : null}
          <p className="text-slate mt-4 text-sm font-medium">
            La fiche détaillée (vendeurs, carte, SEO) arrive à l&apos;incrément
            suivant. En affiliation, l&apos;achat se fera chez le marchand —
            pas de panier ici.
          </p>
          <p className="mt-8">
            <Link
              href="/recherche"
              className="bg-orange text-navy inline-flex h-11 items-center rounded-xl px-6 text-sm font-bold"
            >
              Retour aux offres
            </Link>
          </p>
        </div>
      </section>
    </main>
  );
}
