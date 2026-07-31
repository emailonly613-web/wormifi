const CACHE_PREFIX = "wormifi-app-shell-";
const CACHE_NAME = `${CACHE_PREFIX}v11`;
const CANONICAL_PAGE_URLS = [
  "/",
  "/how-to-play.html",
  "/multiplayer.html",
  "/pirate-treasure.html",
  "/guides.html",
  "/wormifi-vs-snake-io.html",
  "/snake-io-vs-slither-io.html",
  "/wormifi-vs-wormate.html",
  "/snake-wars-games.html",
  "/worm-games-with-friends.html",
  "/black-pearl-relay.html",
  "/game-speeds-harbor-classic-tempest.html",
  "/what-is-an-io-game.html",
  "/devlog.html",
  "/devlog-one-server-authority.html",
  "/devlog-conserved-mass.html",
  "/devlog-animated-materials.html",
  "/devlog-60fps-budget.html",
  "/devlog-no-app-store.html",
  "/devlog-skins-stay-cosmetic.html",
  "/roadmap.html",
  "/wormifi-vs-slither-io.html",
  "/games-like-wormate.html",
  "/games-like-worms-zone.html",
  "/games-like-little-big-snake.html",
  "/snake-games.html",
  "/multiplayer-snake-game.html",
  "/offline-worm-games.html",
  "/browser-games-no-download.html",
  "/mobile-worm-game-controls.html",
  "/worm-game-skins.html",
  "/worm-game-glossary.html",
  "/faq.html",
  "/changelog.html",
  "/games-like-slither-io.html",
  "/worm-games.html",
  "/how-to-win-worm-arena-games.html",
  "/install.html",
  "/press.html",
  "/privacy.html",
];
const STATIC_URLS = [
  "/manifest.webmanifest",
  "/icon.svg",
  "/icons/wormifi-180.png",
  "/icons/wormifi-192.png",
  "/icons/wormifi-512.png",
  "/icons/wormifi-maskable-192.png",
  "/icons/wormifi-maskable-512.png",
];

function discoverBuildAssets(html) {
  const urls = new Set();
  const attributes = /(?:src|href)=["']([^"']+)["']/gu;
  for (const match of html.matchAll(attributes)) {
    const value = match[1];
    if (!value) continue;
    const url = new URL(value, self.location.origin);
    if (url.origin === self.location.origin && url.pathname.startsWith("/assets/")) {
      urls.add(url.pathname);
    }
  }
  return [...urls];
}

function cacheKey(pathname) {
  return new Request(new URL(pathname, self.location.origin).href);
}

async function cacheShellUrl(cache, pathname) {
  const request = new Request(new URL(pathname, self.location.origin).href, {
    cache: "no-store",
    credentials: "same-origin",
  });
  const response = await fetch(request);
  if (!response.ok) throw new Error(`${pathname} returned ${response.status}`);
  await cache.put(cacheKey(pathname), response);
}

async function cacheBuiltShell() {
  const cache = await caches.open(CACHE_NAME);
  const buildAssets = new Set();
  await Promise.all(CANONICAL_PAGE_URLS.map(async (pathname) => {
    const pageRequest = new Request(new URL(pathname, self.location.origin).href, {
      cache: "no-store",
      credentials: "same-origin",
    });
    const pageResponse = await fetch(pageRequest);
    if (!pageResponse.ok) throw new Error(`${pathname} returned ${pageResponse.status}`);
    const html = await pageResponse.clone().text();
    for (const asset of discoverBuildAssets(html)) buildAssets.add(asset);
    await cache.put(cacheKey(pathname), pageResponse);
  }));
  await Promise.all(
    [...STATIC_URLS, ...buildAssets].map((pathname) => cacheShellUrl(cache, pathname)),
  );
}

self.addEventListener("install", (event) => {
  event.waitUntil(cacheBuiltShell());
});

self.addEventListener("message", (event) => {
  if (event.data?.type === "SKIP_WAITING") self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(
      keys
        .filter((key) => key.startsWith(CACHE_PREFIX) && key !== CACHE_NAME)
        .map((key) => caches.delete(key)),
    );
    await self.clients.claim();
  })());
});

async function navigationResponse(request) {
  const pathname = new URL(request.url).pathname;
  const canonicalPage = CANONICAL_PAGE_URLS.includes(pathname);
  try {
    const response = await fetch(new Request(request, { cache: "no-store" }));
    if (response.ok && canonicalPage) {
      const cache = await caches.open(CACHE_NAME);
      await cache.put(cacheKey(pathname), response.clone());
    }
    return response;
  } catch {
    const cached = canonicalPage
      ? await caches.match(cacheKey(pathname), { ignoreVary: true })
      : undefined;
    return cached || new Response("This Wormifi page is unavailable offline until one online visit completes.", {
      status: 503,
      headers: { "content-type": "text/plain; charset=utf-8" },
    });
  }
}

async function staticResponse(request) {
  const pathname = new URL(request.url).pathname;
  const key = cacheKey(pathname);
  const cached = await caches.match(key, { ignoreVary: true });
  if (cached) return cached;
  const response = await fetch(request);
  if (response.ok) {
    const cache = await caches.open(CACHE_NAME);
    await cache.put(key, response.clone());
  }
  return response;
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (request.mode === "navigate") {
    event.respondWith(navigationResponse(request));
    return;
  }
  const cacheableStatic = url.pathname.startsWith("/assets/") ||
    url.pathname.startsWith("/icons/") ||
    url.pathname === "/icon.svg" ||
    url.pathname === "/manifest.webmanifest";
  if (cacheableStatic) event.respondWith(staticResponse(request));
});
