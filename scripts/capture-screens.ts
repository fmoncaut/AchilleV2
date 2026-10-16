/**
 * QA/UX — inventaire visuel (desktop 1440 + mobile 390).
 *
 * Usage :
 *   BASE_URL=https://staging.akwire.fr ENV=staging npm run capture:staging
 *   BASE_URL=https://…cleverapps.io ENV=prod npm run capture:prod
 *
 * Auth staging (optionnel) :
 *   CAPTURE_DATABASE_URL=postgresql://…  (sinon `clever env --alias staging`)
 *   CAPTURE_TEST_EMAIL=buyer@…           (sinon 1er user avec réservation / e-mail)
 *
 * Sortie : screenshots/<env>/<desktop|mobile>/<slug>.png + screenshots/index.html
 */
import { execSync } from "node:child_process";
import { createHash, randomUUID } from "node:crypto";
import {
  mkdirSync,
  readdirSync,
  writeFileSync,
  existsSync,
} from "node:fs";
import { join } from "node:path";

import { PrismaClient, type ReservationStatus } from "@prisma/client";
import { chromium, type Browser, type BrowserContext, type Page } from "playwright";

type EnvName = "staging" | "prod";
type ViewportName = "desktop" | "mobile";

type CaptureResult = {
  env: EnvName;
  viewport: ViewportName;
  slug: string;
  route: string;
  group: string;
  ok: boolean;
  error?: string;
  file?: string;
};

const VIEWPORTS: Record<
  ViewportName,
  { width: number; height: number; deviceScaleFactor: number }
> = {
  desktop: { width: 1440, height: 900, deviceScaleFactor: 1 },
  mobile: { width: 390, height: 844, deviceScaleFactor: 2 },
};

const MAP_EXTRA_WAIT_MS = 2_500;
const NETWORK_IDLE_TIMEOUT_MS = 25_000;
const SESSION_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;

const DEFAULT_BASE: Record<EnvName, string> = {
  staging: "https://staging.akwire.fr",
  prod: "https://app-3c244888-8706-4ae8-9cb3-e480c257e386.cleverapps.io",
};

function requireEnv(): { baseUrl: string; env: EnvName } {
  const arg = (process.argv[2] ?? process.env.ENV ?? "").trim().toLowerCase();
  if (arg !== "staging" && arg !== "prod") {
    throw new Error("Usage : tsx scripts/capture-screens.ts staging|prod");
  }
  const baseUrl = (process.env.BASE_URL ?? DEFAULT_BASE[arg])
    .trim()
    .replace(/\/$/, "");
  if (!baseUrl.startsWith("http")) {
    throw new Error("BASE_URL https://… invalide.");
  }
  return { baseUrl, env: arg };
}

function slugifyRoute(route: string): string {
  const path = route.split("?")[0] ?? route;
  if (path === "/" || path === "") return "home";
  return path
    .replace(/^\//, "")
    .replace(/\/+/g, "__")
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 120);
}

async function parseSitemap(baseUrl: string): Promise<{
  offerSlug: string | null;
  storeSlug: string | null;
  electrodepotSlug: string | null;
  cityCategory: string | null;
}> {
  const res = await fetch(`${baseUrl}/sitemap.xml`);
  const empty = {
    offerSlug: null as string | null,
    storeSlug: null as string | null,
    electrodepotSlug: null as string | null,
    cityCategory: null as string | null,
  };
  if (!res.ok) return empty;
  const xml = await res.text();
  const locs = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]!);

  for (const loc of locs) {
    try {
      const u = new URL(loc);
      const parts = u.pathname.split("/").filter(Boolean);
      if (parts[0] === "offre" && parts[1] && !empty.offerSlug) {
        empty.offerSlug = parts[1];
      }
      if (parts[0] === "magasin" && parts[1]) {
        if (!empty.storeSlug) empty.storeSlug = parts[1];
        if (parts[1].includes("electrodepot") && !empty.electrodepotSlug) {
          empty.electrodepotSlug = parts[1];
        }
      }
      if (
        parts.length === 2 &&
        ![
          "offre",
          "magasin",
          "compte",
          "admin",
          "login",
          "api",
          "reservation",
        ].includes(parts[0]!) &&
        !empty.cityCategory
      ) {
        empty.cityCategory = `${parts[0]}/${parts[1]}`;
      }
    } catch {
      /* ignore */
    }
  }

  return empty;
}

