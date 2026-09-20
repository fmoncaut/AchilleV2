"use client";

import { useActionState } from "react";

import {
  importCsvAction,
  previewCsvAction,
  type CsvImportState,
  type CsvPreviewState,
} from "@/app/admin/actions";
import { Button } from "@/components/ui/button";

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
      <ol className="text-slate flex gap-4 text-sm font-semibold">
        <li className={step === 1 ? "text-orange" : "text-navy"}>1. Upload</li>
        <li className={step === 2 ? "text-orange" : undefined}>2. Validation</li>
        <li className={step === 3 ? "text-orange" : undefined}>3. Import</li>
      </ol>

      {step === 1 ? (
        <form action={previewAction} className="flex flex-col gap-4">
          <label className="text-navy flex flex-col gap-2 text-sm font-semibold">
            Fichier CSV
            <input
              type="file"
              name="file"
              accept=".csv,text/csv"
              required
              className="border-border rounded-xl border px-3 py-2 font-medium"
            />
          </label>
          <p className="text-slate text-sm">
            Colonnes : ean, nom, categorie, prix_remise, prix_reference, tva,
            stock, condition, pos, merchant_url. Modèle :{" "}
            <a
              href="/exemples/offres-import.csv"
              className="text-navy font-semibold underline-offset-4 hover:underline"
            >
              offres-import.csv
            </a>
            .
          </p>
          <Button
            type="submit"
            disabled={previewPending}
            className="bg-orange text-navy h-11 w-fit rounded-xl px-6 font-bold"
          >
            {previewPending ? "Analyse…" : "Valider le fichier"}
          </Button>
        </form>
      ) : null}

      {step === 2 ? (
        <div className="flex flex-col gap-4">
          {preview.error ? (
            <p className="bg-destructive/10 text-destructive rounded-xl px-3 py-2 text-sm">
              {preview.error}
            </p>
          ) : (
            <p className="text-navy text-sm font-medium">
              {validCount} ligne{validCount > 1 ? "s" : ""} valide
              {validCount > 1 ? "s" : ""} · {invalidCount} en erreur. Les
              erreurs n’empêchent pas l’import des lignes valides.
            </p>
          )}
          {rows.length > 0 ? (
            <div className="ring-border overflow-x-auto rounded-2xl ring-1">
              <table className="w-full min-w-[40rem] text-left text-sm">
                <thead className="bg-muted text-navy">
                  <tr>
                    <th className="px-3 py-2">Ligne</th>
                    <th className="px-3 py-2">EAN</th>
                    <th className="px-3 py-2">Nom</th>
                    <th className="px-3 py-2">Statut</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={row.line} className="border-border border-t">
                      <td className="px-3 py-2">{row.line}</td>
                      <td className="px-3 py-2">{row.raw.ean}</td>
                      <td className="px-3 py-2">{row.raw.nom}</td>
                      <td className="px-3 py-2">
                        {row.ok ? (
                          <span className="text-navy font-semibold">OK</span>
                        ) : (
                          <span className="text-destructive font-medium">
                            {row.errors.join(" · ")}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
          <div className="flex flex-wrap gap-3">
            {validCount > 0 ? (
              <form action={importAction}>
                <input type="hidden" name="rows" value={payload} />
                <Button
                  type="submit"
                  disabled={importPending}
                  className="bg-orange text-navy h-11 rounded-xl px-6 font-bold"
                >
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
        <div className="bg-card ring-border rounded-2xl p-6 ring-1">
          {imported.error ? (
            <p className="text-destructive text-sm font-medium">{imported.error}</p>
          ) : (
            <>
              <h2 className="text-navy text-xl font-bold">Import terminé</h2>
              <p className="text-slate mt-2 text-sm font-medium">
                {imported.imported ?? 0} offre
                {(imported.imported ?? 0) > 1 ? "s" : ""} créée
                {(imported.imported ?? 0) > 1 ? "s" : ""} ou mise
                {(imported.imported ?? 0) > 1 ? "s" : ""} à jour.{" "}
                {imported.skipped ?? 0} ligne
                {(imported.skipped ?? 0) > 1 ? "s" : ""} ignorée
                {(imported.skipped ?? 0) > 1 ? "s" : ""}.
              </p>
              {(imported.errors ?? []).length > 0 ? (
                <ul className="text-destructive mt-4 list-disc pl-5 text-sm">
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
