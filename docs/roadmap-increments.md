# Achille — briefs d'incréments (prêts pour Cursor)

**État au 20 septembre 2026 :** Phase 0 et Phase 1 (affiliation) sont **terminées**. Point d’étape : `docs/status.md`. On ne code **pas** la phase « directe » ni le paiement tant que ce n’est pas demandé.

Chaque incrément est cadré pour être donné tel quel à l'agent : **objectif**, **périmètre**, **livrables**, **critères d'acceptation**. On les fait dans l'ordre.

---

## PHASE 0 — Socle

### 0.1 — Bootstrap du dépôt
**Objectif :** un projet Next.js déployable, propre, prêt à recevoir le métier.
**Périmètre :** Next.js (App Router, TS strict) ; Tailwind + shadcn/ui ; ESLint/Prettier ; structure `app/ components/ lib/ prisma/ docs/` ; `.env.example` ; layout de base avec les tokens navy `#002642` / orange `#FF9900` dans `tailwind.config`.
**Critères d'acceptation :**
- `npm run dev` sert une page d'accueil vide stylée aux couleurs Achille.
- `npm run build` + `npm run lint` passent sans erreur.
- Aucun secret dans le dépôt ; `.env.example` documente les variables attendues.

### 0.2 — Base de données & Prisma + PostGIS
**Objectif :** le schéma métier en place, géo opérationnelle.
**Périmètre :** Prisma + PostgreSQL ; `schema.prisma` d'après `docs/data-model.md` ; migration SQL ajoutant l'extension PostGIS, la colonne générée `geog` et l'index GiST ; `lib/db.ts` (singleton) ; `lib/geo.ts` (requête `ST_DWithin` d'exemple) ; script de seed (2–3 enseignes, quelques POS géolocalisés, produits, offres).
**Critères d'acceptation :**
- `prisma migrate dev` crée le schéma ; PostGIS actif.
- Une fonction `findOffersNearby(lat, lng, radiusM)` renvoie les offres triées par distance.
- Le seed peuple des données cohérentes (prix remisé < prix référence, stock > 0, `isOnline`).

### 0.3 — Auth.js
**Objectif :** connexion souveraine, comptes dans notre base.
**Périmètre :** Auth.js + adapter Prisma ; providers e-mail + Google + Apple ; pages login/compte ; middleware de session ; « continuer sans compte » (navigation anonyme autorisée).
**Critères d'acceptation :**
- Un utilisateur se connecte (e-mail ou social) ; session persistée en base.
- Les tables Auth.js existent ; aucun mot de passe applicatif stocké.
- La navigation publique fonctionne sans compte.

### 0.4 — CI/CD Clever Cloud
**Objectif :** déploiement automatisé, sans clé statique.
**Périmètre :** app Clever Cloud + add-on PostgreSQL ; GitHub Actions (lint + build + migrate + deploy) via OIDC ; variables d'env côté plateforme.
**Critères d'acceptation :**
- Un push sur `main` déploie ; migrations appliquées automatiquement.
- Aucune clé statique dans le workflow.

---

## PHASE 1 — Affiliation (MVP public)

### 1.1 — Catalogue & offres géolocalisées (back-office minimal)
**Objectif :** alimenter des offres et les publier.
**Périmètre :** back-office enseigne minimal (protégé) : CRUD offre (produit, POS, prix remisé, prix référence, TVA, stock, état, toggle `isOnline`, `merchantUrl`) ; **import CSV** d'offres (assistant : upload → validation → rapport d'import) ; grille des offres (image, SKU/EAN, prix, prix public, stock, actif, catégorie).
**Critères d'acceptation :**
- On crée/modifie une offre et on la met « en ligne ».
- Un CSV valide crée/actualise des offres en masse ; les lignes invalides sont rapportées sans bloquer les autres.

### 1.2 — Recherche & carte
**Objectif :** trouver les offres autour de soi.
**Périmètre :** sélection zone + rayon ; recherche (Postgres FTS) + filtres catégorie/prix/distance ; **carte MapLibre + tuiles IGN** avec marqueurs POS ; bascule liste/carte ; composant distance.
**Critères d'acceptation :**
- Saisir une localisation + rayon renvoie les offres proches, triables par prix/distance.
- La carte affiche les POS ; cliquer un marqueur ouvre l'offre. Aucune dépendance Google.

### 1.3 — Vitrine (fiche produit, fiche magasin) + SEO
**Objectif :** des pages publiques indexables qui vendent l'offre.
**Périmètre :** fiche produit multi-vendeurs (« N offres disponibles », tri prix/distance, prix remisé + barré + −XX %) ; fiche magasin (adresse, horaires, distance, offres) ; pages rendues serveur (ISR) ; `generateMetadata`, `sitemap.ts`, `robots.ts` ; URLs `/offre/[slug]`, `/magasin/[slug]`, `/[ville]/[categorie]`.
**Critères d'acceptation :**
- Chaque produit/magasin/ville a une URL propre, rendue serveur, avec métadonnées et OG.
- L'identité navy/orange du Figma est respectée (badge remise, prix barré, enseigne + distance).

### 1.4 — Flux d'affiliation + tracking
**Objectif :** le cœur du modèle — renvoyer vers le marchand et le mesurer.
**Périmètre :** bouton **« Voir l'offre chez le marchand »** → enregistre un `OfferClick` (offre, user/session, referrer) puis redirige vers `merchantUrl` ; endpoint de redirection `app/api/out/[offerId]` ; tableau de bord basique des renvois (par offre / enseigne / jour).
**Critères d'acceptation :**
- Le clic est tracé **avant** la redirection ; la redirection fonctionne.
- **Aucun** panier/paiement interne. Les métriques de renvoi sont consultables.

### 1.5 — Comptes, favoris, PWA, durcissement
**Objectif :** finir le MVP et le sécuriser.
**Périmètre :** favoris (produits + magasins) ; page compte (infos, adresse) ; PWA (manifest + service worker, installable, offline sur les écrans clés) ; analytics Plausible/Matomo ; passe RGPD (minimisation, mentions, cookies) ; recette.
**Critères d'acceptation :**
- Favoris fonctionnels ; app installable ; analytics souveraine active.
- Revue sécurité : aucun secret en dépôt, entrées validées (zod), données en UE. **MVP affiliation en ligne.**