/** Soft-launch prod : POS R2 absents du sitemap (0 offre) — probe via staging. */
async function resolveElectrodepotSlug(baseUrl: string): Promise<string | null> {
  const staging = await parseSitemap("https://staging.akwire.fr");
  const candidates = [
    staging.electrodepotSlug,
    "electrodepot-electro-depot-frejus-83600",
  ].filter(Boolean) as string[];

  for (const slug of candidates) {
    try {
      const res = await fetch(`${baseUrl}/magasin/${slug}`, {
        method: "GET",
        redirect: "manual",
      });
      if (res.ok) return slug;
    } catch {
      /* try next */
    }
  }
  return null;
}

function cleverEnvValue(alias: string, key: string): string | null {
  try {
    const out = execSync(`clever env --alias ${alias}`, {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    });
    for (const line of out.split(/\r?\n/)) {
      const i = line.indexOf("=");
      if (i <= 0) continue;
      if (line.slice(0, i) === key) {
        return line.slice(i + 1).trim();
      }
    }
  } catch {
    return null;
  }
  return null;
}

function resolveCaptureDatabaseUrl(env: EnvName): string | null {
  const direct =
    process.env.CAPTURE_DATABASE_URL?.trim() ||
    (env === "staging"
      ? process.env.STAGING_DATABASE_URL?.trim()
      : process.env.PROD_DATABASE_URL?.trim()) ||
    "";
  if (direct) return direct;
  if (env === "staging") {
    return cleverEnvValue("staging", "DATABASE_URL");
  }
  return null;
}

async function dismissOverlays(page: Page): Promise<void> {
  const consent = page.getByRole("button", {
    name: /J’ai compris|Cookies techniques|Accepter la mesure/i,
  });
  try {
    if (await consent.first().isVisible({ timeout: 1_500 })) {
      await consent.first().click({ timeout: 2_000 });
      await page.waitForTimeout(300);
    }
  } catch {
    /* pas de bannière */
  }
}

async function settlePage(page: Page, route: string): Promise<void> {
  await page.waitForLoadState("domcontentloaded").catch(() => undefined);
  await page
    .waitForLoadState("networkidle", { timeout: NETWORK_IDLE_TIMEOUT_MS })
    .catch(() => undefined);
  await dismissOverlays(page);
  const wantsMap =
    route === "/" ||
    route.startsWith("/recherche") ||
    route.includes("vue=carte");
  if (wantsMap) {
    await page
      .locator(".maplibregl-canvas, canvas.maplibregl-canvas")
      .first()
      .waitFor({ state: "visible", timeout: 8_000 })
      .catch(() => undefined);
    await page.waitForTimeout(MAP_EXTRA_WAIT_MS);
  } else {
    await page.waitForTimeout(400);
  }
}

async function captureRoute(
  page: Page,
  opts: {
    env: EnvName;
    viewport: ViewportName;
    baseUrl: string;
    route: string;
    group: string;
    outDir: string;
    results: CaptureResult[];
  },
): Promise<void> {
  const { env, viewport, baseUrl, route, group, outDir, results } = opts;
  const slug = slugifyRoute(route);
  const file = join(outDir, `${slug}.png`);
  const url = `${baseUrl}${route.startsWith("/") ? route : `/${route}`}`;

  try {
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 45_000 });
    await settlePage(page, route);
    await page.screenshot({ path: file, fullPage: true });
    results.push({
      env,
      viewport,
      slug,
      route,
      group,
      ok: true,
      file: `${env}/${viewport}/${slug}.png`,
    });
    console.log(`OK  [${viewport}] ${route}`);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    results.push({
      env,
      viewport,
      slug,
      route,
      group,
      ok: false,
      error: message.slice(0, 240),
    });
    console.error(`FAIL [${viewport}] ${route} — ${message.slice(0, 160)}`);
  }
}

