# PROMPT 00-6 — Refonte Design/UX Akwire (PoC → produit d'entreprise)

> **Usage dans Cursor.** Ouvrir en mode Agent, joindre ce fichier (`@docs/prompts/00-6-refonte-design-ux.md`)
> puis lancer **une vague à la fois** avec le bloc « Démarrage d'une vague » en fin de document.
> Ce prompt **prime sur** `.cursor/rules/achille.mdc` et `docs/design-system.md` pour tout ce qui
> touche à l'identité visuelle et au périmètre fonctionnel. Ces deux fichiers sont obsolètes et sont
> mis à jour en Vague 0 (voir §8).

---

## 1. RÔLE

Tu es **Lead Product Designer (UX/UI) et développeur front-end senior**, spécialisé dans les
**places de marché B2B2C** et le e-commerce local. Tu sais rendre des **données denses lisibles**
(prix, remise, distance, stock, horaires, statut de retrait) avec une **esthétique haut de gamme** :
clean UI, minimalisme, usage instinctif.

Ton rôle est double :

1. **Penser le design** : hiérarchie visuelle, parcours, états, micro-interactions, système.
2. **L'implémenter** dans ce dépôt (Next.js 16 / React 19 / TypeScript / Tailwind v4 / shadcn),
   **sans aucune régression fonctionnelle**.

Tu travailles **dans le code existant**. Tu lis avant d'écrire. Tu ne supposes rien que tu peux
vérifier dans le dépôt.

---

## 2. CONTEXTE PRODUIT

**Akwire** (ex-Achille, dépôt `AchilleV2`) est une marketplace B2B2C française de bonnes affaires
locales : l'acheteur découvre des offres **en promotion** dans les magasins physiques autour de lui.

Deux modes de conversion coexistent. **Les deux doivent rester fonctionnels** :

| Mode | Parcours | Composants | Règle |
| --- | --- | --- | --- |
| **Affiliation** | Fiche offre → « Voir chez le marchand » → `GET /api/out/[offerId]?pos=…` → 302 + cookie `anonId` | `components/merchant-cta.tsx` | Le lien de sortie et ses paramètres ne changent pas. |
| **Direct (Click & Collect)** | Panier mono-magasin → empreinte bancaire Stripe (Payment Element, 3DS) → retrait en magasin sous 48 h → PickupPass (QR + code) → facture au statut `PICKED_UP` | `components/reserve-button.tsx`, `components/reservation/*`, `app/reservation/**` | Réservation **désactivée** si l'enseigne n'encaisse pas (correctif C6). |

- **Positionnement** : souverain (Clever Cloud Paris, Scaleway, Brevo, fond carto IGN), « promos
  uniquement » (prix barré > prix vendu).
- **Audiences** : grand public FR (acheteurs) + marchands retail et superadmin (back-office `/admin`).
- **Données réelles** : 10 548 POS, 1 904 catégories, 12 macro-catégories, catalogue actif.
- **État** : staging (`https://staging.akwire.fr`) + production en soft-launch, **fonctionnellement
  validés de bout en bout**.
- **Phase** : revue QA/UX avant ouverture au public. Gate de validation : **Fabrice**.

### Problème

Le rendu actuel vient d'une maquette PoC générée sous Google Stitch (`design/stitch/`, tokens
Material 3, navy `#002642` / orange `#FE9800`, Bricolage Grotesque + Manrope). Il est fade, peu
lisible, sans identité. Le rebrand Akwire (commit `39b9eae`) n'a changé que le wordmark, le logo et
`themeColor`. **Tout le reste porte encore la peau Achille.**

Objectif : passer à un **rendu produit d'entreprise** cohérent avec le positionnement haut de gamme
et souverain, **en ne changeant que la peau** (CSS, composants de présentation, mise en page,
micro-interactions).

---

## 3. ÉTAT TECHNIQUE RÉEL DU DÉPÔT (à lire avant toute modification)

### Stack effective

| Élément | Valeur réelle | Conséquence |
| --- | --- | --- |
| Next.js | **16.3.5** (App Router, `proxy.ts` à la racine, pas `middleware.ts`) | Server Components par défaut, `"use client"` seulement si nécessaire. |
| React | 19.2 | |
| Tailwind | **v4** via `@tailwindcss/postcss` | **Il n'y a pas de `tailwind.config.*`.** Tous les tokens vivent dans `@theme` de `app/globals.css`. N'en crée pas. |
| shadcn | `components.json` style `radix-nova`, paquet unifié `radix-ui`, `class-variance-authority`, `tw-animate-css` | Les primitives se génèrent avec `npx shadcn add <x>` puis se **re-tokenisent**. |
| Icônes | **Material Symbols Outlined** auto-hébergé (`app/fonts/material-symbols-outlined.woff2`) via `components/material-icon.tsx` (21 fichiers) | `lucide-react` est installé mais **utilisé nulle part**. Garde Material Symbols. Si shadcn génère des imports lucide, remplace-les par `MaterialIcon`. |
| Polices | `lib/fonts.ts` : Bricolage (titres), Manrope (corps), Space Grotesk (wordmark uniquement, via `next/font/google`) | À basculer sur Space Grotesk seul (§5.2). |
| `cn` | `@/lib/utils` (ré-exporte le paquet `cn`) | Importer `cn` depuis `@/lib/utils` partout (`components/ui/button.tsx` importe encore `"cn"` en direct). |
| Carte | `maplibre-gl` 4.7.1, UMD auto-hébergé dans `public/maplibre/`, fond IGN | **Ne pas toucher** au chargement, au style, au worker. |
| Paiement | `@stripe/react-stripe-js`, Payment Element dans `components/reservation/reservation-payment.tsx` | Seul l'objet `appearance` peut changer (§5.6). |
| Captures | `npm run capture:staging` / `capture:prod` (`scripts/capture-screens.ts`, Playwright) | Sortie `screenshots/<env>/<desktop\|mobile>/<slug>.png` (1440 et 390 px), gitignorée. |

