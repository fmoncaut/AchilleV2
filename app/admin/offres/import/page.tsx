import { CsvImportWizard } from "@/components/admin/csv-import";
import {
  AdminCard,
  AdminKicker,
  AdminMain,
} from "@/components/admin/admin-shell";
import { requireAdminActor } from "@/lib/admin/actor";

export const metadata = {
  title: "Import CSV | Back-office Achille",
};

export default async function ImportOffresPage() {
  const actor = await requireAdminActor();

  return (
    <AdminMain>
      <div>
        <AdminKicker>{actor.merchantName}</AdminKicker>
        <h1 className="font-headline-lg text-headline-lg-mobile sm:text-headline-lg text-primary-container mt-1 tracking-tight">
          Import CSV
        </h1>
        <p className="font-body-sm text-body-sm text-on-surface-variant mt-2">
          Les lignes invalides sont rapportées et ignorées. Les lignes valides
          créent ou mettent à jour les offres de votre enseigne uniquement.
        </p>
      </div>
      <AdminCard>
        <CsvImportWizard />
      </AdminCard>
    </AdminMain>
  );
}
