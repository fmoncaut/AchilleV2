# Akwire — Design system

Source de vérité pour l'apparence d'Akwire. Les tokens sont câblés dans Tailwind v4
(`@theme` de `app/globals.css`). Il n'y a pas de `tailwind.config`. Les primitives
sont dans `components/ui/` (`components/ui/README.md`).

`design/stitch/` (dont `design/stitch/pro/`) est une **référence de parcours** :
structure des écrans, pas les couleurs, pas les polices, pas les images
`lh3.googleusercontent.com`, pas le CDN Tailwind des maquettes.

## Marque

- Nom : Akwire. Wordmark en bas-de-casse, Space Grotesk 600 (`.brand-wordmark`).
- Logo : `public/brand/akwire-mark.svg`, `public/brand/akwire-mark-mono.svg`. Ne pas redessiner.
- Ton : français, direct. Vouvoiement partout (interface, e-mails, back-office, pages légales).

## Palette

| Nom | Hex | Rôle |
| --- | --- | --- |
| Encre | `#13263F` | Titres, surfaces fortes, navigation, CTA secondaire |
| Ambre | `#F7A325` | CTA primaire, pastille promo, badge `-XX %`, pin actif |
| Crème | `#F6F5F1` | Fond de page |
| Nuit | `#0E1C2E` | Texte courant, hover des surfaces Encre |

L'ambre `#F7A325` n'est jamais une couleur de texte, d'icône seule ou de focus sur fond clair.
Le texte sur un fond ambre est Encre. Le prix remisé est Encre, gras ; l'ambre porte
le badge. Les cartes d'offre (`OfferCard`) et la fiche offre suivent cette règle.
Le tunnel reste en `text-secondary` pour la Vague 4.

## Contrastes (WCAG 2.2, mesurés)

| Premier plan | Fond | Ratio | Verdict |
| --- | --- | --- | --- |
| Ambre `#F7A325` | Crème `#F6F5F1` | 1,88 | Interdit en texte, icône seule, focus |
| Ambre `#F7A325` | Blanc | 2,05 | Interdit, même motif |
| Encre `#13263F` | Ambre `#F7A325` | 7,42 | Texte des CTA ambre |
| Ambre `#F7A325` | Encre `#13263F` | 7,42 | Accent sur surface Encre ou Nuit |
| Encre `#13263F` | Crème | 13,98 | Titres |
| Nuit `#0E1C2E` | Crème | 15,72 | Texte courant |
| Blanc | Encre | 15,25 | Texte sur surface Encre |
| Ambre foncé `#8A5300` | Crème / blanc | 5,80 / 6,33 | Seule teinte ambre autorisée en texte sur fond clair |
| Gris texte `#4A5361` | Crème | 7,13 | Texte secondaire |
| Vert `#1F7A55` | Crème / blanc | 4,84 / 5,29 | « Ouvert », « Vérifié » |
| Bordure `#6E7784` | Crème / blanc | 4,15 / 4,53 | Contour de champ (≥ 3:1) |
| Texte sur Encre `#B7C2CE` | Encre | 8,44 | Secondaire sur surface Encre |
| Erreur `#B3261E` | Crème | 5,99 | Message d'erreur |

Focus : anneau Encre 2 px, décalage 2 px, sur fond clair. Anneau ambre sur fond Encre ou Nuit.

## Correspondance Material 3 → Akwire

Les classes (`bg-surface`, `text-on-surface`, `bg-primary-container`, `bg-secondary-container`…)
ne sont pas renommées. Seules les valeurs de `@theme` changent.

