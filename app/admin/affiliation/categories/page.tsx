import Link from "next/link";

import {
  assignCategoryAction,
  assignCategoryGroupAction,
} from "@/app/admin/affiliation/actions";
import { CategoryPicker } from "@/components/admin/category-picker";
import {
  AdminKicker,
  AdminMain,
  AdminTable,
  AdminTh,
  AdminThead,
  adminFieldClass,
} from "@/components/admin/admin-shell";
import { Button } from "@/components/ui/button";
import { requireSuperAdmin } from "@/lib/admin/actor";
import {
  groupExternalCategories,
  listExternalCategoryValues,
  valuesInGroup,
} from "@/lib/affiliation-feed/queues";
import { prisma } from "@/lib/db";
import type { AffiliationNetwork } from "@prisma/client";

export const metadata = {
  title: "Catégories d'affiliation | Back-office Akwire",
};

const NETWORKS: AffiliationNetwork[] = [
  "KWANKO",
  "TRADEDOUBLER",
  "AWIN",
  "AFFILAE",
  "EFFILIATION",
];

function readNetwork(value: string | string[] | undefined): AffiliationNetwork | undefined {
  const raw = Array.isArray(value) ? value[0] : value;
  return NETWORKS.find((network) => network === raw);
}

function readText(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}

export default async function AffiliationCategoriesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireSuperAdmin();
  const params = await searchParams;
  const network = readNetwork(params.network);
  const group = readText(params.group);
  const values = await listExternalCategoryValues(network);
  const groups = groupExternalCategories(values);
  const detail = network && group ? valuesInGroup(values.filter((value) => value.network === network), group) : [];
  const codes = detail.map((value) => value.raw).filter((raw) => /^\d+$/.test(raw));
  const [categories, googleMatches] = await Promise.all([
    prisma.category.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true, googleCategoryCode: true },
    }),
    codes.length === 0
      ? Promise.resolve([])
      : prisma.category.findMany({
          where: { googleCategoryCode: { in: codes } },
          select: { id: true, name: true, googleCategoryCode: true },
          orderBy: { name: "asc" },
        }),
  ]);
  const options = categories.map((category) => ({ id: category.id, name: category.name }));

  return (
    <AdminMain>
      <div>
        <AdminKicker>Console Akwire</AdminKicker>
        <h1 className="font-headline-lg text-headline-lg-mobile sm:text-headline-lg text-primary-container mt-1 tracking-tight">
          Catégories d&apos;affiliation
        </h1>
        <p className="font-body-md text-body-md text-on-surface-variant mt-2">
          Une décision par valeur exacte. Le premier segment regroupe les chemins ;
          s&apos;il est identique partout, le groupe est le segment suivant.
        </p>
      </div>
      <form className="flex flex-wrap gap-2" method="get">
        <select className={adminFieldClass} name="network" defaultValue={network ?? ""}>
          <option value="">Tous les réseaux</option>
          {NETWORKS.map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </select>
        <Button type="submit" variant="secondary">
          Filtrer
        </Button>
      </form>
      {detail.length > 0 && network ? (
        <section className="flex flex-col gap-4">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <h2 className="text-primary-container text-xl font-bold">
              {network} · {group || "Catégorie absente"}
            </h2>
            <Button asChild variant="ghost">
              <Link href={network ? `/admin/affiliation/categories?network=${network}` : "/admin/affiliation/categories"}>
                Retour aux groupes
              </Link>
            </Button>
          </div>
          <form action={assignCategoryGroupAction} className="flex flex-wrap items-end gap-3">
            <input type="hidden" name="network" value={network} />
            <input type="hidden" name="group" value={group} />
            <CategoryPicker categories={options} candidates={[]} />
            <Button type="submit">Appliquer à tout le groupe</Button>
          </form>
          <AdminTable caption="Valeurs du groupe">
            <AdminThead>
              <tr>
                <AdminTh className="px-4 py-3">Valeur</AdminTh>
                <AdminTh className="px-4 py-3">Lignes</AdminTh>
                <AdminTh className="px-4 py-3">Décision</AdminTh>
              </tr>
            </AdminThead>
            <tbody>
              {detail.map((value) => {
                const candidates = googleMatches.filter(
                  (category) => category.googleCategoryCode === value.raw,
                );
                return (
                  <tr key={value.raw} className="border-surface-container-high border-t">
                    <td className="px-4 py-3 align-top">
                      <p className="font-body-md text-body-md text-primary-container font-bold">
                        {value.raw || "Catégorie absente"}
                      </p>
                      {value.sampleLabel ? (
                        <p className="font-body-sm text-body-sm text-on-surface-variant">
                          {value.sampleLabel}
                        </p>
                      ) : null}
                    </td>
                    <td className="font-body-md text-body-md text-primary-container px-4 py-3 align-top font-bold">
                      {value.lines}
                    </td>
                    <td className="px-4 py-3">
                      <form action={assignCategoryAction} className="flex flex-wrap items-end gap-2">
                        <input type="hidden" name="network" value={network} />
                        <input type="hidden" name="raw" value={value.raw} />
                        <CategoryPicker
                          categories={options}
                          candidates={candidates}
                          defaultId={value.categoryId}
                        />
                        <Button type="submit">
                          Enregistrer
                        </Button>
                        <Button type="submit" name="unclassified" value="1" variant="outline">
                          Non classé
                        </Button>
                      </form>
                      {value.decided ? (
                        <p className="font-body-sm text-body-sm text-on-surface-variant mt-1">
                          {value.categoryName ?? "Non classé"}
                        </p>
                      ) : (
                        <p className="font-body-sm text-body-sm text-on-surface-variant mt-1">À traiter</p>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </AdminTable>
        </section>
      ) : (
        <AdminTable caption="Groupes de catégories">
          <AdminThead>
            <tr>
              <AdminTh className="px-4 py-3">Réseau</AdminTh>
              <AdminTh className="px-4 py-3">Groupe</AdminTh>
              <AdminTh className="px-4 py-3">Valeurs</AdminTh>
              <AdminTh className="px-4 py-3">Lignes</AdminTh>
              <AdminTh className="px-4 py-3">Ouvertes</AdminTh>
            </tr>
          </AdminThead>
          <tbody>
            {groups.length === 0 ? (
              <tr>
                <td className="font-body-md text-body-md text-on-surface-variant px-4 py-6" colSpan={5}>
                  Aucune catégorie externe importée.
                </td>
              </tr>
            ) : (
              groups.map((item) => (
                <tr
                  key={`${item.network}-${item.label}`}
                  className="border-surface-container-high border-t"
                >
                  <td className="font-body-sm text-body-sm px-4 py-3">{item.network}</td>
                  <td className="px-4 py-3">
                    <Link
                      className="font-body-md text-body-md text-primary-container inline-flex min-h-11 items-center font-bold underline"
                      href={`/admin/affiliation/categories?network=${item.network}&group=${encodeURIComponent(item.label)}`}
                    >
                      {item.label || "Catégorie absente"}
                    </Link>
                  </td>
                  <td className="font-body-md text-body-md text-primary-container px-4 py-3 font-bold">
                    {item.values}
                  </td>
                  <td className="font-body-md text-body-md text-primary-container px-4 py-3 font-bold">
                    {item.lines}
                  </td>
                  <td className="font-body-md text-body-md text-primary-container px-4 py-3 font-bold">
                    {item.open}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </AdminTable>
      )}
    </AdminMain>
  );
}