### Inventaire des routes (périmètre de la refonte)

```
Public       /  /recherche (?vue=carte)  /offre/[slug]  /magasin/[slug]  /[ville]/[categorie]
             /cgu  /confidentialite  /mentions-legales  /offline  not-found
Auth         /login  /login/otp  /login/envoye  /compte/onboarding
Compte       /compte  /compte/favoris  /compte/reservations  /compte/reservations/[id]
             /compte/reservations/[id]/facture  /compte/reglages{,/profil,/interets,/notifications,/compte}
Tunnel C&C   /reservation (panier)  /reservation/retrait (paiement)  /reservation/confirmation
Admin        /admin/**  (magasins, mes-magasins, enseignes, offres, reservations, paiements,
             vendeurs, brokers, renvois, affiliation/{runs,en-attente,produits,categories})
Générés      app/opengraph-image.tsx  app/icon-192  app/icon-512  app/icon.svg  app/manifest.ts
```

### Composants existants (à restyler, pas à réécrire)

- **Shell** : `components/site-header.tsx` (Server Component, lit la session et le compteur panier),
  `components/site-footer.tsx`, `components/brand-lockup.tsx`, `components/buyer/shell.tsx`
  (`BuyerMain`, `BuyerSection`, conteneur `max-w-[1680px]`), `components/buyer/breadcrumb.tsx`,
  `components/consent-banner.tsx`, `components/utility-page.tsx`, `components/legal-page.tsx`.
- **Métier atomique** : `price-tag.tsx`, `discount-badge.tsx`, `open-badge.tsx`, `opening-hours.tsx`,
  `distance.tsx`, `product-image.tsx`, `favorite-button.tsx`, `merchant-cta.tsx`, `reserve-button.tsx`.
- **Cartes offre — doublon à unifier** : `components/offer-card.tsx` et
  `components/home/deal-card.tsx`. Une seule `OfferCard` avec variantes (`grid`, `compact`, `drawer`)
  à la fin de la Vague 2. Vérifier chaque usage (`app/page.tsx`, `app/recherche/page.tsx`,
  `components/catalog/*`, `components/map/*`) avant de supprimer quoi que ce soit.
- **États vides — doublon** : `components/search/empty-state.tsx` et `components/utility-page.tsx`
  → une primitive `EmptyState`.
- **Fichiers trop longs à découper (présentation uniquement)** : `app/page.tsx` (568 lignes),
  `app/recherche/page.tsx` (453), `components/catalog/offer-showcase.tsx` (449),
  `components/search/search-form.tsx` (425), `components/map/offers-map.tsx` (382).
- **Primitives UI** : seul `components/ui/button.tsx` existe.

### Dettes constatées

1. **Aucun `loading.tsx`, `error.tsx` ni `global-error.tsx`** dans `app/`. Aucun skeleton.
2. **Couleurs en dur** hors tokens :
   - `components/map/offers-map.tsx` l. 94–128 et 259–274 : pins et popup en `#002642`, `#FE9800`,
     `#E6E8EC`, `#191C1E`, `#3D4948`, ombre `rgba(0,38,66,…)`.
   - `components/map/pos-drawer.tsx` l. 60 : overlay `bg-[#002642]/25`.
   - `components/reservation/reservation-payment.tsx` l. 83–85 : Stripe `colorPrimary: "#002642"`,
     `fontFamily: "Manrope"`.
   - Acceptés (assets de marque) : `brand-lockup.tsx`, `app/icon-*`, `app/opengraph-image.tsx`,
     `app/layout.tsx` (`themeColor`).
3. **79 valeurs arbitraires** Tailwind (`[…px]`, `[#…]`, `[rgb…]`) dans `app/` et `components/`.
4. **Ombres et focus** teintés de l'ancien navy (`--shadow-navy*`, `:focus-visible` orange).
5. **Alias legacy** `--color-navy`, `--color-navy-2`, `--color-orange`, `--color-slate`,
   `--color-paper` : 0 usage, à supprimer.
6. **E-mails** en HTML brut dans le code : OTP dans `lib/auth-email.ts` (`buildOtpMailContent`),
   notifications réservation dans `lib/notifications/email.ts`, messagerie dans
   `lib/messages/service.ts`. Aucun gabarit commun.
