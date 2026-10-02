/**
 * Backfill Reservation.buyerName / buyerEmail depuis User (idempotent).
 * Usage: npx tsx scripts/backfill-reservation-buyer-snapshot.ts
 */
import { prisma } from "../lib/db";

async function main() {
  const rows = await prisma.reservation.findMany({
    where: {
      OR: [{ buyerName: null }, { buyerEmail: null }],
    },
    select: {
      id: true,
      buyerName: true,
      buyerEmail: true,
      user: { select: { name: true, email: true } },
    },
  });

  let updated = 0;
  for (const row of rows) {
    const buyerName =
      row.buyerName ??
      row.user.name?.trim() ??
      row.user.email?.trim() ??
      "Acheteur";
    const buyerEmail = row.buyerEmail ?? row.user.email ?? null;
    await prisma.reservation.update({
      where: { id: row.id },
      data: { buyerName, buyerEmail },
    });
    updated += 1;
  }

  console.log(`OK backfill buyer snapshot : ${updated} réservation(s).`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