type AuthBundle = {
  prisma: PrismaClient;
  userId: string;
  email: string;
  reservationId: string | null;
  pickedUpId: string | null;
  directOffer: { offerId: string; posId: string; productSlug: string } | null;
  restoreOnboarding: Date | null;
};

async function prepareAuth(env: EnvName): Promise<AuthBundle | null> {
  if (env !== "staging") return null;

  const databaseUrl = resolveCaptureDatabaseUrl(env);
  if (!databaseUrl) {
    console.warn(
      "Auth staging ignorée : CAPTURE_DATABASE_URL / STAGING_DATABASE_URL / clever env manquant.",
    );
    return null;
  }

  const prisma = new PrismaClient({
    datasources: { db: { url: databaseUrl } },
  });

  const preferred = process.env.CAPTURE_TEST_EMAIL?.trim().toLowerCase();
  const user =
    (preferred
      ? await prisma.user.findFirst({
          where: { email: preferred, deletedAt: null },
          select: {
            id: true,
            email: true,
            onboardingCompletedAt: true,
          },
        })
      : null) ??
    (await prisma.user.findFirst({
      where: {
        deletedAt: null,
        email: { not: null },
        reservations: { some: {} },
      },
      orderBy: { createdAt: "desc" },
      select: { id: true, email: true, onboardingCompletedAt: true },
    })) ??
    (await prisma.user.findFirst({
      where: { deletedAt: null, email: { not: null }, role: "USER" },
      orderBy: { createdAt: "asc" },
      select: { id: true, email: true, onboardingCompletedAt: true },
    }));

  if (!user?.email) {
    console.warn("Auth staging ignorée : aucun utilisateur e-mail trouvé.");
    await prisma.$disconnect();
    return null;
  }

  const reservation = await prisma.reservation.findFirst({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    select: { id: true, status: true },
  });
  const pickedUp = await prisma.reservation.findFirst({
    where: { userId: user.id, status: "PICKED_UP" as ReservationStatus },
    orderBy: { pickedUpAt: "desc" },
    select: { id: true },
  });

  const directOfferRow = await prisma.offer.findFirst({
    where: {
      kind: "DIRECT",
      stock: { gt: 0 },
      isOnline: true,
      merchant: { isActive: true, chargesEnabled: true },
      OR: [
        { posId: { not: null }, pos: { status: "ACTIVE_VISIBLE" } },
        { targetedPos: { some: { pos: { status: "ACTIVE_VISIBLE" } } } },
      ],
    },
    select: {
      id: true,
      posId: true,
      product: { select: { slug: true } },
      targetedPos: {
        take: 1,
        select: { posId: true },
      },
    },
  });

  const posId =
    directOfferRow?.posId ?? directOfferRow?.targetedPos[0]?.posId ?? null;

  // Force l’écran onboarding pour la capture, puis restauration.
  const restoreOnboarding = user.onboardingCompletedAt;
  await prisma.user.update({
    where: { id: user.id },
    data: { onboardingCompletedAt: null },
  });

  console.log(
    `Auth staging : ${user.email} (resa=${reservation?.id ?? "—"}, pickedUp=${pickedUp?.id ?? "—"})`,
  );

  return {
    prisma,
    userId: user.id,
    email: user.email,
    reservationId: reservation?.id ?? null,
    pickedUpId: pickedUp?.id ?? null,
    directOffer:
      directOfferRow && posId
        ? {
            offerId: directOfferRow.id,
            posId,
            productSlug: directOfferRow.product.slug,
          }
        : null,
    restoreOnboarding,
  };
}

