import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <main className="bg-paper flex flex-1 flex-col">
      <section className="mx-auto flex w-full max-w-5xl flex-1 flex-col justify-center px-6 py-16">
        <div className="bg-card ring-border max-w-xl rounded-2xl p-8 shadow-sm ring-1">
          <p className="text-orange text-sm font-semibold tracking-wide uppercase">
            Bientôt près de chez vous
          </p>
          <h1 className="text-navy mt-3 text-3xl sm:text-4xl">
            Les bonnes affaires locales, à portée de main
          </h1>
          <p className="text-slate mt-4 text-base font-medium">
            Achille vous aide à trouver des produits en déstockage disponibles
            dans les magasins autour de vous. La vitrine arrive ; pour
            l&apos;instant, rien à acheter ici.
          </p>
          <div className="mt-8">
            <Button
              type="button"
              size="lg"
              className="h-11 rounded-xl px-6 text-base font-bold"
            >
              Découvrir les offres
            </Button>
          </div>
          <p className="text-slate mt-6 text-sm">
            Aucune offre n&apos;est encore publiée. Revenez bientôt.
          </p>
        </div>
      </section>
    </main>
  );
}