7. **« Achille » restant** : aucun dans l'UI acheteur. Restes : sujet d'e-mail admin
   `lib/admin/merchant-pos.ts:363` (`[Achille] Géocodage…`) à corriger ; User-Agents
   (`lib/geocode.ts`, `lib/affiliation-feed/refresh.ts`) et `package.json#name` hors périmètre UI,
   ne pas toucher sans demande.
8. **Pas de dictionnaire i18n** : la copie est écrite dans les composants. Ne lance pas
   d'extraction i18n dans cette refonte (§6).

---

## 4. CE QUI NE BOUGE PAS (zéro régression)

Intouchables. Si une amélioration UX semble l'exiger, **arrête-toi et signale-le** au lieu de coder :

- **Routes, URLs, query params** (`lieu`, `rayon`, `vue`, `pos`, `q`, `categorie`, tri…) et
  `generateMetadata`, `sitemap.ts`, `robots.ts`.
- **`app/api/**`**, **Server Actions** (`"use server"`), leurs signatures, les attributs `name` des
  champs de formulaire, les `action=` et `formAction`.
- **`prisma/schema.prisma`** et migrations : aucune nouvelle migration.
- **`lib/**`** hors présentation : `geo.ts`, `catalog*.ts`, `feed/`, `reservations/`, `payments/`,
  `auth/`, `pos-visibility.ts`, `pos-publish.ts`, `affiliation*.ts`, `favorites.ts`. Tu peux
  **lire** ces fichiers, pas en modifier la logique.
- **Règles POS** : tri-état de publication, **R2 visible sur la carte mais non cliquable**,
  **R3 override manuel**. La règle d'affichage vient de `lib/pos-visibility.ts`
  (`publicPosWhere`, `mapInactivePosWhere`) ; le design ne fait que lui donner une apparence.
- **Règles métier visibles** déjà corrigées en audit (ne pas les casser en restylant) :
  - C2 : la fiche conserve `pos`, le lieu, le tri par distance et affiche les km.
  - C4 : quantité > stock → message « Il reste N en magasin », valeur ramenée au stock.
  - C5 : lieu non reconnu → H1 générique + message « Lieu introuvable ».
  - C6 : bouton de réservation désactivé + texte explicatif si l'enseigne n'encaisse pas.
  - D7 : bouton « Annuler » sur le dialogue de conflit de panier (panier mono-magasin).
  - Carte : centrage France par défaut ; tous les POS `ACTIVE_VISIBLE` affichés
    (`findActiveVisiblePosPins` dans `lib/geo.ts`), avec un état `active` (au moins une offre) ou
    `active_empty` (sans offre). Le design distingue ces deux états sans changer la requête.
- **Auth** : Auth.js, OTP e-mail (`/login/otp`), Google/Apple, CGU, opt-in `DEAL_ALERTS`.
- **Stripe** : création d'intention, capture, Connect, webhooks. Seule l'apparence du Payment Element change.
- **MapLibre** : version, UMD, worker, style IGN, `lib/map-config.ts`. Le **rendu HTML des pins et
  du popup** peut être recoloré par tokens, sans changer leur logique (sélection, cluster, clic).
- **SEO** : balisage sémantique (un seul `h1` par page), données structurées si présentes.

---

## 5. IDENTITÉ ET DESIGN SYSTEM CIBLE

### 5.1 Marque (verrouillée)

- **Nom** : Akwire. Wordmark en bas-de-casse, Space Grotesk 600 (classe `.brand-wordmark`).
- **Logo** : concept A (pin + pastille ambre). Assets : `public/brand/akwire-mark.svg`,
  `public/brand/akwire-mark-mono.svg`, `app/icon.svg`, `app/opengraph-image.tsx`,
  `components/brand-lockup.tsx`. Ne pas redessiner.
- **Palette** :

| Nom | Hex | Rôle |
| --- | --- | --- |
| Encre | `#13263F` | Primaire : titres, surfaces fortes, nav, CTA secondaire |
| Ambre | `#F7A325` | Accent : CTA primaire, pastilles promo, badges remise, pins |
| Crème | `#F6F5F1` | Fond de page |
| Nuit | `#0E1C2E` | Texte courant, surfaces sombres |

- **Ton** : français, direct, concret. Vouvoiement **ou** tutoiement : un seul partout.
  L'existant mélange les deux (« Bonnes affaires près de **chez toi** » / « Votre code Akwire ») :
  propose une règle en Vague 1 et fais-la valider avant de réécrire la copie.

### 5.2 Contraintes de contraste (mesurées, WCAG 2.2)

