const CACHE_SHELL = "achille-shell-v1";
const CACHE_PAGES = "achille-pages-v1";
const OFFLINE_URL = "/offline";
const PRECACHE = ["/", OFFLINE_URL, "/icon-192", "/icon-512"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_SHELL)
      .then((cache) => cache.addAll(PRECACHE))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key !== CACHE_SHELL && key !== CACHE_PAGES)
            .map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

function shouldBypassCache(url) {
  if (url.pathname.startsWith("/api/out")) {
    return true;
  }
  if (url.pathname.startsWith("/api/")) {
    return true;
  }
  if (url.pathname.startsWith("/admin")) {
    return true;
  }
  if (url.pathname.startsWith("/compte")) {
    return true;
  }
  return false;
}

function isKeyPage(url) {
  return url.pathname === "/" || url.pathname === "/recherche";
}

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") {
    return;
  }

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) {
    return;
  }

  if (shouldBypassCache(url)) {
    event.respondWith(fetch(request));
    return;
  }

  if (request.mode === "navigate") {
    event.respondWith(networkFirstNavigation(request, url));
    return;
  }

  if (url.pathname.startsWith("/_next/static/")) {
    event.respondWith(cacheFirst(request, CACHE_SHELL));
    return;
  }

  event.respondWith(fetch(request).catch(() => caches.match(request)));
});

async function networkFirstNavigation(request, url) {
  try {
    const response = await fetch(request);
    if (response.ok && isKeyPage(url)) {
      const cache = await caches.open(CACHE_PAGES);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    const cached =
      (await caches.match(request)) || (await caches.match(OFFLINE_URL));
    if (cached) {
      return cached;
    }
    return new Response("Hors ligne", {
      status: 503,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }
}

async function cacheFirst(request, cacheName) {
  const cached = await caches.match(request);
  if (cached) {
    return cached;
  }
  const response = await fetch(request);
  if (response.ok) {
    const cache = await caches.open(cacheName);
    cache.put(request, response.clone());
  }
  return response;
}
