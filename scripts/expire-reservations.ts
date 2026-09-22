import { expireDueReservations } from "../lib/reservations/service";
import { prisma } from "../lib/db";

async function main() {
  const count = await expireDueReservations();
  console.log(`${count} réservation(s) passée(s) en EXPIRED.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
