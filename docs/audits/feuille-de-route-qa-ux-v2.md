# Feuille de route QA / UX — Akwire

Grille : fonctionnel, design system, UX, responsive, états, contenu FR, accessibilité.
Priorités : **P0** bloque la lecture ou le parcours, **P1** à traiter dans la vague nommée, **P2** peut attendre.

Captures **avant** du 16 octobre 2026, avant la Vague 0 :

- Staging public : `npm run capture:staging` — 26 fichiers OK, 0 échec. Auth sautée (`DATABASE_URL` absent, message Prisma dans la sortie). Des captures compte plus anciennes restent dans `screenshots/staging/` et ne sont pas de ce passage.
- Production : `npm run capture:prod` — 22 fichiers OK, 0 échec. Soft-launch : pas d'offre ni de page ville dans le sitemap. Base `https://app-3c244888-8706-4ae8-9cb3-e480c257e386.cleverapps.io`.

Les captures vivent dans `screenshots/` (gitignoré).

Captures **après** : `npm run capture:staging` — 26 fichiers OK, 0 échec. Auth sautée (pas de `DATABASE_URL` postgres dans ce processus). Production non recapturée.

Contrôle staging du 16 octobre 2026 au soir, après fusion des PR #4 et #5 (`d317a42`). Le CSS servi contient Crème `#F6F5F1`, Encre `#13263F`, Ambre `#F7A325` et Space Grotesk. Bricolage et Manrope n'y sont plus. L'ancien orange `#FE9800` est encore dans la feuille (pins carte).

Vu dans le navigateur, 1440 px et 390 px :

- Accueil : prix vendu en ambre foncé `rgb(138, 83, 0)`, Space Grotesk 20 px, badge `-XX %` ambre / Encre. Lisible. La ligne de prix ajoute aussi un écart en euros (`−54,45 €`).
- Fiche `/offre/…?pos=electrodepot-electro-depot-saint-avold-57740` : le magasin Saint-Avold est en avant, prix `4,00 €` en ambre foncé. Pas de km : aucune position dans l'URL.
- `/recherche?lieu=zzzznotacity` : H1 « Bonnes affaires près de chez toi », message « Lieu introuvable ».
- Carte US6a sur l'accueil : « Cette enseigne n'a pas encore activé l'encaissement. »
- Anneau de focus Encre : non confirmé au clavier. Le champ de recherche du header a `outline-none`.
- Pass de retrait, favori magasin connecté, quantité au-dessus du stock, conflit de panier, admin : non rejoués, session absente.

P0 ouverts pour la suite : pins carte (Vague 2), prix encore en ambre foncé et écart en euros sur la carte (Vague 2), Payment Element (Vague 4).

Vague 1 (`design/v1-transversal`) : vouvoiement (« chez vous »), anneau de focus unique dans `app/globals.css`, header mobile avec recherche non collante, footer et CGU décrivent les deux modes (CGU à faire relire avant prod), gabarit e-mail PNG. L’e-mail de confirmation d’empreinte reste au backlog ci-dessus.

Vague 2a (`design/v2a-offer-card`) : une seule `OfferCard` (grille, compact, drawer). Prix en Encre, badge ambre, pas d’écart en euros. La carte affiliée mène à la fiche. « Réserver et retirer » et la phrase C6 gardent leurs conditions. « Ouvert » seulement si l’appelant a déjà la donnée.

Vague 2b (`design/v2b-feed-recherche`) : accueil et recherche. Filtres actifs (macro ou facette à l’accueil ; catégorie et prix en recherche — `q` n’est pas un filtre). États vides via `EmptyState`. Champs à 16 px / 44 px. Pas de « Ouvert » sur les cartes.

La Vague 0 change la peau (tokens, police, primitives, états de chargement). Elle ne rebranche pas chaque écran sur les primitives. Aucun écran ne devient illisible : le texte ambre clair sur fond clair est remplacé par l'ambre foncé `#8A5300`. Les P0 ci-dessous sont les dettes visuelles reportées.

## P0 reportés

| Sujet | Vague | Pourquoi |
| --- | --- | --- |
| Pins et popup carte encore en hex Achille (`#002642`, `#FE9800`) | 2 | Ils ne suivent pas les tokens. La requête et les magasins sans offre ne bougent pas. |
| Chiffre du prix encore en ambre foncé hors carte d'offre | 2d | Les cartes (`OfferCard`) sont en Encre. La fiche offre et le tunnel restent en ambre foncé. |
| Gabarit e-mail (OTP, réservation) | 1 | Traité : tableau 600 px, logo PNG, clair et sombre. |
| E-mail « réservation confirmée » absent | hors refonte | L’acheteur pose une empreinte sans recevoir d’e-mail. Pas de nouvel envoi dans la Vague 1. |
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
