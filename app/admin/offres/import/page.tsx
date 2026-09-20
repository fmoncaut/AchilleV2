import { CsvImportWizard } from "@/components/admin/csv-import";
import { requireAdminActor } from "@/lib/admin/actor";

export const metadata = {
  title: "Import CSV | Back-office Achille",
};

export default async function ImportOffresPage() {
  const actor = await requireAdminActor();

  return (
    <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-6 px-6 py-8">
      <div>
        <p className="text-orange text-sm font-semibold tracking-wide uppercase">
          {actor.merchantName}
        </p>
        <h1 className="text-navy mt-1 text-3xl">Import CSV</h1>
        <p className="text-slate mt-2 text-sm font-medium">
          Les lignes invalides sont rapportées et ignorées. Les lignes valides
          créent ou mettent à jour les offres de votre enseigne uniquement.
        </p>
      </div>
      <div className="bg-card ring-border rounded-2xl p-6 ring-1">
        <CsvImportWizard />
      </div>
    </main>
  );
}
