/**
 * LIRA service worker.
 *
 * The tablet is brought online once, the app is opened and installed, and from
 * then on it has to work with no network at all. That is a stronger promise
 * than "cache what the reader happened to visit": by the time the reader is
 * offline, every page, every build asset and all the book data must already be
 * on the device.
 *
 * So installation does a full sweep rather than waiting for traffic. For each
 * route it stores the HTML, the React flight payload the client router asks
 * for when navigating, and every /_next/static asset the HTML references.
 *
 * Once installed, requests are served cache-first and refreshed in the
 * background, which is both what makes an offline run instant and what lets a
 * new deploy reach a tablet that is online again without a reinstall.
 *
 * Bump CACHE_VERSION whenever this file's caching behaviour changes; the
 * caches from the previous version are dropped on activation.
 */

const CACHE_VERSION = "v1";

const PAGES_CACHE = `lira-pages-${CACHE_VERSION}`;
const RSC_CACHE = `lira-rsc-${CACHE_VERSION}`;
const ASSETS_CACHE = `lira-assets-${CACHE_VERSION}`;

const CURRENT_CACHES = [PAGES_CACHE, RSC_CACHE, ASSETS_CACHE];

/**
 * Every page the reader can reach. A route missing here is a route that dead
 * ends offline, so this list has to be updated when one is added.
 */
const APP_ROUTES = [
  "/",
  "/terms",
  "/gdpr",
  "/introduction",
  "/questionnaire/prose",
  "/questionnaire/poetry",
  "/processing",
  "/results/prose",
  "/results/poetry",
  "/email",
  "/finish",
];

/**
 * Files that no page links to in a way the HTML sweep would find: the icons,
 * and the data the scoring engine loads on demand.
 */
const STATIC_ASSETS = [
  "/manifest.webmanifest",
  "/favicon.svg",
  "/icons.svg",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/icons/icon-maskable-192.png",
  "/icons/icon-maskable-512.png",
  "/icons/apple-touch-icon.png",
  "/offline-data/prose.json",
  "/offline-data/literary-profiles.json",
  "/offline-data/books.json",
];

// ----------------------------------------------------------------------
// Cache keys
// ----------------------------------------------------------------------

/**
 * Pages and flight payloads are stored under their path alone.
 *
 * The client router appends a per-build `_rsc` cache buster to navigation
 * requests, and responses come back with a `Vary` on the RSC headers. Keying
 * on a bare path sidesteps both: a stored entry is found by the path the
 * reader is going to, not by the exact request that first fetched it.
 */
function pageKey(url) {
  return new URL(url).pathname;
}

/** A prefetch is a hint, not a navigation — it is allowed to fail. */
function isPrefetch(request) {
  return (
    request.headers.get("Next-Router-Prefetch") === "1" ||
    request.headers.has("Next-Router-Segment-Prefetch")
  );
}

function isRscRequest(request) {
  return request.headers.get("RSC") === "1";
}

// ----------------------------------------------------------------------
// Storing responses
// ----------------------------------------------------------------------

/**
 * Returns a copy safe to keep in the cache.
 *
 * A response that arrived through a redirect carries that fact with it, and a
 * browser refuses to answer a navigation with one — the request's redirect
 * mode is "manual", and a redirected response is not a legal answer to it. It
 * matters here because Next answers a flight request with a 307 to the same
 * path plus its own cache buster, so following that is normal rather than
 * exceptional. Rebuilding the response drops the flag and keeps the body.
 */
async function storeable(response) {
  if (!response.redirected) {
    return response.clone();
  }

  return new Response(await response.clone().blob(), {
    status: response.status,
    statusText: response.statusText,
    headers: response.headers,
  });
}

// ----------------------------------------------------------------------
// Install: sweep the whole app into the cache
// ----------------------------------------------------------------------

