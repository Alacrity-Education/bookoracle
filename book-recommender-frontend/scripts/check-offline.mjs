#!/usr/bin/env node
/**
 * Runs public/sw.js for real, then pulls the network out from under it.
 *
 * The one thing that matters about this app — that a tablet which has been
 * opened once online keeps working with no network — cannot be proven by a
 * build or a type check, and testing it by hand means finding a tablet. So the
 * worker is executed in a sandbox with a Cache API shim: it installs against a
 * running server, the shim's fetch is then made to fail like an unplugged
 * device, and every navigation a reader could make is replayed through the
 * worker's own fetch handler.
 *
 *   npm run build && npm run start
 *   npm run check:offline
 *
 * This exercises the worker's logic, not the browser's. Registration, scope
 * and the install lifecycle still need one real device before a rollout.
 */

import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createContext, runInContext } from "node:vm";

const here = dirname(fileURLToPath(import.meta.url));

const baseUrl = (process.argv[2] ?? "http://127.0.0.1:3000").replace(/\/+$/, "");
const origin = new URL(baseUrl).origin;

// ----------------------------------------------------------------------
// A Cache API, in a Map
// ----------------------------------------------------------------------
// Keys are normalised to absolute URLs exactly as the browser does, which is
// what lets the worker store "/_next/static/x" and later match it against the
// absolute request.url a real fetch event carries.

function cacheKey(request) {
  const url = typeof request === "string" ? request : request.url;

  return new URL(url, origin).href;
}

class FakeCache {
  entries = new Map();

  async match(request) {
    const stored = this.entries.get(cacheKey(request));

    return stored ? stored.clone() : undefined;
  }

  async put(request, response) {
    if (response.bodyUsed) {
      throw new TypeError("Response body is already used");
    }

    this.entries.set(cacheKey(request), response);
  }
}

class FakeCacheStorage {
  caches = new Map();

  async open(name) {
    if (!this.caches.has(name)) {
      this.caches.set(name, new FakeCache());
    }

    return this.caches.get(name);
  }

  async keys() {
    return Array.from(this.caches.keys());
  }

  async delete(name) {
    return this.caches.delete(name);
  }
}

// ----------------------------------------------------------------------
// The worker's environment
// ----------------------------------------------------------------------

let offline = false;

async function sandboxFetch(input, init) {
  if (offline) {
    // What a browser throws for a request with no network.
    throw new TypeError("Failed to fetch");
  }

  const url = typeof input === "string" ? input : input.url;

  return fetch(new URL(url, origin), init ?? (typeof input === "string" ? undefined : input));
}

const listeners = new Map();

const caches_ = new FakeCacheStorage();

const context = createContext({
  console,
  URL,
  Request,
  Response,
  Headers,
  TypeError,
  Promise,
  Set,
  Map,
  Array,
  Object,
  JSON,
  fetch: sandboxFetch,
  caches: caches_,
  self: {
    location: new URL(origin),
    addEventListener: (type, listener) => listeners.set(type, listener),
    skipWaiting: async () => {},
    clients: { claim: async () => {} },
  },
});

runInContext(readFileSync(resolve(here, "../public/sw.js"), "utf8"), context);

async function dispatch(type, event) {
  const listener = listeners.get(type);

  if (!listener) {
    throw new Error(`The worker registered no ${type} listener.`);
  }

  const pending = [];

  listener({
    ...event,
    waitUntil: (promise) => pending.push(promise),
    respondWith: (promise) => pending.push((event.responded = promise)),
  });

  await Promise.all(pending);

  return event.responded;
}

/** A fetch event shaped like the ones the browser dispatches. */
function fetchEvent(path, { mode = "no-cors", headers = {} } = {}) {
  return {
    request: {
      url: new URL(path, origin).href,
      method: "GET",
      mode,
      headers: new Headers(headers),
    },
  };
}

const problems = [];

function expect(condition, message) {
  if (!condition) {
    problems.push(message);
  }
}

// ----------------------------------------------------------------------
// Install while online
// ----------------------------------------------------------------------