async function injectSession(
  context: BrowserContext,
  auth: AuthBundle,
  baseUrl: string,
): Promise<void> {
  const sessionToken = randomUUID();
  const expires = new Date(Date.now() + SESSION_MAX_AGE_MS);
  await auth.prisma.session.create({
    data: {
      sessionToken,
      userId: auth.userId,
      expires,
    },
  });

  const host = new URL(baseUrl).hostname;
  const secure = baseUrl.startsWith("https://");
  await context.addCookies([
    {
      name: secure ? "__Secure-authjs.session-token" : "authjs.session-token",
      value: sessionToken,
      domain: host,
      path: "/",
      httpOnly: true,
      secure,
      sameSite: "Lax",
      expires: Math.floor(expires.getTime() / 1000),
    },
  ]);
}

/** Login OTP UI : injecte un code connu en base puis le soumet (filet si cookie insuffisant). */
async function loginViaOtpUi(
  page: Page,
  auth: AuthBundle,
  baseUrl: string,
): Promise<boolean> {
  const secret =
    process.env.CAPTURE_AUTH_SECRET?.trim() ||
    process.env.AUTH_SECRET?.trim() ||
    cleverEnvValue("staging", "AUTH_SECRET");
  if (!secret) {
    console.warn("OTP UI : AUTH_SECRET staging introuvable — cookie session seulement.");
    return false;
  }

  const code = "424242";
  const token = createHash("sha256").update(`${code}${secret}`).digest("hex");
  const expires = new Date(Date.now() + 10 * 60 * 1000);

  await auth.prisma.verificationToken.deleteMany({
    where: { identifier: auth.email },
  });
  await auth.prisma.verificationToken.create({
    data: { identifier: auth.email, token, expires },
  });
  await auth.prisma.emailOtpChallenge.upsert({
    where: { email: auth.email },
    create: {
      email: auth.email,
      attempts: 0,
      lastSentAt: new Date(),
      expiresAt: expires,
    },
    update: {
      attempts: 0,
      lastSentAt: new Date(),
      expiresAt: expires,
    },
  });

  await page.goto(
    `${baseUrl}/login/otp?email=${encodeURIComponent(auth.email)}&callbackUrl=${encodeURIComponent("/compte")}`,
    { waitUntil: "domcontentloaded" },
  );
  await settlePage(page, "/login/otp");
  await page.fill("#code", code);
  await Promise.all([
    page.waitForURL(/\/compte/, { timeout: 20_000 }).catch(() => undefined),
    page.getByRole("button", { name: /Valider|Connexion|Continuer/i }).click(),
  ]);
  return page.url().includes("/compte");
}

