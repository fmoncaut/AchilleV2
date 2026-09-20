# Prompt Cursor — Incrément 0.2 (Base de données & Prisma + PostGIS)

Coller tel quel dans l'agent Cursor. Prérequis : incrément 0.1 livré.

---

Contexte : suite du dépôt Achille. Respecte en permanence `.cursor/rules/achille.mdc`, `docs/project-brief.md` et `docs/data-model.md`.

Tâche : implémente UNIQUEMENT l'incrément 0.2 (Base de données & Prisma + PostGIS) de `docs/roadmap-increments.md`. NE crée PAS l'auth, la carte, le back-office ni d'écrans métier. Arrête-toi à la fin de 0.2.

Prérequis base : une base PostgreSQL avec PostGIS via DATABASE_URL. Pour le dev local, si aucune base n'est fournie, ajoute un docker-compose.yml utilisant l'image postgis/postgis et documente `docker compose up -d` dans le README. Aucune valeur de connexion en dur ; DATABASE_URL vient de .env (mets-la dans .env.example).

Périmètre :
- Installe Prisma + @prisma/client. Datasource postgresql, url = env("DATABASE_URL").
- schema.prisma : reprends fidèlement les modèles de docs/data-model.md (Merchant, Pos, Brand, Category, Product, Offer [+ enum ProductCondition], OfferClick, User, Favorite). Money en Decimal(10,2). lat/lng en Float sur Pos (lastLat/lastLng sur User). NE mets PAS la colonne `geog` dans schema.prisma : ajoute un commentaire au-dessus du modèle Pos indiquant qu'elle est une colonne PostGIS générée, gérée par migration, à ne pas supprimer.
- Migration PostGIS : génère la migration avec `prisma migrate dev --create-only`, puis ajoute dans le fichier SQL :
      CREATE EXTENSION IF NOT EXISTS postgis;
      ALTER TABLE "Pos" ADD COLUMN geog geography(Point,4326)
        GENERATED ALWAYS AS (ST_SetSRID(ST_MakePoint(lng, lat),4326)::geography) STORED;
      CREATE INDEX pos_geog_idx ON "Pos" USING GIST (geog);
  puis applique (`prisma migrate dev`).
- lib/db.ts : client Prisma singleton (pattern global, pour éviter les instances multiples en dev).
- lib/geo.ts : fonction `findOffersNearby(lat: number, lng: number, radiusM: number)` en `prisma.$queryRaw`, utilisant ST_DWithin + ST_Distance, filtrant isOnline = true et stock > 0, triée par distance croissante, limitée à 100, avec un type de retour explicite.
- prisma/seed.ts : 2–3 enseignes (ex. Bricomarché, Alinéa, Norauto), plusieurs POS géolocalisés dans de vraies villes françaises (coordonnées réalistes), des produits (avec EAN), et des offres cohérentes (priceRemise < priceReference, discountPct calculé, stock > 0, isOnline true, condition NEUF). Seed relançable proprement.

Contraintes (rappel) : aucun secret en dur (.env only) ; requêtes paramétrées ; Decimal pour les prix (jamais float) ; aucune dépendance Google.

Critères d'acceptation (à vérifier avant de t'arrêter) :
1. `prisma migrate dev` crée le schéma ; l'extension PostGIS est active ; la colonne générée `geog` et l'index GiST existent.
2. `npm run seed` peuple des données cohérentes et relançables.
3. `findOffersNearby(lat, lng, radiusM)` renvoie les offres proches triées par distance (vérifié via un petit script ou une route de debug temporaire, retirée ensuite).
4. `npm run build` et `npm run lint` passent ; aucun secret dans le dépôt ; .env.example à jour (DATABASE_URL).

Quand c'est fait : liste les fichiers créés/modifiés, confirme les 4 critères, et donne la commande pour lancer la base PostGIS locale si tu en as ajouté une. N'enchaîne pas sur 0.3.
