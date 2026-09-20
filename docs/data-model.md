# Achille — modèle de données (affiliation MVP)

Dérivé du modèle métier de l'ancienne API (25 entités) et recadré sur ce que montrent les démos. On ne modélise que le nécessaire à l'**affiliation** ; les entités « directe » (Order, Payment, Pickup) sont listées mais **non créées** en phase 1.

## Stratégie géo (PostGIS)
Prisma ne gère pas nativement le type `geography`. Approche retenue :
1. Stocker `lat`/`lng` (Float) sur `Pos` (et `lastLat`/`lastLng` sur `User`).
2. Ajouter, dans une migration SQL, une colonne générée `geog geography(Point,4326)` + un index GiST.
3. Faire les requêtes de proximité en **SQL brut** via `prisma.$queryRaw` (`ST_DWithin`, `ST_Distance`).

Migration à ajouter après le premier `prisma migrate` :
```sql
CREATE EXTENSION IF NOT EXISTS postgis;
ALTER TABLE "Pos"
  ADD COLUMN geog geography(Point,4326)
  GENERATED ALWAYS AS (ST_SetSRID(ST_MakePoint(lng, lat),4326)::geography) STORED;
CREATE INDEX pos_geog_idx ON "Pos" USING GIST (geog);
```

Exemple de requête « offres dans un rayon » (dans `lib/geo.ts`) :
```ts
// rayon en mètres, triées par distance
const rows = await prisma.$queryRaw`
  SELECT o.id, o."priceRemise", o."priceReference", o.stock,
         p.id AS pos_id, p.name AS pos_name,
         ST_Distance(p.geog, ST_MakePoint(${lng}, ${lat})::geography) AS distance_m
  FROM "Offer" o
  JOIN "Pos" p ON p.id = o."posId"
  WHERE o."isOnline" = true AND o.stock > 0
    AND ST_DWithin(p.geog, ST_MakePoint(${lng}, ${lat})::geography, ${radiusM})
  ORDER BY distance_m ASC
  LIMIT 100;`;
```

## schema.prisma (extrait — cœur affiliation)
```prisma
generator client { provider = "prisma-client-js" }
datasource db { provider = "postgresql"; url = env("DATABASE_URL") }

model Merchant {            // Enseigne (ex. Bricomarché, Alinéa, Norauto)
  id        String  @id @default(cuid())
  name      String
  slug      String  @unique
  logoUrl   String?
  pos       Pos[]
  offers    Offer[]
  createdAt DateTime @default(now())
}

model Pos {                 // Point de vente géolocalisé
  id           String  @id @default(cuid())
  merchantId   String
  merchant     Merchant @relation(fields: [merchantId], references: [id])
  name         String
  slug         String   @unique
  address      String?
  postalCode   String?
  city         String?
  phone        String?
  openingHours Json?
  lat          Float
  lng          Float
  offers       Offer[]
  createdAt    DateTime @default(now())
  @@index([city])
}

model Brand {
  id       String @id @default(cuid())
  name     String
  slug     String @unique
  products Product[]
}

model Category {
  id       String @id @default(cuid())
  name     String
  slug     String @unique
  icon     String?
  parentId String?
  parent   Category?  @relation("CategoryTree", fields: [parentId], references: [id])
  children Category[] @relation("CategoryTree")
  products Product[]
}

model Product {
  id               String  @id @default(cuid())
  ean              String? @unique          // gencode / code-barres
  name             String
  slug             String  @unique
  description      String?
  shortDescription String?
  imageUrl         String?
  images           String[]
  publicPrice      Decimal? @db.Decimal(10,2) // prix de référence marché
  weight           Float?
  keywords         String?
  brandId          String?
  brand            Brand?    @relation(fields: [brandId], references: [id])
  categoryId       String?
  category         Category? @relation(fields: [categoryId], references: [id])
  offers           Offer[]
  @@index([categoryId])
}

enum ProductCondition { NEUF OCCASION RECONDITIONNE }

model Offer {               // Produit @ POS : le cœur de l'affiliation
  id             String   @id @default(cuid())
  productId      String
  product        Product  @relation(fields: [productId], references: [id])
  posId          String
  pos            Pos      @relation(fields: [posId], references: [id])
  merchantId     String
  merchant       Merchant @relation(fields: [merchantId], references: [id])
  priceRemise    Decimal  @db.Decimal(10,2)  // prix TTC remisé
  priceReference Decimal? @db.Decimal(10,2)  // prix moyen constaté sur internet
  discountPct    Int?                        // calculé/stocké pour tri & affichage
  tvaRate        Decimal? @db.Decimal(4,2)
  stock          Int      @default(0)
  condition      ProductCondition @default(NEUF)
  isOnline       Boolean  @default(false)    // toggle "produit en ligne"
  merchantUrl    String?                     // deep-link panier marchand (affiliation)
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt
  clicks         OfferClick[]
  @@index([posId]) @@index([productId]) @@index([isOnline])
}

model OfferClick {          // tracking du renvoi affiliation
  id        String   @id @default(cuid())
  offerId   String
  offer     Offer    @relation(fields: [offerId], references: [id])
  userId    String?
  sessionId String?
  referrer  String?
  createdAt DateTime @default(now())
  @@index([offerId]) @@index([createdAt])
}

model User {               // acheteur (Auth.js remplit le reste : Account/Session/VerificationToken)
  id        String   @id @default(cuid())
  email     String?  @unique
  name      String?
  image     String?
  lastLat   Float?
  lastLng   Float?
  favorites Favorite[]
  createdAt DateTime @default(now())
}

model Favorite {
  id        String   @id @default(cuid())
  userId    String
  user      User     @relation(fields: [userId], references: [id])
  productId String?
  posId     String?
  createdAt DateTime @default(now())
  @@unique([userId, productId, posId])
}

// Phase "directe" (NE PAS créer en phase 1) : Order, OrderItem, Payment, Pickup(QR/code).
```

## Note de sécurité
L'ancienne API portait un champ `password` sur le client : **à ne pas reprendre**. L'auth passe par Auth.js (tables `Account`/`Session`), aucun mot de passe applicatif.
