/**
 * Cron / manuel — expiration des réservations dont pickupDeadline est dépassé.
 * Verrou advisory Postgres anti-chevauchement. Compteurs JSON en fin de run.
 */
import { prisma } from "../lib/db";
import { expireDueReservations } from "../lib/reservations/service";

/** Clé stable pg_advisory_lock (bigint) — expire-reservations only. */
const EXPIRE_LOCK_KEY = 804_141_001n;

async function tryLock(): Promise<boolean> {
  const rows = await prisma.$queryRaw<Array<{ locked: boolean }>>`
    SELECT pg_try_advisory_lock(${EXPIRE_LOCK_KEY}) AS locked
  `;
  return Boolean(rows[0]?.locked);
}

async function unlock(): Promise<void> {
  await prisma.$queryRaw`
    SELECT pg_advisory_unlock(${EXPIRE_LOCK_KEY})
  `;
}

async function main() {
  console.log(
    JSON.stringify({
      event: "expire_reservations_start",
      at: new Date().toISOString(),
    }),
  );

  const locked = await tryLock();
  if (!locked) {
    console.log(
      JSON.stringify({
        event: "expire_reservations_skipped",
        reason: "busy",
      }),
    );
    return;
  }

  try {
    const summary = await expireDueReservations();
    console.log(
      JSON.stringify({
        event: "expire_reservations_done",
        ...summary,
        treated:
          summary.expired + summary.noShow + summary.expiredClosedPos,
      }),
    );
    if (summary.errors > 0) {
      process.exitCode = 1;
    }
  } finally {
    await unlock();
  }
}

main()
  .catch((error) => {
    console.error(
      JSON.stringify({
        event: "expire_reservations_fatal",
        error: error instanceof Error ? error.message : String(error),
      }),
    );
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