| Token | Avant (Achille) | Après (Akwire) | Note |
| --- | --- | --- | --- |
| `surface`, `background` | `#F8F9FC` | `#F6F5F1` | Crème |
| `surface-dim` | `#D8DADD` | `#C9C6BD` | |
| `surface-container-lowest` | `#FFFFFF` | `#FFFFFF` | Cartes, champs |
| `surface-container-low` | `#F2F4F7` | `#EFEDE7` | |
| `surface-container` | `#ECEEF1` | `#E8E6DF` | |
| `surface-container-high` | `#E6E8EB` | `#E1DED6` | |
| `surface-container-highest`, `surface-variant` | `#E0E3E6` | `#D9D6CD` | |
| `on-surface` | `#191C1E` | `#0E1C2E` | Nuit |
| `on-surface-variant` | `#43474D` | `#4A5361` | |
| `outline` | `#73777E` | `#6E7784` | ≥ 3:1 sur Crème |
| `outline-variant` | `#C3C7CE` | `#D9D6CD` | Bordure de carte |
| `inverse-surface` | `#2D3133` | `#0E1C2E` | |
| `inverse-on-surface` | `#EFF1F4` | `#F6F5F1` | |
| `primary` | `#001020` | `#0E1C2E` | Hover des surfaces Encre |
| `on-primary` | `#FFFFFF` | `#FFFFFF` | |
| `primary-container` | `#002642` | `#13263F` | Encre |
| `on-primary-container` | `#708EAF` | `#B7C2CE` | 8,44:1 sur Encre |
| `secondary` | `#8A5100` | `#8A5300` | Texte ambre sur fond clair |
| `on-secondary` | `#FFFFFF` | `#FFFFFF` | |
| `secondary-container` | `#FE9800` | `#F7A325` | Ambre. Fond, jamais texte sur clair |
| `on-secondary-container` | `#643900` | `#13263F` | Texte sur ambre |
| `secondary-fixed` | `#FFDCBD` | `#FDECC8` | Bandeau promo |
| `on-tertiary-container` | `#2F9D70` | `#1F7A55` | « Ouvert » |
| `error` | `#BA1A1A` | `#B3261E` | |
| `error-container` | `#FFDAD6` | `#F9DEDC` | |
| `on-error-container` | `#93000A` | `#8C1D18` | |

Pas de seconde nomenclature (`ink-500`, `brand-amber`). Pas de mode sombre : le bloc `.dark` est retiré.

Ombres, teintées Encre : `--shadow-sm` (`0 1px 2px rgb(19 38 63 / .06)`) et `--shadow-md` (`0 6px 20px rgb(19 38 63 / .08)`). Elles remplacent `--shadow-navy` et `--shadow-navy-soft`.

Empilement : `z-header` 40, `z-overlay` 45, `z-drawer` 50, `z-modal` 60, `z-toast` 70, `z-consent` 80.

Rayons : `full` pour chips, pills, badges et boutons ; `2xl` (16 px) pour cartes et drawers ; `xl` (12 px) pour champs et petites cartes. Conteneur de page : `max-w-page` (1680 px).

## Typographie

Space Grotesk uniquement (400/500/600/700), auto-hébergée via `@fontsource/space-grotesk` et `next/font/local`. `--font-display`, `--font-body`, `--font-sans` et `--font-heading` pointent tous vers `--font-space-grotesk`.

Material Symbols Outlined reste la police d'icônes (auto-hébergée).

| Nom | Taille / interligne | Graisse |
| --- | --- | --- |
| display | 48 / 56 | 700 |
| display-mobile | 34 / 40 | 700 |
| headline-lg | 32 / 38 | 700 |
| headline-lg-mobile | 26 / 32 | 700 |
| headline-md | 24 / 30 | 600 |
| headline-sm | 20 / 26 | 600 |
| price-hero | 28 / 32 | 700 |
| price-card | 20 / 24 | 700 |
| body-lg | 18 / 28 | 400 |
| body-md | 16 / 24 | 400 |
| body-sm | 13 / 18 | 400 |
| label-lg | 14 / 20 | 600 |
| label-md | 12 / 16 | 600 |
| label-xs | 12 / 16 | 600 |

`label-xs` ne descend pas sous 12 px. Le corps par défaut est 16/24, graisse 400. Les champs de saisie sont au minimum en 16 px (Safari iOS).

Exception : le compteur d’un pin de carte (`components/map/offers-map.tsx`) reste en 10 px, sur une pastille de 20 px. Ce n’est pas une cible : le pin fait 44 px. Le chiffre est Encre sur Ambre (7,42:1).

## Motifs

- CTA primaire : fond ambre, texte Encre, pilule, hauteur ≥ 44 px.
- CTA secondaire : fond Encre, texte blanc.
- Badge `-XX %` : fond ambre, texte Encre.
- « Ouvert » : `#1F7A55`.
- Carte : fond blanc, bordure `outline-variant`, rayon `2xl`, ombre `sm`.
- Prix barré : gris texte, `line-through`, libellé accessible « Prix habituel ».
