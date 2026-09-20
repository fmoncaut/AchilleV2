# Revue de sécurité — fin de Phase 1 (affiliation)

Date : 2026-09-20. Périmètre : MVP affiliation (incréments 0.1–1.5). Pas de panier, pas de paiement.

## Secrets

- Aucun secret en dur dans le dépôt. `AUTH_SECRET`, `DATABASE_URL`, SMTP, OAuth et clés d’infra passent par l’environnement (`.env` non commité, `.env.example` sans valeurs).
- CI GitHub Actions : pas de clé statique d’hébergeur dans le code (déploiement natif / secrets de plateforme).
- Cookies de session Auth.js gérés par la bibliothèque ; aucun mot de passe applicatif stocké.

## Validation des entrées

- Recherche, géocodage, CRUD offres, import CSV, identifiant d’offre (`/api/out`), favoris (`kind` + `id`) : schémas **zod**.
- Requêtes PostGIS / SQL d’agrégation : paramètres Prisma (`Prisma.sql`), pas de concaténation de chaînes utilisateur.
- `merchantUrl` : http(s) absolue avant redirection d’affiliation.

## Données et souveraineté (UE)

- Base PostgreSQL + PostGIS (Clever Cloud, UE). Médias Scaleway (UE). E-mails Brevo.
- Carte : MapLibre + tuiles IGN Géoplateforme — **pas** Google Maps / Places / Mapbox.
- Analytics : Plausible ou Matomo, **uniquement** si `NEXT_PUBLIC_PLAUSIBLE_DOMAIN` (ou couple Matomo) est défini, et **uniquement après** consentement (`achille_consent=all`). Rien n’est envoyé si la variable est absente ou si l’utilisateur refuse.
- Pas de Google Analytics, Firebase, GTM. Google OAuth (login) est optionnel : l’identité revient dans **notre** table `User` ; ce n’est pas de la mesure d’audience.
- `next/font/google` (Geist) : la fonte est téléchargée **au build** et servie en statique, sans appel runtime vers Google.

## Minimisation / PII

- Phase affiliation : pas de paiement, pas de CB, pas d’adresse de livraison.
- `OfferClick` : offerId, userId (ou null), sessionId = cookie `anonId` (UUID opaque), referrer sans query. Pas d’IP, pas de user-agent, pas d’e-mail.
- Favoris : `userId` + `productId` ou `posId`. Isolation par compte (`where: { userId }`). Un visiteur anonyme est renvoyé vers `/login`.
- Cookie `anonId` : httpOnly, SameSite=Lax, ~1 an, déclaré dans le bandeau et `/confidentialite`.
- Consentement : cookie `achille_consent` (lecture navigateur nécessaire) — **pas** de `localStorage` / `sessionStorage` applicatif.

## PWA

- Manifest + service worker (`public/sw.js`, Cache API).
- `/api/out` et `/api/*` : réseau uniquement, jamais mis en cache.
- Hors-ligne : accueil et `/recherche` déjà vues (Network First). Les fiches dynamiques ne sont pas servies comme source de vérité hors-ligne.

## Écarts acceptés / à relire avant prod commerciale

- Pages légales : **placeholders** (éditeur, SIREN, DPO) à compléter.
- Contrainte unique Prisma `Favorite(userId, productId, posId)` : les `NULL` PostgreSQL ne dédupliquent pas ; l’unicité produit/magasin est appliquée en application.
- Textes CGU / confidentialité : faire relire par un juriste.

**Conclusion :** le MVP affiliation peut être publié une fois les mentions légales remplies et les variables d’environnement de production posées. Aucun secret en dépôt, entrées validées, données en UE, pas de PII superflue dans le tracking.