| Premier plan | Fond | Ratio | Verdict |
| --- | --- | --- | --- |
| Ambre `#F7A325` | Crème `#F6F5F1` | **1,88** | ❌ Interdit pour du texte, une icône seule ou un contour de focus |
| Ambre `#F7A325` | Blanc | **2,05** | ❌ Idem |
| Encre `#13263F` | Ambre `#F7A325` | 7,42 | ✅ Texte des CTA ambre = Encre (jamais blanc) |
| Ambre `#F7A325` | Encre `#13263F` | 7,42 | ✅ Accent ambre sur surfaces Encre |
| Encre `#13263F` | Crème | 13,98 | ✅ |
| Nuit `#0E1C2E` | Crème | 15,72 | ✅ Texte courant |
| Blanc | Encre | 15,25 | ✅ |
| Ambre foncé `#8A5300` | Crème / Blanc | 5,80 / 6,33 | ✅ **Seule teinte ambre autorisée en texte sur fond clair** |
| Gris texte `#4A5361` | Crème | 7,13 | ✅ Texte secondaire |
| Vert actuel `#2F9D70` | Blanc | **3,40** | ❌ À remplacer |
| Vert `#1F7A55` | Crème / Blanc | 4,84 / 5,29 | ✅ « Ouvert », « Vérifié » |

Conséquences :

- Le **prix remisé** est en **Encre** (ou Nuit), gras, grand. L'ambre porte le **badge `-XX %`**
  (fond ambre, texte Encre), pas le chiffre du prix.
- Le **prix barré** est en gris texte, `line-through`, taille inférieure, avec un libellé
  accessible (« Prix habituel »).
- Le **focus** est un anneau **Encre** de 2 px avec décalage de 2 px sur fond clair, **ambre** sur
  fond Encre/Nuit.

### 5.3 Tokens — stratégie

Les classes Material 3 (`bg-surface`, `text-on-surface`, `bg-primary-container`,
`bg-secondary-container`…) sont utilisées dans ~80 fichiers. **Ne les renomme pas.**

1. **Re-pointer les valeurs** dans `@theme` de `app/globals.css` vers la palette Akwire.
   Tout le site bascule sans toucher au JSX.
2. **Re-pointer les variables shadcn** (`:root` : `--background`, `--foreground`, `--primary`,
   `--ring`, `--border`…) sur les mêmes valeurs.
3. **Supprimer** les alias legacy (§3, dette 5) et le bloc `.dark` (pas de mode sombre dans cette
   refonte ; le laisser crée des écarts non testés).
4. Ne crée pas de seconde nomenclature parallèle (`ink-500`, `brand-amber`…). Si un rôle manque,
   ajoute **un rôle sémantique** (ex. `--color-promo`, `--color-success`) et documente-le.

Correspondance de départ (à ajuster en mesurant les contrastes, puis à documenter) :

| Token M3 | Avant | Après | Note |
| --- | --- | --- | --- |
| `surface`, `background` | `#F8F9FC` | `#F6F5F1` Crème | |
| `surface-container-lowest` | `#FFFFFF` | `#FFFFFF` | Cartes, champs |
| `surface-container-low` / `-container` / `-high` / `-highest` | gris bleutés | dérivés chauds de la Crème (ex. `#EFEDE7`, `#E8E6DF`, `#E1DED6`, `#D9D6CD`) | Dégradé de surfaces **sans** teinte bleue |
| `on-surface` | `#191C1E` | `#0E1C2E` Nuit | |
| `on-surface-variant` | `#43474D` | `#4A5361` | 7,13 sur Crème |
| `outline` / `outline-variant` | `#73777E` / `#C3C7CE` | à mesurer, ≥ 3:1 pour `outline` (bordure de champ) | |
| `primary` | `#001020` | `#0E1C2E` Nuit | Hover des surfaces Encre |
| `primary-container` | `#002642` | `#13263F` Encre | |
| `on-primary-container` | `#708EAF` | à mesurer, ≥ 4,5:1 sur Encre | |
| `secondary` | `#8A5100` | `#8A5300` Ambre foncé | Texte ambre sur clair |
| `secondary-container` | `#FE9800` | `#F7A325` Ambre | CTA primaire, badges |
| `on-secondary-container` | `#643900` | `#13263F` Encre | Texte sur ambre |
| `secondary-fixed` | `#FFDCBD` | teinte ambre très claire (fond de bandeau promo) | |
| `on-tertiary-container` | `#2F9D70` | `#1F7A55` | « Ouvert » |
| `error` | `#BA1A1A` | inchangé ou `#B3261E` (5,99 sur Crème) | |

### 5.4 Typographie

- **Space Grotesk partout** (titres, UI, corps, prix). Retirer Bricolage et Manrope de
  `lib/fonts.ts`, de `app/layout.tsx` et des dépendances `@fontsource/*` **une fois qu'il ne reste
  aucune référence**.
- Charger Space Grotesk **auto-hébergée** comme les autres : `@fontsource/space-grotesk`
  (400/500/600/700) via `next/font/local`, sur le modèle actuel de Bricolage. C'est la seule
  dépendance ajoutée par cette refonte. Cela supprime le téléchargement Google Fonts au build.
- `--font-display`, `--font-body`, `--font-sans`, `--font-heading` pointent tous sur
  `--font-space-grotesk` : les classes `font-display` / `font-body` existantes continuent de marcher.
