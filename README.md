# Achille

Place de marché de **bonnes affaires locales géolocalisées**. Signature : **Think global, shop local**.

Portail web responsive, étape **affiliation** : vitrine géolocalisée + fiche offre, puis renvoi tracké vers le site du marchand. Pas de panier interne, pas de paiement, pas de checkout.

## Démarrage (incrément 0.1)

```bash
npm install
npm run dev
```

Scripts : `dev`, `build`, `lint`, `format`.

Copier `.env.example` vers `.env` et renseigner les variables **en local uniquement** (aucun secret dans le dépôt).

## Identité

Navy `#002642` · Orange `#FF9900` · fond papier `#FBFAF8`.

## Documentation

```
.cursor/rules/achille.mdc     Règles projet (stack, conventions, sécurité, périmètre)
docs/project-brief.md         Produit, modèle, interfaces de référence
docs/data-model.md            Schéma Prisma (affiliation) + stratégie PostGIS
docs/roadmap-increments.md    Briefs d'incréments (Phase 0 puis Phase 1)
```

Pilote l'agent **un incrément à la fois**, dans l'ordre de `docs/roadmap-increments.md`.
