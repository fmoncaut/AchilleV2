import { prisma } from "../lib/db";

const BASE = process.env.ACHILLE_BASE_URL ?? "http://localhost:3000";

async function request(
  path: string,
  cookie?: string,
): Promise<{ status: number; headers: Headers; body: string }> {
  const response = await fetch(`${BASE}${path}`, {
    method: "GET",
    redirect: "manual",
    headers: cookie ? { cookie } : undefined,
  });
  const body = await response.text();
  return { status: response.status, headers: response.headers, body };
}

async function main() {
  const missing = await request("/api/out/notanofferid");
  if (missing.status !== 404) {
    throw new Error(`404 attendu pour offre inconnue, reçu ${missing.status}`);
  }

  const offer = await prisma.offer.findFirst({
    where: { isOnline: true, merchantUrl: { startsWith: "https://" } },
    select: { id: true, merchantUrl: true },
  });
  if (!offer?.merchantUrl) {
    throw new Error("Aucune offre https en ligne.");
  }

  const before = await prisma.offerClick.count({ where: { offerId: offer.id } });
  const first = await request(`/api/out/${offer.id}`);
  if (first.status !== 302) {
    throw new Error(`302 attendu, reçu ${first.status} ${first.body.slice(0, 200)}`);
  }
  const location = first.headers.get("location");
  if (location !== offer.merchantUrl) {
    throw new Error(`Location ${location} ≠ ${offer.merchantUrl}`);
  }
  const setCookie = first.headers.get("set-cookie") ?? "";
  if (!setCookie.includes("anonId=") || !setCookie.toLowerCase().includes("httponly")) {
    throw new Error(`Cookie anonId httpOnly manquant : ${setCookie}`);
  }

  const afterFirst = await prisma.offerClick.count({ where: { offerId: offer.id } });
  if (afterFirst !== before + 1) {
    throw new Error("OfferClick non créé avant redirection.");
  }

  const cookie = setCookie.split(";")[0];
  const second = await request(`/api/out/${offer.id}`, cookie);
  if (second.status !== 302) {
    throw new Error(`Second clic : 302 attendu, reçu ${second.status}`);
  }
  const afterSecond = await prisma.offerClick.count({ where: { offerId: offer.id } });
  if (afterSecond !== afterFirst) {
    throw new Error("Double-comptage : le second GET immédiat a créé un clic.");
  }

  const originalUrl = offer.merchantUrl;
  await prisma.offer.update({
    where: { id: offer.id },
    data: { merchantUrl: "ftp://example.com/x" },
  });
  try {
    const bad = await request(`/api/out/${offer.id}`, cookie);
    if (bad.status !== 400) {
      throw new Error(`400 attendu pour ftp://, reçu ${bad.status}`);
    }
  } finally {
    await prisma.offer.update({
      where: { id: offer.id },
      data: { merchantUrl: originalUrl },
    });
  }

  await prisma.offer.update({
    where: { id: offer.id },
    data: { isOnline: false },
  });
  try {
    const offline = await request(`/api/out/${offer.id}`, cookie);
    if (offline.status !== 404) {
      throw new Error(`404 attendu hors ligne, reçu ${offline.status}`);
    }
  } finally {
    await prisma.offer.update({
      where: { id: offer.id },
      data: { isOnline: true },
    });
  }

  const page = await fetch(`${BASE}/offre/perceuse-visseuse-bosch-18v`);
  const html = await page.text();
  if (!html.includes("/api/out/") || !html.includes("nofollow sponsored")) {
    throw new Error("CTA affiliation absent de la fiche offre.");
  }

  console.log("OK HTTP 302/404/400 + cookie anonId + anti-doublon.");
}

main()
  .catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
