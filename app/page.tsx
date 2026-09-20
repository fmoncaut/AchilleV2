import { SearchForm } from "@/components/search/search-form";
import { prisma } from "@/lib/db";
import { DEFAULT_RADIUS_KM } from "@/lib/search";

export const dynamic = "force-dynamic";

export default async function Home() {
  const categories = await prisma.category.findMany({
    orderBy: { name: "asc" },
    select: { name: true, slug: true },
  });

  return (
    <main className="bg-paper flex flex-1 flex-col">
      <section className="mx-auto flex w-full max-w-5xl flex-1 flex-col justify-center px-6 py-16">
        <div className="flex flex-col gap-8">
          <div className="max-w-xl">
            <p className="text-orange text-sm font-semibold tracking-wide uppercase">
              Think global, shop local
            </p>
            <h1 className="text-navy mt-3 text-3xl sm:text-4xl">
              Les bonnes affaires locales, à portée de main
            </h1>
            <p className="text-slate mt-4 text-base font-medium">
              Trouvez des produits en déstockage dans les magasins près de chez
              vous. Achille vous montre le prix remisé, puis vous renvoie vers
              le marchand.
            </p>
          </div>
          <SearchForm
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
        </div>
      </section>
    </main>
  );
}
