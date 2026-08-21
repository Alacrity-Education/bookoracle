#!/usr/bin/env node
/**
 * Copies the questionnaire and recommendation data out of the backend and into
 * public/offline-data/, which the service worker precaches.
 *
 * The tablet has to score a questionnaire with no network, so the data the
 * backend would otherwise compute against has to live in the frontend too.
 * This script is the single way that copy is produced — never hand-edit the
 * files in public/offline-data/.
 *
 *   npm run sync:offline-data
 *   npm run sync:offline-data -- ../book-recommender-backend/app/data
 *
 * Re-run it whenever the backend's questions, profiles or books change, then
 * bump CACHE_VERSION in public/sw.js so installed tablets pick the change up.
 */

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));

const backendData = resolve(
  here,
  "..",
  process.argv[2] ?? "../book-recommender-backend/app/data",
);

const outputDir = resolve(here, "..", "public", "offline-data");

function readJson(...segments) {
  const path = resolve(backendData, ...segments);

  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch (error) {
    console.error(`Could not read ${path}`);
    throw error;
  }
}

function writeJson(name, value) {
  const path = resolve(outputDir, name);

  // No pretty-printing: this is served to the browser, not read by a human,
  // and the whitespace would be a third of the payload.
  writeFileSync(path, JSON.stringify(value), "utf8");

  const kilobytes = (Buffer.byteLength(JSON.stringify(value)) / 1024).toFixed(1);

  console.log(`  ${name.padEnd(24)} ${kilobytes} kB`);
}

mkdirSync(outputDir, { recursive: true });

console.log(`Reading backend data from ${backendData}`);

// ----------------------------------------------------------------------
// Questionnaire
// ----------------------------------------------------------------------
// Copied whole: the weights and importances are what the scoring engine
// multiplies against, and the answer labels are what the tablet renders when
// the questionnaire could not be fetched from the backend.

const prose = readJson("questionnaires", "prose.json");

if (!Array.isArray(prose.questions) || prose.questions.length === 0) {
  throw new Error("prose.json contains no questions.");
}

writeJson("prose.json", prose);

// ----------------------------------------------------------------------
// Literary profiles
// ----------------------------------------------------------------------

const literaryProfiles = readJson("profiles", "literary_profiles.json");

if (!Array.isArray(literaryProfiles) || literaryProfiles.length === 0) {
  throw new Error("literary_profiles.json contains no profiles.");
}

writeJson("literary-profiles.json", literaryProfiles);

// ----------------------------------------------------------------------
// Books
// ----------------------------------------------------------------------
// books.json and books_profiles.json are keyed by the same ids and always
// used together, so they are merged into one request. Only the fields the
// scoring engine and the results page read are kept — the rest of books.json
// is editorial metadata that would double the payload for nothing.

const books = readJson("books", "books.json");
const bookProfiles = readJson("profiles", "books_profiles.json");

const profilesById = new Map(
  bookProfiles.map((entry) => [entry.id, entry.profiles]),
);

const merged = books.map((book) => {
  const profiles = profilesById.get(book.id);

  // The backend raises on this too. Failing here keeps a half-usable data
  // file from reaching a tablet that has no way to report the problem.
  if (!profiles) {
    throw new Error(`No precomputed profile for book '${book.id}'.`);
  }

  return {
    id: book.id,
    title: book.title,
    author: book.author,
    dimensions: book.dimensions,
    score: book.score,
    profiles,
  };
});

writeJson("books.json", merged);

console.log(`Wrote ${merged.length} books to ${outputDir}`);