async function captureTunnelBestEffort(
  page: Page,
  opts: {
    env: EnvName;
    viewport: ViewportName;
    baseUrl: string;
    outDir: string;
    results: CaptureResult[];
    auth: AuthBundle;
  },
): Promise<void> {
  const { env, viewport, baseUrl, outDir, results, auth } = opts;
  if (!auth.directOffer) {
    results.push({
      env,
      viewport,
      slug: "tunnel",
      route: "/reservation (tunnel)",
      group: "tunnel",
      ok: false,
      error: "Aucune offre DIRECT réservable (chargesEnabled) — passe manuelle.",
    });
    console.warn(`SKIP [${viewport}] tunnel — pas d'offre DIRECT`);
    return;
  }

  const offerRoute = `/offre/${auth.directOffer.productSlug}`;
  try {
    await page.goto(`${baseUrl}${offerRoute}`, {
      waitUntil: "domcontentloaded",
      timeout: 45_000,
    });
    await settlePage(page, offerRoute);

    const reserve = page.getByRole("button", {
      name: /Réserver en magasin|Ajouter/i,
    });
    if (!(await reserve.first().isVisible({ timeout: 5_000 }).catch(() => false))) {
      throw new Error("Bouton réserver introuvable (offre affiliation ?).");
    }
    await reserve.first().click();
    await page
      .waitForURL(/\/reservation/, { timeout: 15_000 })
      .catch(() => undefined);
    await page.waitForTimeout(1_200);
    const afterAdd = page.url().replace(baseUrl, "") || "/";
    await settlePage(page, afterAdd);
    const recapSlug = afterAdd.startsWith("/reservation")
      ? "tunnel__recap"
      : `tunnel__after-add__${slugifyRoute(afterAdd)}`;
    await page.screenshot({
      path: join(outDir, `${recapSlug}.png`),
      fullPage: true,
    });
    results.push({
      env,
      viewport,
      slug: recapSlug,
      route: afterAdd,
      group: "tunnel",
      ok: afterAdd.startsWith("/reservation"),
      file: `${env}/${viewport}/${recapSlug}.png`,
      error: afterAdd.startsWith("/reservation")
        ? undefined
        : `Ajout panier n'a pas mené à /reservation (reste sur ${afterAdd}).`,
    });
    console.log(
      afterAdd.startsWith("/reservation")
        ? `OK  [${viewport}] tunnel recap`
        : `FAIL [${viewport}] tunnel after-add → ${afterAdd}`,
    );

    if (afterAdd.startsWith("/reservation")) {
      const next = page.getByRole("link", {
        name: /Continuer|Retrait|Payer/i,
      });
      if (await next.first().isVisible({ timeout: 3_000 }).catch(() => false)) {
        await next.first().click();
        await page.waitForTimeout(1_000);
        const nextPath = page.url().replace(baseUrl, "");
        await settlePage(page, nextPath);
        const slug = `tunnel__${slugifyRoute(nextPath || "next")}`;
        await page.screenshot({
          path: join(outDir, `${slug}.png`),
          fullPage: true,
        });
        results.push({
          env,
          viewport,
          slug,
          route: nextPath,
          group: "tunnel",
          ok: true,
          file: `${env}/${viewport}/${slug}.png`,
        });
        console.log(`OK  [${viewport}] ${nextPath}`);
      }
    }

    // Payment Element Stripe : non automatisé (3DS / iframe).
    results.push({
      env,
      viewport,
      slug: "tunnel__payment",
      route: "/reservation (Payment Element)",
      group: "tunnel",
      ok: false,
      error:
        "Payment Element + confirmation : passe manuelle guidée (Stripe test card).",
    });
    console.warn(`MANUAL [${viewport}] tunnel payment/confirmation`);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    results.push({
      env,
      viewport,
      slug: "tunnel",
      route: "/reservation (tunnel)",
      group: "tunnel",
      ok: false,
      error: message.slice(0, 240),
    });
    console.error(`FAIL [${viewport}] tunnel — ${message.slice(0, 160)}`);
  }
}