/** Pulls every /_next/static reference out of an HTML document or stylesheet. */
function findBuildAssets(source) {
  const matches = source.matchAll(/\/_next\/static\/[^"'`\s>)\\]+/g);

  return new Set(Array.from(matches, (match) => match[0]));
}

/**
 * Stores one build asset, and for stylesheets follows the fonts and images
 * they reference — those appear in no HTML, so nothing else would find them.
 */
async function cacheBuildAsset(cache, path) {
  if (await cache.match(path)) {
    return;
  }

  const response = await fetch(path, { cache: "no-cache" });

  if (!response.ok) {
    throw new Error(`${path} responded ${response.status}`);
  }

  if (path.endsWith(".css")) {
    const stylesheet = response.clone();

    await cache.put(path, response);

    const nested = findBuildAssets(await stylesheet.text());

    await Promise.all(
      Array.from(nested, (asset) =>
        cacheBuildAsset(cache, asset).catch(() => {}),
      ),
    );

    return;
  }

  await cache.put(path, response);
}

/**
 * Fetches one route three ways: the document, the flight payload behind it,
 * and everything the document pulls in.
 */
async function cacheRoute(route, caches_) {
  const { pages, rsc, assets } = caches_;

  // no-cache rather than reload: the sweep runs again on every online start,
  // and revalidating lets an unchanged page come back as a 304 instead of
  // re-downloading the whole app each time.
  const response = await fetch(route, {
    cache: "no-cache",
    headers: { Accept: "text/html" },
  });

  if (!response.ok) {
    throw new Error(`${route} responded ${response.status}`);
  }

  const html = await response.clone().text();

  await pages.put(
    pageKey(new URL(route, self.location.origin)),
    await storeable(response),
  );

  // Without this, a client-side navigation offline has no payload to render
  // from and the router falls back to a full page load.
  const flight = await fetch(route, {
    cache: "no-cache",
    headers: { RSC: "1" },
  });

  if (flight.ok) {
    await rsc.put(
      pageKey(new URL(route, self.location.origin)),
      await storeable(flight),
    );
  }

  await Promise.all(
    Array.from(findBuildAssets(html), (asset) =>
      cacheBuildAsset(assets, asset).catch((error) => {
        console.warn(`[sw] could not cache ${asset}`, error);
      }),
    ),
  );
}

/**
 * The full sweep. Also run on demand from the page, so a tablet that is online
 * again picks up a new deploy's assets before it is unplugged.
 */
async function precacheEverything() {
  const caches_ = {
    pages: await caches.open(PAGES_CACHE),
    rsc: await caches.open(RSC_CACHE),
    assets: await caches.open(ASSETS_CACHE),
  };

  const results = await Promise.allSettled([
    ...APP_ROUTES.map((route) => cacheRoute(route, caches_)),

    ...STATIC_ASSETS.map(async (path) => {
      const response = await fetch(path, { cache: "no-cache" });

      if (!response.ok) {
        throw new Error(`${path} responded ${response.status}`);
      }

      await caches_.assets.put(path, response);
    }),
  ]);

  const failed = results.filter((result) => result.status === "rejected");

  if (failed.length > 0) {
    // Not fatal: a half-warm cache still beats none, and the next sweep
    // retries. Logged because it is the only sign the tablet is not ready.
    console.warn(`[sw] ${failed.length} precache entries failed`, failed);
  }

  return { total: results.length, failed: failed.length };
}

self.addEventListener("install", (event) => {
  // The install is only complete once the app is genuinely usable offline, so
  // the sweep is awaited rather than left running.
  event.waitUntil(precacheEverything().then(() => self.skipWaiting()));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const names = await caches.keys();

      await Promise.all(
        names
          .filter((name) => name.startsWith("lira-") && !CURRENT_CACHES.includes(name))
          .map((name) => caches.delete(name)),
      );

      await self.clients.claim();
    })(),
  );
});

// ----------------------------------------------------------------------
// Strategies
// ----------------------------------------------------------------------

/**
 * Serves the stored copy immediately and refreshes it in the background.
 *
 * Chosen over network-first because the tablet spends most of its life
 * offline: a network-first page would wait out a connection timeout on every
 * single navigation before falling back to the copy it already had.
 */
async function staleWhileRevalidate(event, cacheName, key, { onUpdate } = {}) {
  const cache = await caches.open(cacheName);

  const cached = await cache.match(key);

  const update = fetch(event.request)
    .then(async (response) => {
      if (response.ok) {
        await cache.put(key, await storeable(response));

        if (onUpdate) {
          await onUpdate(response.clone());
        }
      }

      return response;
    })
    .catch(() => undefined);

  if (cached) {
    // The response has already been handed over, so without this the worker
    // can be shut down before the refresh finishes and the cache never moves.
    event.waitUntil(update);

    return cached;
  }

  const response = await update;

  return response ?? null;
}

