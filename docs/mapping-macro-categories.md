# Mapping macro-catégories (intérêts) ↔ 16 familles

Source de vérité produit pour la migration d’alignement.  
Les 12 macros alimentent l’onboarding (`UserInterest`) et le rattachement optionnel `Category.macroId`.

## Les 12 InterestCategory

| code | name | displayOrder | Familles racines (défaut) |
| --- | --- | ---: | --- |
| M01 | Alimentation & Boissons | 1 | FOOD, VINS |
| M02 | High-Tech & Multimédia | 2 | TECH |
| M03 | Électroménager | 3 | ELECTRO |
| M04 | Maison : Meubles & Décoration | 4 | MEUBLES, DECO |
| M05 | Bricolage & Travaux | 5 | BRICO |
| M06 | Jardin & Animalerie | 6 | JARDIN, ANIMALERIE |
| M07 | Bébé & Puériculture | 7 | PUERICULTURE |
| M08 | Jouets, Jeux & Loisirs créatifs | 8 | JOUET, ARTS CREATIFS |
| M09 | Mode & Accessoires | 9 | MODE |
| M10 | Sport | 10 | SPORT |
| M11 | Beauté, Santé & Bien-être | 11 | BEAUTE |
| M12 | Auto-Moto | 12 | AUTO MOTO |

## Overrides sous-famille (reclassement)

Confirmés sur staging (`bwljfjzai3tw8itz8ilf`, 1904 catégories) — parent = racine famille.

| Famille | Nom | Macro | `legacyCategoryCode` | `id` |
| --- | --- | --- | --- | --- |
| JOUET | High Tech | M02 | `JOUET::220000000` | `cmujsz1dp01xtu0402im6ku10` |
| VINS | Objets et Accessoires | M04 | `VINS::204000000` | `cmujsz3kx02xhu040phfdi429` |
| JARDIN | Jeux et équipements | M08 | `JARDIN::154000000` | `cmujsz0wl01qbu04035cmmqax` |

Les `id` cuid varient entre bases ; le seed d’alignement doit cibler **`legacyCategoryCode`** (stable), pas l’id.

Seed idempotent : `npx tsx scripts/seed-interest-macros.ts`  
(`lib/categories/seed-interest-macros.ts` — boucle `ROOT::*` puis boucle overrides `{FAMILLE}::*`).

Contrôle jetable : `MACRO_ALIGN_DATABASE=… npx tsx scripts/verify-interest-macros.ts`  
Résolution runtime : `lib/categories/resolve-macro.ts`.

## Résolution du macro par héritage

`Category.macroId` est nullable à **tout** niveau. Un nœud sans `macroId` hérite de l’ancêtre le plus proche qui en a un (remontée `parentId`).

- Pose seed : les 16 `ROOT::*` reçoivent le macro de la table ci-dessus.
- Les 3 overrides reçoivent un `macroId` explicite (différent de la racine).
- Lib applicative (pas de vue SQL obligatoire en V1) : `resolveCategoryMacro(categoryId)` — walk ascendant jusqu’à trouver `macroId`, sinon `null`.
- Option SQL (lecture seule, hors Prisma) : CTE récursive pour les listes vitrine / filtres bulk.

```ts
// Pseudocode — lib/categories/resolve-macro.ts
async function resolveCategoryMacro(categoryId: string): Promise<InterestCategory | null> {
  let current = await loadCategory(categoryId); // { macroId, parentId, macro? }
  while (current) {
    if (current.macroId) return current.macro ?? await loadMacro(current.macroId);
    if (!current.parentId) return null;
    current = await loadCategory(current.parentId);
  }
  return null;
}
```

Pour un `Offer` : résoudre via `offer.reconciledCategoryId` puis, à défaut, `offer.product.categoryId`.

## Offer.condition (inchangé au schéma)

Reste sur `Offer` (`ProductCondition`, défaut `NEUF`).

- Affiliation : parseur ← colonne `condition` du flux si présente (Effiliation « occasion »), sinon `NEUF`.
- Direct : saisie marchand (écrans volet direct — hors de cette migration).