function writeContactSheet(
  root: string,
  results: CaptureResult[],
  envs: EnvName[],
): void {
  const groups = new Map<string, CaptureResult[]>();
  for (const r of results) {
    const key = `${r.group}::${r.slug}`;
    const list = groups.get(key) ?? [];
    list.push(r);
    groups.set(key, list);
  }

  const sections: string[] = [];
  const groupOrder = [
    "public",
    "auth",
    "tunnel",
    "other",
  ];

  const byGroupName = new Map<string, string[]>();
  for (const key of groups.keys()) {
    const group = key.split("::")[0] ?? "other";
    const list = byGroupName.get(group) ?? [];
    list.push(key);
    byGroupName.set(group, list);
  }

  for (const group of [
    ...groupOrder.filter((g) => byGroupName.has(g)),
    ...[...byGroupName.keys()].filter((g) => !groupOrder.includes(g)),
  ]) {
    const keys = (byGroupName.get(group) ?? []).sort();
    sections.push(`<h2 id="${group}">${group}</h2>`);
    for (const key of keys) {
      const items = groups.get(key) ?? [];
      const sample = items[0]!;
      sections.push(`<section class="shot">
  <header>
    <strong>${escapeHtml(sample.route)}</strong>
    <span class="meta">${escapeHtml(sample.slug)} · ${escapeHtml(sample.group)}</span>
  </header>
  <div class="grid">`);
      for (const env of envs) {
        for (const vp of ["desktop", "mobile"] as ViewportName[]) {
          const hit = items.find((i) => i.env === env && i.viewport === vp);
          if (hit?.ok && hit.file) {
            sections.push(`<figure>
  <figcaption>${env} · ${vp}</figcaption>
  <a href="${hit.file}" target="_blank"><img src="${hit.file}" alt="${escapeHtml(hit.route)} ${env} ${vp}" loading="lazy" /></a>
</figure>`);
          } else {
            const err = hit?.error ?? "non capturé";
            sections.push(`<figure class="fail">
  <figcaption>${env} · ${vp}</figcaption>
  <div class="err">${escapeHtml(err)}</div>
</figure>`);
          }
        }
      }
      sections.push(`</div></section>`);
    }
  }

  const failed = results.filter((r) => !r.ok);
  const html = `<!doctype html>
<html lang="fr">
<head>
  <meta charset="utf-8" />
  <title>Akwire — inventaire visuel QA/UX</title>
  <style>
    :root { color-scheme: light; font-family: ui-sans-serif, system-ui, sans-serif; }
    body { margin: 0; background: #f6f5f1; color: #13263f; }
    header.top { position: sticky; top: 0; background: #13263f; color: #f6f5f1; padding: 1rem 1.25rem; z-index: 2; }
    header.top a { color: #f7a325; margin-right: 1rem; }
    main { padding: 1.25rem; max-width: 1800px; margin: 0 auto; }
    h2 { margin: 2rem 0 1rem; text-transform: uppercase; letter-spacing: .06em; font-size: .85rem; color: #fe9800; }
    .shot { background: #fff; border-radius: 16px; padding: 1rem; margin-bottom: 1.25rem; box-shadow: 0 8px 24px rgba(19,38,63,.08); }
    .shot header { display: flex; flex-wrap: wrap; gap: .5rem 1rem; align-items: baseline; margin-bottom: .75rem; }
    .shot .meta { color: #73777e; font-size: .85rem; }
    .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: .75rem; }
    figure { margin: 0; background: #f2f4f7; border-radius: 12px; overflow: hidden; }
    figcaption { font-size: .75rem; padding: .4rem .6rem; background: #13263f; color: #f6f5f1; }
    img { display: block; width: 100%; height: auto; background: #fff; }
    .fail .err { padding: 1rem; font-size: .85rem; color: #8b1e1e; }
    .summary { background: #fff; border-radius: 16px; padding: 1rem 1.25rem; margin-bottom: 1.5rem; }
    .summary li { margin: .25rem 0; }
  </style>
</head>
<body>
  <header class="top">
    <div><strong>akwire</strong> · inventaire visuel QA/UX</div>
    <nav>${groupOrder.map((g) => `<a href="#${g}">${g}</a>`).join("")}</nav>
  </header>
  <main>
    <div class="summary">
      <p><strong>${results.filter((r) => r.ok).length}</strong> OK · <strong>${failed.length}</strong> échec / manuel · généré ${new Date().toISOString()}</p>
      ${
        failed.length
          ? `<ul>${failed
              .map(
                (f) =>
                  `<li><code>${escapeHtml(f.env)}/${escapeHtml(f.viewport)}</code> ${escapeHtml(f.route)} — ${escapeHtml(f.error ?? "")}</li>`,
              )
              .join("")}</ul>`
          : "<p>Aucun échec.</p>"
      }
    </div>
    ${sections.join("\n")}
  </main>
</body>
</html>`;

  writeFileSync(join(root, "index.html"), html, "utf8");
  console.log(`Contact sheet → ${join(root, "index.html")}`);
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function mergeAllResults(root: string, fresh: CaptureResult[]): CaptureResult[] {
  // Conserve les captures des autres env déjà présentes sur disque.
  const merged = [...fresh];
  for (const envName of ["staging", "prod"] as EnvName[]) {
    for (const vp of ["desktop", "mobile"] as ViewportName[]) {
      const dir = join(root, envName, vp);
      if (!existsSync(dir)) continue;
      if (fresh.some((r) => r.env === envName && r.viewport === vp)) continue;
      for (const file of readdirSync(dir).filter((f) => f.endsWith(".png"))) {
        const slug = file.replace(/\.png$/, "");
        merged.push({
          env: envName,
          viewport: vp,
          slug,
          route: `/${slug.replace(/__/g, "/")}`,
          group: slug.startsWith("compte") || slug === "onboarding" ? "auth" : slug.startsWith("tunnel") ? "tunnel" : "public",
          ok: true,
          file: `${envName}/${vp}/${file}`,
        });
      }
    }
  }
  return merged;
}

async function main(): Promise<void> {
  const { baseUrl, env } = requireEnv();
  const root = join(process.cwd(), "screenshots");
  mkdirSync(root, { recursive: true });

  const sitemap = await parseSitemap(baseUrl);
  let storeSlug =
    env === "prod"
      ? sitemap.electrodepotSlug ?? sitemap.storeSlug
      : sitemap.storeSlug ?? sitemap.electrodepotSlug;
  if (!storeSlug || (env === "prod" && !storeSlug.includes("electrodepot"))) {
    storeSlug =
      (await resolveElectrodepotSlug(baseUrl)) ?? storeSlug ?? null;
  }

  const publicRoutes: { route: string; group: string }[] = [
    { route: "/", group: "public" },
    { route: "/recherche?q=Paris", group: "public" },
    { route: "/recherche?q=Paris&vue=carte", group: "public" },
    ...(sitemap.offerSlug
      ? [{ route: `/offre/${sitemap.offerSlug}`, group: "public" }]
      : []),
    ...(storeSlug ? [{ route: `/magasin/${storeSlug}`, group: "public" }] : []),
    ...(sitemap.cityCategory
      ? [{ route: `/${sitemap.cityCategory}`, group: "public" }]
      : []),
    { route: "/login", group: "public" },
    {
      route: "/login/otp?email=qa-capture%40akwire.fr&callbackUrl=%2Fcompte",
      group: "public",
    },
    { route: "/cgu", group: "public" },
    { route: "/mentions-legales", group: "public" },
    { route: "/confidentialite", group: "public" },
    { route: "/offline", group: "public" },
    { route: "/cette-route-nexiste-pas-qa-404", group: "public" },
  ];

  if (!sitemap.offerSlug) {
    console.warn(
      "Sitemap : aucune /offre/[slug] — état vide soft-launch (offre sautée).",
    );
  }
  if (!storeSlug) {
    console.warn("Aucun /magasin/[slug] résolu — capture magasin sautée.");
  } else if (env === "prod") {
    console.log(`Prod magasin R2 : /magasin/${storeSlug}`);
  }
  if (!sitemap.cityCategory) {
    console.warn(
      "Sitemap : aucun /[ville]/[categorie] — état vide soft-launch.",
    );
  }

  const results: CaptureResult[] = [];
  let auth: AuthBundle | null = null;
  try {
    auth = await prepareAuth(env);
  } catch (error) {
    console.warn(
      "Auth staging indisponible:",
      error instanceof Error ? error.message : error,
    );
  }

  const browser: Browser = await chromium.launch({ headless: true });

  try {
    for (const viewport of ["desktop", "mobile"] as ViewportName[]) {
      const outDir = join(root, env, viewport);
      mkdirSync(outDir, { recursive: true });
      const context = await browser.newContext({
        viewport: {
          width: VIEWPORTS[viewport].width,
          height: VIEWPORTS[viewport].height,
        },
        deviceScaleFactor: VIEWPORTS[viewport].deviceScaleFactor,
        locale: "fr-FR",
        colorScheme: "light",
      });
      const page = await context.newPage();

      for (const { route, group } of publicRoutes) {
        await captureRoute(page, {
          env,
          viewport,
          baseUrl,
          route,
          group,
          outDir,
          results,
        });
      }

      if (auth) {
        await injectSession(context, auth, baseUrl);
        // Vérifie la session ; sinon OTP UI.
        await page.goto(`${baseUrl}/compte/onboarding`, {
          waitUntil: "domcontentloaded",
        });
        if (!page.url().includes("/compte")) {
          const ok = await loginViaOtpUi(page, auth, baseUrl);
          if (!ok) {
            results.push({
              env,
              viewport,
              slug: "auth-login",
              route: "/compte/*",
              group: "auth",
              ok: false,
              error: "Session cookie + OTP UI ont échoué.",
            });
          }
        }

        // Remet onboarding null juste avant capture (au cas où OTP a complété autre chose).
        await auth.prisma.user.update({
          where: { id: auth.userId },
          data: { onboardingCompletedAt: null },
        });

        const authRoutes: { route: string; group: string }[] = [
          { route: "/compte/onboarding", group: "auth" },
        ];

        // Restaure onboarding pour le reste du compte.
        await auth.prisma.user.update({
          where: { id: auth.userId },
          data: {
            onboardingCompletedAt: auth.restoreOnboarding ?? new Date(),
          },
        });

        authRoutes.push(
          { route: "/compte", group: "auth" },
          { route: "/compte/favoris", group: "auth" },
          { route: "/compte/reservations", group: "auth" },
          { route: "/compte/reglages/profil", group: "auth" },
          { route: "/compte/reglages/interets", group: "auth" },
          { route: "/compte/reglages/notifications", group: "auth" },
          { route: "/compte/reglages/compte", group: "auth" },
        );
        if (auth.reservationId) {
          authRoutes.push({
            route: `/compte/reservations/${auth.reservationId}`,
            group: "auth",
          });
        } else {
          results.push({
            env,
            viewport,
            slug: "compte__reservations__id",
            route: "/compte/reservations/[id]",
            group: "auth",
            ok: false,
            error: "Aucune réservation pour l’utilisateur de test.",
          });
        }
        if (auth.pickedUpId) {
          authRoutes.push({
            route: `/compte/reservations/${auth.pickedUpId}/facture`,
            group: "auth",
          });
        } else {
          results.push({
            env,
            viewport,
            slug: "compte__reservations__facture",
            route: "/compte/reservations/[id]/facture",
            group: "auth",
            ok: false,
            error: "Aucune réservation PICKED_UP — facture non capturée.",
          });
        }

        // Capture onboarding d’abord (re-null).
        await auth.prisma.user.update({
          where: { id: auth.userId },
          data: { onboardingCompletedAt: null },
        });
        await captureRoute(page, {
          env,
          viewport,
          baseUrl,
          route: "/compte/onboarding",
          group: "auth",
          outDir,
          results,
        });
        await auth.prisma.user.update({
          where: { id: auth.userId },
          data: {
            onboardingCompletedAt: auth.restoreOnboarding ?? new Date(),
          },
        });

        for (const { route, group } of authRoutes.filter(
          (r) => r.route !== "/compte/onboarding",
        )) {
          await captureRoute(page, {
            env,
            viewport,
            baseUrl,
            route,
            group,
            outDir,
            results,
          });
        }

        await captureTunnelBestEffort(page, {
          env,
          viewport,
          baseUrl,
          outDir,
          results,
          auth,
        });
      }

      await context.close();
    }
  } finally {
    await browser.close();
    if (auth) {
      try {
        await auth.prisma.user.update({
          where: { id: auth.userId },
          data: {
            onboardingCompletedAt: auth.restoreOnboarding,
          },
        });
      } catch (error) {
        console.warn(
          "Restauration onboarding échouée:",
          error instanceof Error ? error.message : error,
        );
      }
      await auth.prisma.$disconnect();
    }
  }

  const merged = mergeAllResults(root, results);
  writeContactSheet(root, merged, ["staging", "prod"]);

  const ok = results.filter((r) => r.ok).length;
  const fail = results.filter((r) => !r.ok);
  console.log("\n=== Résumé ===");
  console.log(`${env} @ ${baseUrl}`);
  console.log(`Capturés OK : ${ok}`);
  console.log(`Échecs / manuels : ${fail.length}`);
  for (const f of fail) {
    console.log(` - [${f.viewport}] ${f.route} :: ${f.error}`);
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