/** Hashed build assets never change under the same URL, so the copy is final. */
async function cacheFirst(cacheName, request) {
  const cache = await caches.open(cacheName);

  const cached = await cache.match(request.url);

  if (cached) {
    return cached;
  }

  const response = await fetch(request);

  if (response.ok) {
    await cache.put(request.url, response.clone());
  }

  return response;
}

const OFFLINE_PAGE = `<!doctype html>
<html lang="ro">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>LIRA — offline</title>
    <style>
      body { font-family: system-ui, sans-serif; display: grid; place-items: center;
             min-height: 100vh; margin: 0; padding: 2rem; text-align: center; color: #18181b; }
      p { max-width: 28rem; line-height: 1.6; opacity: 0.75; }
    </style>
  </head>
  <body>
    <div>
      <h1>Pagina nu este disponibilă offline</h1>
      <p>
        Conectează tableta la internet și deschide din nou aplicația pentru a
        salva paginile lipsă.
      </p>
    </div>
  </body>
</html>`;

function offlineResponse() {
  return new Response(OFFLINE_PAGE, {
    status: 503,
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}

// ----------------------------------------------------------------------
// Fetch
// ----------------------------------------------------------------------

self.addEventListener("fetch", (event) => {
  const { request } = event;

  if (request.method !== "GET") {
    return;
  }

  const url = new URL(request.url);

  if (url.origin !== self.location.origin) {
    return;
  }

  // Participations and the email hand-off must reach the real backend. A
  // stale success here would mean a run silently never recorded; when the
  // request fails the app queues it in IndexedDB instead.
  if (url.pathname.startsWith("/api/") || url.pathname === "/healthz") {
    return;
  }

  // Flight payloads for client-side navigation.
  if (isRscRequest(request)) {
    // A failed prefetch costs nothing — the navigation that follows is served
    // from the cache anyway — and serving a full payload where the router
    // asked for one segment would confuse it.
    if (isPrefetch(request)) {
      return;
    }

    event.respondWith(
      (async () => {
        const response = await staleWhileRevalidate(event, RSC_CACHE, pageKey(url));

        // Without a payload the router gives up and does a full page load,
        // which the page cache below can still answer.
        return response ?? Response.error();
      })(),
    );

    return;
  }

  if (request.mode === "navigate") {
    event.respondWith(
      (async () => {
        const response = await staleWhileRevalidate(event, PAGES_CACHE, pageKey(url), {
          // A new deploy ships new hashed chunks. Pulling them in as soon as
          // the page that references them updates is what keeps the tablet
          // usable if it goes offline right after a deploy.
          onUpdate: async (fresh) => {
            const assets = await caches.open(ASSETS_CACHE);

            const referenced = findBuildAssets(await fresh.text());

            await Promise.all(
              Array.from(referenced, (asset) =>
                cacheBuildAsset(assets, asset).catch(() => {}),
              ),
            );
          },
        });

        return response ?? offlineResponse();
      })(),
    );

    return;
  }

  // Hashed and immutable.
  if (url.pathname.startsWith("/_next/static/")) {
    event.respondWith(
      cacheFirst(ASSETS_CACHE, request).catch(() => Response.error()),
    );

    return;
  }

  // Icons, the manifest and the scoring data: stable URLs whose contents can
  // change with a deploy, so they are refreshed in the background.
  event.respondWith(
    (async () => {
      const response = await staleWhileRevalidate(event, ASSETS_CACHE, url.pathname);

      return response ?? Response.error();
    })(),
  );
});

// ----------------------------------------------------------------------
// Messages from the page
// ----------------------------------------------------------------------

self.addEventListener("message", (event) => {
  const data = event.data;

  if (!data || typeof data !== "object") {
    return;
  }

  if (data.type === "warm-cache") {
    event.waitUntil(
      precacheEverything().then((summary) => {
        // The page uses this to tell the reader whether the tablet is ready
        // to be unplugged.
        event.source?.postMessage({ type: "cache-warmed", ...summary });
      }),
    );
  }

  if (data.type === "skip-waiting") {
    self.skipWaiting();
  }
});