console.log(`Installing the worker against ${baseUrl} ...`);

await dispatch("install", {});
await dispatch("activate", {});

const cached = (await caches_.keys()).reduce(
  (total, name) => total + caches_.caches.get(name).entries.size,
  0,
);

console.log(`Cached ${cached} entries across ${(await caches_.keys()).join(", ")}.`);

expect(cached > 20, `Only ${cached} entries were cached; the sweep did not run.`);

// ----------------------------------------------------------------------
// Unplug
// ----------------------------------------------------------------------

offline = true;

console.log("\nNetwork off. Replaying the reader's path through the app ...");

// The whole flow, in the order a reader walks it.
const journey = [
  "/",
  "/terms",
  "/gdpr",
  "/introduction",
  "/questionnaire/prose",
  "/results/prose",
  "/email",
  "/finish",
];

for (const route of journey) {
  const navigation = await dispatch("fetch", fetchEvent(route, { mode: "navigate" }));

  expect(
    navigation && navigation.status === 200,
    `Navigating to ${route} offline returned ${navigation ? navigation.status : "nothing"}.`,
  );

  // A browser refuses to answer a navigation with a response that arrived
  // through a redirect, and Next answers flight requests with one.
  expect(
    navigation && navigation.redirected !== true,
    `The cached page for ${route} is a redirected response, which a navigation cannot use.`,
  );

  // What the client router asks for instead, on a soft navigation.
  const flight = await dispatch(
    "fetch",
    fetchEvent(route, { headers: { RSC: "1" } }),
  );

  expect(
    flight && flight.status === 200,
    `The flight payload for ${route} was not available offline.`,
  );

  // The router appends a per-build cache buster; it must not miss the cache.
  const busted = await dispatch(
    "fetch",
    fetchEvent(`${route}${route.includes("?") ? "&" : "?"}_rsc=1a2b3c`, {
      headers: { RSC: "1" },
    }),
  );

  expect(
    busted && busted.status === 200,
    `A cache-busted flight request for ${route} missed the cache.`,
  );
}

// ----------------------------------------------------------------------
// The data the scoring engine needs, and one build asset
// ----------------------------------------------------------------------

for (const file of ["prose.json", "literary-profiles.json", "books.json"]) {
  const response = await dispatch("fetch", fetchEvent(`/offline-data/${file}`));

  expect(
    response && response.status === 200,
    `/offline-data/${file} was not available offline.`,
  );

  if (response && response.status === 200) {
    const body = await response.json();

    expect(
      Array.isArray(body) ? body.length > 0 : Object.keys(body).length > 0,
      `/offline-data/${file} came back empty.`,
    );
  }
}

const assetsCache = await caches_.open(
  (await caches_.keys()).find((name) => name.includes("assets")),
);

const buildAsset = Array.from(assetsCache.entries.keys()).find((key) =>
  key.includes("/_next/static/"),
);

expect(buildAsset !== undefined, "No build assets were cached at all.");

if (buildAsset) {
  const response = await dispatch("fetch", fetchEvent(buildAsset));

  expect(
    response && response.status === 200,
    `The build asset ${buildAsset} was not served from the cache.`,
  );
}

// A page the worker never cached must not pretend to work.
const unknown = await dispatch("fetch", fetchEvent("/nope", { mode: "navigate" }));

expect(
  unknown && unknown.status === 503,
  "An uncached page should fall back to the offline notice, not fail silently.",
);

// The backend is never served from cache: a stale "saved" would lose a run.
const api = await dispatch("fetch", fetchEvent("/api/questionnaires/prose"));

expect(
  api === undefined,
  "API requests must be left to the network, not answered from the cache.",
);

// ----------------------------------------------------------------------

if (problems.length > 0) {
  console.error(`\n${problems.length} problem(s):`);

  for (const problem of problems) {
    console.error(`  ${problem}`);
  }

  process.exit(1);
}

console.log(
  `\nThe whole flow (${journey.join(" -> ")}) works with no network.`,
);