- Échelle : conserver les **noms** (`display`, `headline-*`, `price-*`, `body-*`, `label-*`) et
  revoir les **valeurs**. Corps par défaut **16/24** (au lieu de 15/22) ; `label-xs` 10 px
  interdit pour une information utile (minimum 12 px). Graisse par défaut du `body` : 400
  (actuellement 500 forcé dans `@layer base`).
- **Champs de saisie ≥ 16 px** sur mobile (sinon Safari iOS zoome au focus).
- Prix : `tabular-nums` si la fonte le gère (vérifier), sinon ne pas l'imposer.

### 5.5 Espacements, rayons, ombres, mouvement, z-index

- **Grille 4/8** : réutiliser l'échelle Tailwind native (`1`=4 px…) ; les tokens
  `--spacing-space-*` existants sont conservés mais pas multipliés.
- **Rayons** : `full` pour chips, pills, badges et boutons ; `2xl` (16 px) pour cartes et drawers ;
  `xl` (12 px) pour champs et petites cartes. Pas d'autres valeurs.
- **Ombres** : deux niveaux maximum, teintés **Encre** à faible opacité (ex.
  `--shadow-sm: 0 1px 2px rgb(19 38 63 / .06)`, `--shadow-md: 0 6px 20px rgb(19 38 63 / .08)`).
  Remplacent `--shadow-navy*`. L'élévation passe d'abord par la bordure et la surface.
- **Mouvement** : 150–200 ms, `ease-out` ; respecter `prefers-reduced-motion` (déjà en place,
  à conserver). Pas de parallax, pas d'auto-play, pas d'animation au scroll.
- **z-index** : tokeniser (`header`, `drawer`, `overlay`, `modal`, `toast`, `consent`) au lieu
  des `z-40` / `z-50` épars. Vérifier l'empilement header / drawer carte / bannière cookies / modale.
- **Conteneur** : `BuyerSection` (`max-w-[1680px]`) → valeur tokenisée ; envisager une largeur de
  lecture plus étroite pour les pages texte (légal, compte).

### 5.6 Cas particuliers hors CSS

- **Stripe Payment Element** : `appearance.variables` sur les tokens (`colorPrimary` Encre,
  `colorText` Nuit, `colorBackground` blanc, `borderRadius` = rayon champ, `fontFamily`
  Space Grotesk). La police doit être fournie via l'option `fonts` d'`Elements` avec une **URL
  auto-hébergée** (`CustomFontSource`), jamais via `cssSrc` Google Fonts. Lire les valeurs depuis
  une constante partagée, pas en dur.
- **Pins MapLibre** (`offers-map.tsx`) : éléments HTML créés en JS, donc les classes Tailwind
  doivent exister au build. Remplacer `bg-[#002642]` etc. par des classes de tokens
  (`bg-primary-container`, `bg-secondary-container`, `text-on-secondary-container`) **ou** par
  `var(--color-…)` en style inline. Ne pas changer la logique de création, de clic ni de sélection.
  Pin **R2** : apparence clairement inactive (opacité, pas de curseur pointer, pas de focus) en
  cohérence avec `mapInactivePosWhere`.
- **E-mails** (OTP, réservation confirmée / prête / annulée) : créer un gabarit commun
  `lib/notifications/email-layout.ts` (HTML en tableaux, styles **inline**, largeur 600 px, logo
  en URL absolue, version texte conservée). Les fonctions qui construisent sujet, texte et contenu
  gardent leur signature ; seul l'habillage HTML change. Tester le rendu dans Gmail web et
  Apple Mail (dark mode inclus).

---

## 6. CONTRAINTES NON NÉGOCIABLES

- Zéro régression fonctionnelle (§4).
- **Pas de nouvelle lib UI** : Tailwind + shadcn/Radix déjà présents. Interdits : MUI, Chakra,
  Ant Design, DaisyUI, Framer Motion, bibliothèques d'animation ou d'icônes supplémentaires.
  Seul ajout autorisé : `@fontsource/space-grotesk`.
- **Aucune valeur en dur** dans un composant : couleur, ombre, rayon, z-index, taille de police.
  Exceptions listées en §3 (assets de marque). Une valeur arbitraire `[…]` restante doit être
  justifiée en commentaire.
- **Composants réutilisables** dans `components/ui/` (§7). Les composants métier
  (`price-tag`, `discount-badge`, `offer-card`…) **consomment** les primitives.
- **Accessibilité** : contraste 4,5:1 (texte) et 3:1 (UI, focus), focus visible, `aria-*`,
  navigation clavier complète, cibles ≥ 44×44 px, un `h1` par page, `lang="fr"` conservé.
- **Performance** : pas de dépendance lourde ; pas de régression LCP/CLS/INP. Les skeletons
  réservent la hauteur finale (pas de CLS). Les images gardent `next/image` avec `sizes`.
- **Server Components par défaut** : ne pas passer un composant en `"use client"` pour un hover
  ou une transition CSS.
- **Copie** : pas d'extraction i18n. Corriger la copie là où elle est. Les primitives prennent
  leur texte en props (pas de texte par défaut caché dans `EmptyState`, par exemple).
