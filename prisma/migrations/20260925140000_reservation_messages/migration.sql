-- Messagerie interne liée à une réservation.
-- Revert :
--   DROP TABLE "Message";
--   DROP TYPE "MessageSenderRole";

CREATE TYPE "MessageSenderRole" AS ENUM ('BUYER', 'MERCHANT');

CREATE TABLE "Message" (
    "id" TEXT NOT NULL,
    "reservationId" TEXT NOT NULL,
    "senderUserId" TEXT NOT NULL,
    "senderRole" "MessageSenderRole" NOT NULL,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "readAt" TIMESTAMP(3),

    CONSTRAINT "Message_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Message_reservationId_createdAt_idx" ON "Message"("reservationId", "createdAt");

ALTER TABLE "Message" ADD CONSTRAINT "Message_reservationId_fkey" FOREIGN KEY ("reservationId") REFERENCES "Reservation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Message" ADD CONSTRAINT "Message_senderUserId_fkey" FOREIGN KEY ("senderUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
