import { SearchForm } from "@/components/search/search-form";
import { BuyerMain, BuyerSection } from "@/components/buyer/shell";
import { MaterialIcon } from "@/components/material-icon";
import { prisma } from "@/lib/db";
import { DEFAULT_RADIUS_KM } from "@/lib/search";

export const dynamic = "force-dynamic";

export default async function Home() {
  const categories = await prisma.category.findMany({
    orderBy: { name: "asc" },
    select: { name: true, slug: true },
  });

  return (
    <BuyerMain>
      <section className="border-outline-variant/40 bg-surface-container-lowest border-b">
        <BuyerSection className="flex flex-col gap-6 py-8 lg:py-10">
          <div className="flex flex-col gap-2">
            <p className="font-label-xs text-label-xs text-secondary flex items-center gap-2 font-extrabold tracking-wider uppercase">
              <span className="bg-secondary-container inline-flex size-2.5 rounded-full" />
              Radar déstockage
            </p>
            <h1 className="font-headline-lg text-headline-lg-mobile sm:text-headline-lg text-primary-container tracking-tight">
              Bonnes affaires près de chez toi
            </h1>
            <p className="font-body-sm text-body-sm text-on-surface-variant flex max-w-2xl items-center gap-1.5">
              <MaterialIcon
                name="check_circle"
                className="text-on-tertiary-container text-[16px]"
              />
              Prix remisé, distance et enseigne — puis renvoi tracké vers le
              site du marchand. Pas de panier Achille.
            </p>
          </div>
          <SearchForm
            variant="hero"
            categories={categories}
            values={{
              q: "",
              lieu: "",
              lat: "",
              lng: "",
              r: String(DEFAULT_RADIUS_KM),
              cat: "",
              prixMin: "",
              prixMax: "",
              sort: "distance",
              vue: "liste",
            }}
          />
        </BuyerSection>
      </section>

      <BuyerSection className="flex flex-col gap-8 py-8 lg:py-10">
        <section className="flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <span className="bg-secondary-container font-headline-sm text-primary-container flex size-7 items-center justify-center rounded-lg">
              🔥
            </span>
            <div>
              <h2 className="font-headline-md text-headline-md text-primary-container leading-none">
                Déstockages à proximité
              </h2>
              <p className="font-body-sm text-body-sm text-on-surface-variant">
                Indique un lieu et un rayon, puis lance la recherche pour voir
                les cartes d’offres autour de toi.
              </p>
            </div>
          </div>
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="font-headline-sm text-headline-sm text-primary-container">
            Enseignes autour de toi
          </h2>
          <p className="font-body-sm text-body-sm text-on-surface-variant">
            Les magasins apparaissent dès qu’une localisation est renseignée
            (liste ou carte IGN).
          </p>
        </section>

        <section className="bg-surface-container-lowest shadow-navy-soft rounded-2xl p-5 sm:p-6">
          <h2 className="font-headline-sm text-headline-sm text-primary-container">
            Plusieurs vendeurs, un seul comparateur
          </h2>
          <p className="font-body-sm text-body-sm text-on-surface-variant mt-2">
            Sur chaque fiche produit, compare les offres locales puis ouvre le
            site du marchand — lien sécurisé et tracké, sans paiement sur
            Achille.
          </p>
        </section>
      </BuyerSection>
    </BuyerMain>
  );
}