- **Pas de demi-rebrand** : un écran est livré entièrement dans la nouvelle peau ou pas du tout.
- **Ne supprime aucun composant** sans avoir listé ses usages (`rg "NomDuComposant"`).

---

## 7. PRIMITIVES UI À POSER (Vague 0)

Dans `components/ui/`. Générer via shadcn quand il existe une base (`npx shadcn add dialog sheet
input label skeleton sonner…`), puis **re-tokeniser** et remplacer les icônes lucide.

| Primitive | Base | Variantes / exigences |
| --- | --- | --- |
| `Button` | existant | `primary` (ambre, texte Encre), `secondary` (Encre, texte blanc), `outline`, `ghost`, `destructive`, `link` ; tailles avec **hauteur ≥ 44 px** sur mobile (`default` passe de `h-10` à `h-11`) ; état `loading` (spinner + `aria-busy`, largeur stable) |
| `Input`, `Textarea`, `Label`, `FieldError`, `FieldHint` | shadcn | 16 px min, état erreur relié par `aria-describedby`, `aria-invalid` |
| `OtpInput` | maison | 6 cases, collage, `autocomplete="one-time-code"`, `inputmode="numeric"` ; doit soumettre **le même champ `name`** que le formulaire actuel de `/login/otp` |
| `Card` | maison | surface blanche, bordure `outline-variant`, rayon 2xl, `interactive` (hover/focus sur toute la carte via un seul lien) |
| `Badge` | maison | `promo` (ambre/Encre), `success` (ouvert), `neutral`, `danger`, `info` |
| `Chip` / `Pill` | maison | sélectionnable (`aria-pressed`), scroll horizontal avec masque de bord, utilisé par les 12 macros + « Pour vous » et les rayons |
| `Dialog` (modale) | shadcn Radix | focus piégé, `Escape`, retour du focus ; sert au conflit de panier (D7) |
| `Sheet` (drawer) | shadcn Radix | bas sur mobile, côté sur desktop ; candidat pour `pos-drawer.tsx` **sans casser** la synchronisation avec la carte |
| `Toast` | `sonner` via shadcn | `aria-live="polite"` ; succès favori, erreur réseau |
| `Skeleton` | shadcn | dimensions réelles des cartes offre, de la fiche, des listes |
| `EmptyState` | fusion de `search/empty-state.tsx` + `utility-page.tsx` | icône, titre, texte, une action principale, une action secondaire optionnelle |
| `Price` | refonte de `price-tag.tsx` | prix vendu, prix barré, remise ; tailles `hero` / `card` ; lecture accessible (« 12,90 €, au lieu de 19,90 € ») |
| `Section`, `PageHeader` | refonte de `buyer/shell.tsx` | titre, sous-titre, actions, fil d'Ariane |
| `AppShell` | `layout.tsx` + header + footer | header collant, nav mobile, footer, zone toast, bannière cookies |

Documenter chaque primitive dans `components/ui/README.md` : rôle, props, variantes, exemple,
règles d'accessibilité, « à ne pas faire ».

---

## 8. MÉTHODE — PAR VAGUES

Chaque vague = une branche `design/<vague>` partant de `main` à jour, une PR, une validation
Fabrice. **Aucune vague ne démarre avant la validation de la précédente.**

### Vague 0 — Fondations (prérequis absolu) · branche `design/v0-design-system`

1. **Mettre à jour les règles qui contredisent ce prompt** :
   - `.cursor/rules/achille.mdc` : renommer en Akwire ; remplacer la section « Périmètre »
     (elle interdit panier et paiement alors que le C&C est en production) ; remplacer la section
     « Identité visuelle » par un renvoi vers `docs/design-system.md` et `components/ui/README.md`.
   - `docs/design-system.md` : réécrire avec les tokens Akwire, la table de contraste et la
     correspondance M3 → Akwire. Marquer `design/stitch/` comme **référence de parcours uniquement**
     (pas de couleurs, pas de polices).
2. **Tokens** dans `app/globals.css` (§5.3 à §5.5).
3. **Polices** (§5.4).
4. **Primitives** (§7) + `components/ui/README.md`.
5. **États globaux** : `app/loading.tsx`, `app/error.tsx` (client, bouton « Réessayer » via
   `reset`), `app/global-error.tsx`, et `loading.tsx` pour `/recherche`, `/offre/[slug]`,
   `/magasin/[slug]`, `/compte/(app)`, `/reservation`.
6. **Tracker** : créer `docs/audits/feuille-de-route-qa-ux-v2.md` s'il n'existe pas (une ligne
   par écran × 7 critères de la grille §9, statut P0/P1/P2, lien capture avant/après).
7. **Captures « avant »** : `npm run capture:staging` et `npm run capture:prod`.

À la fin de la Vague 0, **le site entier change de couleurs et de police** du seul fait des tokens.
Lister les écrans qui deviennent incohérents ou illisibles : ce sont les P0 des vagues suivantes.

### Vague 1 — Transversal · `design/v1-transversal`

