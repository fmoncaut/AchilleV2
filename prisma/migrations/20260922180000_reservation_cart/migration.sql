-- Panier de réservation mono-magasin (incrément 2.2). Aucun paiement.
-- Revert :
--   DROP TABLE "ReservationCartItem";
--   DROP TABLE "ReservationCart";

CREATE TABLE "ReservationCart" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "sessionKey" TEXT,
    "posId" TEXT NOT NULL,
    "merchantId" TEXT NOT NULL,
    "viewerLat" DOUBLE PRECISION,
    "viewerLng" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ReservationCart_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "ReservationCart_owner_check" CHECK (
        ("userId" IS NOT NULL AND "sessionKey" IS NULL)
        OR ("userId" IS NULL AND "sessionKey" IS NOT NULL)
    )
);

CREATE UNIQUE INDEX "ReservationCart_userId_key" ON "ReservationCart"("userId");
CREATE UNIQUE INDEX "ReservationCart_sessionKey_key" ON "ReservationCart"("sessionKey");
CREATE INDEX "ReservationCart_posId_idx" ON "ReservationCart"("posId");

CREATE TABLE "ReservationCartItem" (
    "id" TEXT NOT NULL,
    "cartId" TEXT NOT NULL,
    "offerId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ReservationCartItem_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ReservationCartItem_cartId_offerId_key" ON "ReservationCartItem"("cartId", "offerId");
CREATE INDEX "ReservationCartItem_offerId_idx" ON "ReservationCartItem"("offerId");

ALTER TABLE "ReservationCart" ADD CONSTRAINT "ReservationCart_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ReservationCart" ADD CONSTRAINT "ReservationCart_posId_fkey"
    FOREIGN KEY ("posId") REFERENCES "Pos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ReservationCart" ADD CONSTRAINT "ReservationCart_merchantId_fkey"
    FOREIGN KEY ("merchantId") REFERENCES "Merchant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ReservationCartItem" ADD CONSTRAINT "ReservationCartItem_cartId_fkey"
    FOREIGN KEY ("cartId") REFERENCES "ReservationCart"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ReservationCartItem" ADD CONSTRAINT "ReservationCartItem_offerId_fkey"
    FOREIGN KEY ("offerId") REFERENCES "Offer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
