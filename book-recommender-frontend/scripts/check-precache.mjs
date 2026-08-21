#!/usr/bin/env node
/**
 * Replays the service worker's install sweep against a running server.
 *
 * The offline promise rests on one list: APP_ROUTES in public/sw.js. A page
 * added to the app and not added there installs fine, passes every test, and
 * then dead ends the first time a tablet opens it with no network. Nothing in
 * a build catches that, so this does:
 *
 *   1. every route in the app has to be in the worker's list
 *   2. every listed route, flight payload and static asset has to fetch
 *   3. every /_next/static asset those pages reference has to fetch
 *
 *   npm run build && npm run start
 *   npm run check:precache
 *   npm run check:precache -- http://tablet.local:3000
 */

import { readFileSync, readdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));

const baseUrl = (process.argv[2] ?? "http://127.0.0.1:3000").replace(/\/+$/, "");

const worker = readFileSync(resolve(here, "../public/sw.js"), "utf8");

function readList(name) {
  const match = worker.match(new RegExp(`const ${name} = \\[([^\\]]*)\\]`));

  if (!match) {
    throw new Error(`Could not find ${name} in public/sw.js`);
  }

  return Array.from(match[1].matchAll(/"([^"]+)"/g), (entry) => entry[1]);
}

const appRoutes = readList("APP_ROUTES");
const staticAssets = readList("STATIC_ASSETS");

// ----------------------------------------------------------------------
// 1. Routes the app has, against routes the worker knows about
// ----------------------------------------------------------------------

const appDirectory = resolve(here, "../src/app");

/** Every page.tsx under src/app, as the path it is served at. */
function findRoutes(directory, prefix = "") {
  const routes = [];

  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    if (!entry.isDirectory()) {
      continue;
    }

    // Route groups do not appear in the URL; api and healthz are not pages.
    if (entry.name.startsWith("(") || entry.name === "api") {
      routes.push(...findRoutes(resolve(directory, entry.name), prefix));
      continue;
    }

    const child = resolve(directory, entry.name);
    const path = `${prefix}/${entry.name}`;

    if (readdirSync(child).some((file) => /^page\.(tsx|ts|jsx|js)$/.test(file))) {
      routes.push(path);
    }

    routes.push(...findRoutes(child, path));
  }

  return routes;
}

const declaredRoutes = ["/", ...findRoutes(appDirectory)].filter(
  (route) => route !== "/healthz",
);

const problems = [];

for (const route of declaredRoutes) {
  // A dynamic segment cannot be enumerated from the filesystem, so the check
  // is that the worker precaches at least one concrete path for it.
  if (route.includes("[")) {
    const pattern = new RegExp(
      `^${route.replace(/\[[^\]]+\]/g, "[^/]+").replace(/\//g, "\\/")}$`,
    );

    if (!appRoutes.some((listed) => pattern.test(listed))) {
      problems.push(`No precached path for the dynamic route ${route}`);
    }

    continue;
  }

  if (!appRoutes.includes(route)) {
    problems.push(`Route ${route} is not in APP_ROUTES — it will not work offline`);
  }
}

// ----------------------------------------------------------------------
// 2 and 3. Everything the worker fetches has to be there
// ----------------------------------------------------------------------

async function check(path, init, label) {
  let response;

  try {
    response = await fetch(`${baseUrl}${path}`, init);
  } catch (error) {
    problems.push(`${label} ${path} — ${error.message}`);

    return null;
  }

  if (!response.ok) {
    problems.push(`${label} ${path} — responded ${response.status}`);

    return null;
  }

  return response;
}

const buildAssets = new Set();

for (const route of appRoutes) {
  const page = await check(route, { headers: { Accept: "text/html" } }, "page");

  if (page) {
    const html = await page.text();

    for (const match of html.matchAll(/\/_next\/static\/[^"'`\s>)\\]+/g)) {
      buildAssets.add(match[0]);
    }
  }

  await check(route, { headers: { RSC: "1" } }, "flight payload for");
}

for (const asset of staticAssets) {
  await check(asset, undefined, "static asset");
}

for (const asset of buildAssets) {
  await check(asset, undefined, "build asset");
}

// ----------------------------------------------------------------------

console.log(
  `Checked ${appRoutes.length} routes, ${staticAssets.length} static assets ` +
    `and ${buildAssets.size} build assets against ${baseUrl}.`,
);

if (problems.length > 0) {
  console.error(`\n${problems.length} problem(s):`);

  for (const problem of problems) {
    console.error(`  ${problem}`);
  }

  process.exit(1);
}

console.log("Everything the service worker precaches is reachable.");