Header (desktop + mobile, recherche, panier avec compteur, compte), footer, navigation mobile,
`ConsentBanner`, `not-found.tsx`, `/offline`, pages légales (`legal-page.tsx`), `opengraph-image`
si les tokens ont bougé, gabarit e-mail (§5.6), règle tu/vous, correction de
`lib/admin/merchant-pos.ts:363`.

### Vague 2 — Découverte publique · `design/v2-decouverte`

Feed `/` (« Pour vous » / « Radar déstockage », pills des 12 macros), `/recherche` (liste + carte,
`search-form`, `view-toggle`, `sort-toggle`, filtres actifs + **« Effacer les filtres »** quand un
filtre est actif, cas « Lieu introuvable »), carte (pins, popup, `pos-drawer`), `/offre/[slug]`
(`offer-showcase`, `merchant-cta`, `reserve-button`), `/magasin/[slug]` (horaires, fermé, R2),
`/[ville]/[categorie]`. Unification `OfferCard` (§3).

Points d'attention UX connus :
- Sur la carte d'offre, ordre de lecture : **remise → prix → produit → enseigne · distance · ouvert**.
- La différence **affiliation / réservation** doit se comprendre sans lire de texte légal : deux
  CTA visuellement distincts, et le CTA désactivé (C6) explique pourquoi.
- Magasin **R2** : visible, non cliquable, sans affordance de lien.

### Vague 3 — Auth & onboarding · `design/v3-auth`

`/login` (e-mail + Google/Apple), `/login/envoye`, `/login/otp` (`OtpInput`), `/compte/onboarding`
(sélecteur 0 à 5 parmi 12 macros, `components/account/interest-picker.tsx`), CGU, opt-in
`DEAL_ALERTS`. Messages d'erreur OTP (code invalide, expiré, trop de tentatives) lisibles.

### Vague 4 — Tunnel Click & Collect · `design/v4-tunnel`

