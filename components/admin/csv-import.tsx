"use client";

import { useActionState } from "react";

import {
  importCsvAction,
  previewCsvAction,
  type CsvImportState,
  type CsvPreviewState,
} from "@/app/admin/actions";
import { AdminTable, AdminThead } from "@/components/admin/admin-shell";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function CsvImportWizard() {
  const [preview, previewAction, previewPending] = useActionState<
    CsvPreviewState,
    FormData
  >(previewCsvAction, {});
  const [imported, importAction, importPending] = useActionState<
    CsvImportState,
    FormData
  >(importCsvAction, {});

  const rows = preview.rows ?? [];
  const validCount = rows.filter((row) => row.ok).length;
  const invalidCount = rows.filter((row) => !row.ok).length;
  const payload = JSON.stringify(rows);
  const hasPreview = Boolean(preview.rows || preview.error);
  const hasResult =
    imported.imported != null || imported.skipped != null || Boolean(imported.error);

  const step = hasResult ? 3 : hasPreview ? 2 : 1;

  return (
    <div className="flex flex-col gap-6">
      <ol className="font-label-md text-label-md flex flex-wrap gap-3">
        <StepChip n={1} label="Upload" active={step === 1} done={step > 1} />
        <StepChip n={2} label="Validation" active={step === 2} done={step > 2} />
        <StepChip n={3} label="Import" active={step === 3} done={false} />
      </ol>

      {step === 1 ? (
        <form action={previewAction} className="flex flex-col gap-4">
          <label className="font-label-md text-label-md text-primary-container flex flex-col gap-2">
            Fichier CSV
            <input
              type="file"
              name="file"
              accept=".csv,text/csv"
              required
              className="bg-surface-container-low font-body-sm text-on-surface rounded-2xl px-4 py-3"
            />
          </label>
          <p className="font-body-sm text-body-sm text-on-surface-variant">
            Colonnes : ean, nom, categorie, prix_remise, prix_reference, tva,
            stock, condition, pos, merchant_url. Affiliation : broker (slug),
            scope (enseigne ou pos_cibles), pos_cibles (slugs séparés par |),
            broker_rate (décimal, optionnel). Sans scope, l’offre reste ciblée
            sur la colonne pos. Modèle :{" "}
            <a
              href="/exemples/offres-import.csv"
              className="text-primary-container font-bold underline-offset-4 hover:underline"
            >
              offres-import.csv
            </a>
            .
          </p>
          <Button type="submit" disabled={previewPending} className="w-fit">
            {previewPending ? "Analyse…" : "Valider le fichier"}
          </Button>
        </form>
      ) : null}

      {step === 2 ? (
        <div className="flex flex-col gap-4">
          {preview.error ? (
            <p className="font-body-sm bg-error-container text-on-error-container rounded-2xl px-3 py-2">
              {preview.error}
            </p>
          ) : (
            <p className="font-body-sm text-body-sm text-primary-container">
              {validCount} ligne{validCount > 1 ? "s" : ""} valide
              {validCount > 1 ? "s" : ""} · {invalidCount} en erreur. Les
              erreurs n’empêchent pas l’import des lignes valides.
            </p>
          )}
          {rows.length > 0 ? (
            <AdminTable className="min-w-[40rem]">
              <AdminThead>
                <tr>
                  <th className="px-3 py-2">Ligne</th>
                  <th className="px-3 py-2">EAN</th>
                  <th className="px-3 py-2">Nom</th>
                  <th className="px-3 py-2">Statut</th>
                </tr>
              </AdminThead>
              <tbody>
                {rows.map((row) => (
                  <tr
                    key={row.line}
                    className="border-surface-container-high border-t"
                  >
                    <td className="font-body-sm px-3 py-2">{row.line}</td>
                    <td className="font-body-sm px-3 py-2">{row.raw.ean}</td>
                    <td className="font-body-sm px-3 py-2">{row.raw.nom}</td>
                    <td className="px-3 py-2">
                      {row.ok ? (
                        <span className="font-label-xs text-label-xs bg-tertiary-fixed text-on-tertiary-container rounded-full px-2.5 py-1 font-bold">
                          OK
                        </span>
                      ) : (
                        <span className="font-body-sm text-error">
                          {row.errors.join(" · ")}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </AdminTable>
          ) : null}
          <div className="flex flex-wrap gap-3">
            {validCount > 0 ? (
              <form action={importAction}>
                <input type="hidden" name="rows" value={payload} />
                <Button type="submit" disabled={importPending}>
                  {importPending
                    ? "Import…"
                    : `Importer ${validCount} ligne${validCount > 1 ? "s" : ""}`}
                </Button>
              </form>
            ) : null}
          </div>
        </div>
      ) : null}

      {step === 3 ? (
        <div className="bg-surface-container-low rounded-2xl p-6">
          {imported.error ? (
            <p className="font-body-sm text-error">{imported.error}</p>
          ) : (
            <>
              <h2 className="font-headline-sm text-headline-sm text-primary-container">
                Import terminé
              </h2>
              <p className="font-body-sm text-body-sm text-on-surface-variant mt-2">
                {imported.imported ?? 0} offre
                {(imported.imported ?? 0) > 1 ? "s" : ""} créée
                {(imported.imported ?? 0) > 1 ? "s" : ""} ou mise
                {(imported.imported ?? 0) > 1 ? "s" : ""} à jour.{" "}
                {imported.skipped ?? 0} ligne
                {(imported.skipped ?? 0) > 1 ? "s" : ""} ignorée
                {(imported.skipped ?? 0) > 1 ? "s" : ""}.
              </p>
              {(imported.errors ?? []).length > 0 ? (
                <ul className="font-body-sm text-error mt-4 list-disc pl-5">
                  {imported.errors?.map((row) => (
                    <li key={row.line}>
                      Ligne {row.line} : {row.errors.join(" · ")}
                    </li>
                  ))}
                </ul>
              ) : null}
            </>
          )}
        </div>
      ) : null}
    </div>
  );
}

function StepChip({
  n,
  label,
  active,
  done,
}: {
  n: number;
  label: string;
  active: boolean;
  done: boolean;
}) {
  return (
    <li
      className={cn(
        "inline-flex items-center rounded-full px-3 py-1 font-bold",
        active
          ? "bg-primary-container text-on-primary shadow-navy-soft"
          : done
            ? "bg-tertiary-fixed text-on-tertiary-container"
            : "bg-surface-container text-on-surface-variant",
      )}
    >
      {n}. {label}
    </li>
  );
}
