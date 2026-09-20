import { getClickDashboard } from "../lib/admin/clicks";
import {
  CLICK_DEDUP_WINDOW_SECONDS,
  recordOfferClick,
} from "../lib/affiliation";
import { prisma } from "../lib/db";
import { isAbsoluteHttpUrl } from "../lib/merchant-url";

async function main() {
  if (!isAbsoluteHttpUrl("https://www.bricomarche.com/p/x")) {
    throw new Error("https absolue doit être acceptée");
  }
  if (isAbsoluteHttpUrl("ftp://example.com") || isAbsoluteHttpUrl("javascript:alert(1)")) {
    throw new Error("URL non http(s) doit être refusée");
  }

  const brico = await prisma.merchant.findUnique({ where: { slug: "bricomarche" } });
  const aline = await prisma.merchant.findUnique({ where: { slug: "alinea" } });
  if (!brico || !aline) {
    throw new Error("Seed incomplet : enseignes bricomarche / alinea absentes.");
  }

  const bricoOffer = await prisma.offer.findFirst({
    where: { merchantId: brico.id, isOnline: true, merchantUrl: { not: null } },
    select: { id: true },
  });
  const alineOffer = await prisma.offer.findFirst({
    where: { merchantId: aline.id, isOnline: true, merchantUrl: { not: null } },
    select: { id: true },
  });
  if (!bricoOffer || !alineOffer) {
    throw new Error("Seed incomplet : offres en ligne avec merchantUrl manquantes.");
  }

  const beforeBrico = await getClickDashboard(brico.id, 7);
  const beforeAdmin = await getClickDashboard(null, 7);
  const sessionBrico = crypto.randomUUID();
  const sessionAlinea = crypto.randomUUID();

  const first = await recordOfferClick({
    offerId: bricoOffer.id,
    userId: null,
    sessionId: sessionBrico,
    referrer: "http://localhost:3000/offre/perceuse",
  });
  const dup = await recordOfferClick({
    offerId: bricoOffer.id,
    userId: null,
    sessionId: sessionBrico,
    referrer: "http://localhost:3000/offre/perceuse",
  });
  const alineClick = await recordOfferClick({
    offerId: alineOffer.id,
    userId: null,
    sessionId: sessionAlinea,
    referrer: "http://localhost:3000/offre/canape",
  });

  if (!first.recorded || dup.recorded || !alineClick.recorded) {
    throw new Error(
      `Anti-doublon / insert inattendu (fenêtre ${CLICK_DEDUP_WINDOW_SECONDS}s).`,
    );
  }

  try {
    const afterBrico = await getClickDashboard(brico.id, 7);
    const afterAdmin = await getClickDashboard(null, 7);

    if (afterBrico.total !== beforeBrico.total + 1) {
      throw new Error("Isolation cassée : le marchand Bricomarché doit gagner 1 clic.");
    }
    if (afterBrico.byMerchant.some((row) => row.merchantId === aline.id)) {
      throw new Error("Isolation cassée : Alinea apparaît dans le dashboard Bricomarché.");
    }
    if (afterAdmin.total !== beforeAdmin.total + 2) {
      throw new Error("ADMIN doit voir les clics des deux enseignes.");
    }
  } finally {
    await prisma.offerClick.deleteMany({
      where: { sessionId: { in: [sessionBrico, sessionAlinea] } },
    });
  }

  console.log("OK isolation renvois + anti-doublon 60s.");
}

main()
  .catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