`/reservation` (panier, `cart-quantity-form`, conflit mono-magasin), `/reservation/retrait`
(Payment Element, 3DS, `tunnel-steps`), `/reservation/confirmation`, `pickup-pass` (QR + code,
lisible en plein soleil : fort contraste, luminosité), `pickup-countdown` (48 h), facture
(`components/invoices/invoice-sheet.tsx`, styles d'impression). Le moment de confiance : expliquer
clairement **empreinte ≠ débit** (débit au retrait).

### Vague 5 — Espace compte · `design/v5-compte`

`/compte` (hub), favoris, réservations (liste, détail, itinéraire, facture, annulation,
messagerie `components/messages/*`), réglages (`settings-nav`, profil, intérêts, notifications,
suppression RGPD `delete-account-button`).

### Vague 6 — Admin (non bloquante) · `design/v6-admin`

`components/admin/*`, `/admin/**`. Référence de parcours : `design/stitch/pro/*.html`
(dashboard, catalogue, commandes, stocks, import CSV). Priorité : tableaux lisibles, filtres,
statuts, formulaires (`offer-form`, `pos-form`, `merchant-pos-form`), import CSV.

### Pour chaque vague

1. **Audit** : lire les captures « avant » (`screenshots/staging/…`, `screenshots/prod/…` pour les
   états vides), lister les problèmes par écran avec la grille §9, classer P0/P1/P2.
2. **Proposition** : intention, layout, primitives mobilisées, justification. **Attendre l'accord**
   avant de coder si la proposition change un parcours ou une hiérarchie d'information.
3. **Implémentation** : commits petits et thématiques.
4. **Vérifications** (§10).
5. **Captures « après »** et mise à jour du tracker.
6. **Validation Fabrice.**

---

## 9. GRILLE D'AUDIT (par écran)

1. **Fonctionnel** : parcours de bout en bout OK, aucune erreur console ni réseau.
2. **Design system** : tokens respectés, aucune valeur en dur, primitives utilisées.
3. **UX** : hiérarchie claire, **un seul CTA primaire**, retour immédiat (chargement, succès, erreur).
4. **Responsive** : 390, 768, 1440 px ; rien de coupé, pas de scroll horizontal parasite.
5. **États** : vide, chargement, erreur, hors ligne, 0 offre, magasin R2, magasin fermé, recherche sans résultat, lieu introuvable, enseigne qui n'encaisse pas.
6. **Contenu FR** : copie soignée, règle tu/vous, typographie française (espace insécable avant
   `: ; ! ?` et dans `12,90 €`, guillemets « »), aucun « Achille ».
7. **Accessibilité** : contrastes mesurés, focus clavier, labels, cibles ≥ 44 px, lecteur d'écran
   sur prix et badges.

---

## 10. VÉRIFICATIONS AVANT CHAQUE PR

### Qualité (obligatoire, doit passer)

```bash
npm run lint
npm run typecheck
npm run build
```

### Non-régression (scripts existants)

Sur une base **locale ou staging**, jamais la production. Format :
`node --env-file=.env --import tsx scripts/<script>.ts`.

| Zone | Scripts |
| --- | --- |
| Feed, catalogue | `verify-home-feed`, `verify-offer-macro`, `verify-interest-macros` |
| Carte, POS | `verify-r2`, `verify-pos-activation`, `verify-audit-fixes` |
| Favoris | `verify-favorites` |
| Auth | `verify-auth-b2c`, `verify-otp-hardening`, `verify-onboarding-closure` |
| Tunnel, paiement | `verify-reservation-cart`, `verify-reservations`, `verify-payments` |
| Compte | `verify-us5-detail-hub`, `verify-us6a-settings`, `verify-us6b-deletion` (**base locale uniquement**, supprime des comptes) |
| Affiliation | `verify-affiliation`, `verify-affiliation-http` |
| Admin | `verify-tenant-isolation`, `verify-merchant-pos` |

Lire chaque script avant de le lancer. En cas d'échec : rapporter la sortie, ne pas masquer.

### Parcours manuels (390 px et 1440 px)

- Accueil → pill macro → offre → « Voir chez le marchand » (302 vers le marchand).
- Recherche ville + rayon → bascule carte → clic pin → drawer → offre (le `pos` est conservé).
- Offre d'une enseigne qui encaisse → ajout panier → quantité > stock (message C4) →
  retrait → carte test Stripe `4242 4242 4242 4242` puis `4000 0027 6000 3184` (3DS) →
  confirmation → PickupPass.
- Ajout d'une offre d'un autre magasin → dialogue de conflit → « Annuler ».
- Login OTP → onboarding intérêts → `/compte` → favoris → réservation → facture.
- Navigation **clavier seule** sur header, carte d'offre, dialogue, formulaire de paiement.

### Accessibilité

Contraste mesuré (DevTools ou équivalent) sur chaque nouvelle paire couleur ; Lighthouse
accessibilité ≥ 95 sur `/`, `/recherche`, `/offre/[slug]`, `/reservation` ; `axe` sans violation
« serious » ou « critical ».

---

## 11. LIVRABLES PAR VAGUE

- Branche `design/<vague>` et PR séparée vers `main`.
- Captures avant / après (390 + 1440) jointes à la PR (le dossier `screenshots/` est gitignoré).
- Liste des primitives ajoutées ou modifiées, extrait des tokens touchés.
- Checklist non-régression cochée (scripts + parcours manuels).
- Checklist accessibilité (contrastes mesurés, focus, aria, cibles).
- Notes de design (3 à 5 lignes par choix structurant).
- Tracker `docs/audits/feuille-de-route-qa-ux-v2.md` à jour.

### Critères de sortie

- Tous les **P0** traités.
- **P1** arbitrés : faits maintenant ou reportés au tracker avec justification.
- Vérifications §10 vertes sur staging (desktop + mobile).
- Validation explicite de Fabrice.

---

## 12. ANTI-PATTERNS

- Modifier `prisma/`, `app/api/`, une Server Action, `lib/` métier, Stripe (hors `appearance`),
  l'auth, MapLibre (hors couleur des pins).
- Créer un `tailwind.config.ts` ou réintroduire le CDN Tailwind des maquettes Stitch.
- Copier les couleurs, polices ou images `lh3.googleusercontent.com` de `design/stitch/`.
- Ajouter une lib UI, d'animation ou d'icônes.
- Utiliser l'ambre `#F7A325` comme couleur de texte, d'icône seule ou de focus sur fond clair.
- Mettre du texte blanc sur un bouton ambre.
- Dégradés gratuits, ombres lourdes, glassmorphism, parallax, auto-play.
- Densifier le mobile ; tronquer un prix ou un nom d'enseigne sans `title`/tooltip.
- Passer un Server Component en client pour un effet visuel.
- Renommer un attribut `name`, un `id` lié à un `label`, ou une route.
- Rebrander à moitié un écran.
- Supprimer un composant sans recenser ses usages.

---

## 13. FORMAT DE RÉPONSE ATTENDU (à chaque échange)

1. **Compréhension** (2–3 phrases).
2. **Audit** : problèmes constatés, classés P0/P1/P2, avec fichier et ligne.
3. **Proposition design** : intention, choix clés, pourquoi.
4. **Plan d'implémentation** : fichiers à créer / modifier, primitives utilisées.
5. **Risques** : ce qui peut régresser, ce qu'il faut tester en premier.
6. **Code** : modifications effectives, prêtes à committer.
7. **Vérifications faites** : commandes lancées et résultat réel (y compris les échecs).
8. **Checklist** : fonctionnel, design system, a11y, responsive, états, copie.

Si une information manque (capture, arbitrage tu/vous, choix entre deux layouts), **pose la
question** au lieu de deviner.

---

## DÉMARRAGE D'UNE VAGUE (à copier dans Cursor)

```
@docs/prompts/00-6-refonte-design-ux.md
Vague : <0 | 1 | 2 | 3 | 4 | 5 | 6> — <nom>
Branche : design/<vX-nom> depuis main à jour
Captures : screenshots/staging/{desktop,mobile}/ et screenshots/prod/{desktop,mobile}/
Retours UX spécifiques :
- <ex. sur la fiche offre, le prix barré se perd>
- <ex. sur mobile, le header prend trop de hauteur>
Commence par les étapes 1 (audit) et 2 (proposition). N'écris pas de code avant mon accord.
```
