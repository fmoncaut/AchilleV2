# Feuille de route QA / UX — Akwire

Grille : fonctionnel, design system, UX, responsive, états, contenu FR, accessibilité.
Priorités : **P0** bloque la lecture ou le parcours, **P1** à traiter dans la vague nommée, **P2** peut attendre.

Captures **avant** du 16 octobre 2026, avant la Vague 0 :

- Staging public : `npm run capture:staging` — 26 fichiers OK, 0 échec. Auth sautée (`DATABASE_URL` absent, message Prisma dans la sortie). Des captures compte plus anciennes restent dans `screenshots/staging/` et ne sont pas de ce passage.
- Production : `npm run capture:prod` — 22 fichiers OK, 0 échec. Soft-launch : pas d'offre ni de page ville dans le sitemap. Base `https://app-3c244888-8706-4ae8-9cb3-e480c257e386.cleverapps.io`.

Les captures vivent dans `screenshots/` (gitignoré). La colonne Après sera remplie après déploiement staging de la Vague 0. Cette vague ne part pas en production.

La Vague 0 change la peau (tokens, police, primitives, états de chargement). Elle ne rebranche pas chaque écran sur les primitives. Aucun écran ne devient illisible : le texte ambre clair sur fond clair est remplacé par l'ambre foncé `#8A5300`. Les P0 ci-dessous sont les dettes visuelles reportées.

## P0 reportés

| Sujet | Vague | Pourquoi |
| --- | --- | --- |
| Pins et popup carte encore en hex Achille (`#002642`, `#FE9800`) | 2 | Ils ne suivent pas les tokens. La requête et les magasins sans offre ne bougent pas. |
| Chiffre du prix encore en ambre foncé, cible Encre | 2 | Lisible (5,80:1). La hiérarchie « prix Encre + badge ambre » n'est pas encore posée partout. |
| Gabarit e-mail (OTP, réservation) | 1 | HTML hors tokens. Rien en Vague 0. |
| Payment Element (navy, Manrope) | 4 | `appearance` seulement, plus tard. |

## Écrans

Une ligne par écran. Cellules : `ok` si la capture avant ne montre pas de blocage et que la Vague 0 ne change que la peau ; sinon la priorité et la vague.

| Écran | Vague | F | DS | UX | R | États | FR | A11y | Avant staging | Avant prod |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `/` | 2 | ok | P1 | P1 | ok | P1 | P1 tu/vous | P1 | `staging/desktop/home.png` | `prod/desktop/home.png` |
| `/recherche` | 2 | ok | P1 | P1 | ok | P1 | ok | P1 | `staging/desktop/recherche.png` | `prod/desktop/recherche.png` |
| `/recherche?vue=carte` | 2 | ok | P0 pins | P1 | ok | P1 | ok | P1 | `staging/desktop/recherche.png` (vue dans le script) | idem prod |
| `/offre/[slug]` | 2 | ok | P1 prix | P1 | ok | P1 | ok | P1 | `staging/desktop/offre__micro-genesis-gamer-radium-100-5901969417845.png` | absent (soft-launch) |
| `/magasin/[slug]` | 2 | ok | P1 | P1 | ok | P1 R2 | ok | P1 | `staging/desktop/magasin__electrodepot-electro-depot-frejus-83600.png` | `prod/desktop/magasin__electrodepot-electro-depot-frejus-83600.png` |
| `/[ville]/[categorie]` | 2 | ok | P1 | P1 | ok | P1 | ok | P1 | `staging/desktop/frejus__tech.png` | absent (soft-launch) |
| `/cgu` | 1 | ok | P1 | P2 | ok | ok | P1 | P2 | `staging/desktop/cgu.png` | `prod/desktop/cgu.png` |
| `/confidentialite` | 1 | ok | P1 | P2 | ok | ok | P1 | P2 | `staging/desktop/confidentialite.png` | `prod/desktop/confidentialite.png` |
| `/mentions-legales` | 1 | ok | P1 | P2 | ok | ok | P1 | P2 | `staging/desktop/mentions-legales.png` | `prod/desktop/mentions-legales.png` |
| `/offline` | 1 | ok | P1 | P2 | ok | ok | ok | P2 | `staging/desktop/offline.png` | `prod/desktop/offline.png` |
| 404 | 1 | ok | P1 | P2 | ok | ok | ok | P2 | `staging/desktop/cette-route-nexiste-pas-qa-404.png` | `prod/desktop/cette-route-nexiste-pas-qa-404.png` |
| `/login` | 3 | ok | P1 | P1 | ok | P1 | ok | P1 | `staging/desktop/login.png` | `prod/desktop/login.png` |
| `/login/otp` | 3 | ok | P1 | P1 | ok | P1 | ok | P1 | `staging/desktop/login__otp.png` | `prod/desktop/login__otp.png` |
| `/login/envoye` | 3 | — | P1 | P1 | — | P1 | P1 | P1 | non capturé | non capturé |
| `/compte/onboarding` | 3 | — | P1 | P1 | — | P1 | P1 | P1 | capture antérieure seulement | non capturé |
| `/compte` | 5 | — | P1 | P1 | — | P1 | P1 | P1 | capture antérieure seulement | non capturé |
| `/compte/favoris` | 5 | — | P1 | P1 | — | P1 | ok | P1 | capture antérieure seulement | non capturé |
| `/compte/reservations` | 5 | — | P1 | P1 | — | P1 | ok | P1 | capture antérieure seulement | non capturé |
| `/compte/reservations/[id]` | 5 | — | P1 | P1 | — | P1 | ok | P1 | capture antérieure seulement | non capturé |
| `/compte/reservations/[id]/facture` | 5 | — | P1 | P2 | — | P1 | ok | P1 | non capturé ce passage | non capturé |
| `/compte/reglages` | 5 | — | P1 | P1 | — | P1 | P1 | P1 | capture antérieure seulement | non capturé |
| `/reservation` | 4 | — | P1 | P1 | — | P1 | P1 | P1 | capture antérieure `tunnel__recap.png` | non capturé |
| `/reservation/retrait` | 4 | — | P0 Stripe | P1 | — | P1 | P1 | P1 | non capturé ce passage | non capturé |
| `/reservation/confirmation` | 4 | — | P1 | P1 | — | P1 | P1 | P1 | non capturé ce passage | non capturé |
| `/admin` | 6 | — | P2 | P2 | — | P2 | P2 | P2 | hors script public | hors script public |

Les colonnes mobile sont les mêmes slugs sous `screenshots/<env>/mobile/`.

## Vague 0 — fait dans cette branche

- Règles projet et ce design system.
- Tokens Akwire, polices Space Grotesk, primitives `components/ui/`, `loading.tsx` / `error.tsx`.
- `text-secondary-container` → `text-secondary` sur fond clair. Conservé sur fond Encre (pass de retrait, bandeau magasin, pastille « circuit » de la fiche).
- `bg-secondary-container` inchangé (la valeur du token passe à `#F7A325`).
- Déploiement : staging seulement.
