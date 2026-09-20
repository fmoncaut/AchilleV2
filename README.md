# Achille

Place de marché de **bonnes affaires locales géolocalisées**. Signature : **Think global, shop local**.

Portail web responsive, étape **affiliation** : vitrine géolocalisée + fiche offre, puis renvoi tracké vers le site du marchand. Pas de panier interne, pas de paiement, pas de checkout.

## Démarrage

```bash
cp .env.example .env
```

Dans `.env` (fichier **local**, jamais commité), renseigner au minimum :

```
DATABASE_URL=postgresql://achille:achille@localhost:5432/achille
```

Puis :

```bash
docker compose up -d
npm install
npx prisma migrate dev
npm run seed
npm run dev
```

Scripts : `dev`, `build`, `lint`, `format`, `seed`.

Auth.js lit `AUTH_SECRET` et `AUTH_URL` dans `.env`. Google, Apple et SMTP sont optionnels : sans eux l'app démarre, et en développement le lien magique e-mail s'affiche dans la console du serveur.

La base locale est PostgreSQL 16 + PostGIS (`postgis/postgis`). Arrêt : `docker compose down`.

La colonne `geog` des points de vente est une colonne PostGIS **générée** (migration SQL), absente de `schema.prisma` volontairement. Ne pas la supprimer.

## Déploiement

Voir **`docs/deployment.md`** : Clever Cloud (Paris), PostgreSQL dédié + PostGIS, hook `prisma migrate deploy`, intégration GitHub. Le CI (`.github/workflows/ci.yml`) ne déploie pas.

## Identité

Navy `#002642` · Orange `#FF9900` · fond papier `#FBFAF8`.

## Documentation

```
.cursor/rules/achille.mdc     Règles projet (stack, conventions, sécurité, périmètre)
docs/project-brief.md         Produit, modèle, interfaces de référence
docs/data-model.md            Schéma Prisma (affiliation) + stratégie PostGIS
docs/roadmap-increments.md    Briefs d'incréments (Phase 0 puis Phase 1)
docs/deployment.md            Déploiement Clever Cloud + CI GitHub
```

Pilote l'agent **un incrément à la fois**, dans l'ordre de `docs/roadmap-increments.md`.
