#!/usr/bin/env node
/**
 * Proves the browser scoring engine agrees with the backend it was ported from.
 *
 * The tablet now scores questionnaires itself, so a drift between
 * src/lib/scoring/engine.ts and the Python services would show up as one
 * device recommending a different book than another. This replays random
 * answer sets through both and fails on any disagreement.
 *
 *   npm run check:parity
 *   npm run check:parity -- 500        # more runs
 *
 * Needs python3 and the backend checked out next to this repo. It reads the
 * Python directly and never starts the server, and it imports the engine's
 * TypeScript straight into Node, which wants Node 22.18 or newer (or an
 * explicit --experimental-strip-types).
 */

import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import {
  calculateProfile,
  centerDimensions,
  rankBooks,
} from "../src/lib/scoring/engine.ts";

const here = dirname(fileURLToPath(import.meta.url));

const runs = Number(process.argv[2] ?? 200);

const backendRoot = resolve(here, "../../book-recommender-backend");
const offlineData = resolve(here, "../public/offline-data");

const questionnaire = JSON.parse(
  readFileSync(resolve(offlineData, "prose.json"), "utf8"),
);
const profiles = JSON.parse(
  readFileSync(resolve(offlineData, "literary-profiles.json"), "utf8"),
);
const books = JSON.parse(
  readFileSync(resolve(offlineData, "books.json"), "utf8"),
);

// ----------------------------------------------------------------------
// Answer sets
// ----------------------------------------------------------------------
// A fixed seed so a failure can be reproduced. Every fifth run leaves some
// questions unanswered, which is the branch where the two implementations
// could most easily disagree about what a missing dimension means.

let seed = 20260821;

function random() {
  seed = (seed * 1103515245 + 12345) % 2147483648;

  return seed / 2147483648;
}

const answerValues = [-2, -1, 0, 1, 2];

// Every fifth set leaves questions out. The stepper will not let a reader do
// that — the button stays disabled until the current question is answered —
// but it is the branch where the two implementations could most easily
// disagree about what an untouched dimension means, and they have to agree
// about that too, including when it means neither of them can rank books.

const answerSets = Array.from({ length: runs }, (_, index) => {
  const answers = {};

  for (const question of questionnaire.questions) {
    if (index % 5 === 0 && random() < 0.25) {
      continue;
    }

    answers[question.id] = answerValues[Math.floor(random() * answerValues.length)];
  }

  return answers;
});

// ----------------------------------------------------------------------
// Backend
// ----------------------------------------------------------------------

const pythonSource = `
import json, sys
sys.path.insert(0, ${JSON.stringify(backendRoot)})

from app.services.personality_service import calculate_profile
from app.services.recomendation_service import rank_books
from app.services.recommendation_data_service import load_books, load_book_profiles

answer_sets = json.load(sys.stdin)

books = load_books()
books_profiles = load_book_profiles()

output = []

for answers in answer_sets:
    answers = {int(key): value for key, value in answers.items()}

    profile = calculate_profile(answers=answers, category="prose")

    user_dimensions = {
        dimension: (score - 50) / 50
        for dimension, score in profile["normalized_scores"].items()
    }

    user_profiles = {
        entry["id"]: entry["similarity"] for entry in profile["profiles"]
    }

    # A set of answers that touches none of a dimension's questions leaves it
    # out of the profile entirely, and neither side can score a book without
    # all ten. The backend raises KeyError here (a 500 from /recommendations);
    # the port throws. Refusing in the same cases is part of the parity.
    try:
        recommendations = [
            {
                "rank": book["rank"],
                "book_id": book["book_id"],
                "final_score": book["final_score"],
                "base_score": book["base_score"],
                "dimension_score": book["dimension_score"],
                "profile_score": book["profile_score"],
            }
            for book in rank_books(
                user_dimensions=user_dimensions,
                user_profiles=user_profiles,
                books=books,
                books_profiles=books_profiles,
                top_n=10,
            )
        ]
    except KeyError:
        recommendations = None

    output.append({
        "normalized_scores": profile["normalized_scores"],
        "profiles": profile["profiles"],
        "recommendations": recommendations,
    })

json.dump(output, sys.stdout)
`;

// calculate_profile prints its data directories on every call, so stdout
// carries chatter as well as JSON; the payload goes out on fd 3 instead.
const python = spawnSync(
  "python3",
  ["-c", pythonSource.replace("json.dump(output, sys.stdout)", "open(3, 'w').write(json.dumps(output))")],
  {
    input: JSON.stringify(answerSets),
    cwd: backendRoot,
    encoding: "utf8",
    maxBuffer: 256 * 1024 * 1024,
    stdio: ["pipe", "pipe", "pipe", "pipe"],
  },
);

if (python.status !== 0) {
  console.error(python.stderr);
  process.exit(1);
}

const expected = JSON.parse(python.output[3]);

// ----------------------------------------------------------------------
// Compare
// ----------------------------------------------------------------------

let failures = 0;
let maxDelta = 0;

// Both sides run the same operations on IEEE doubles, so the only expected
// difference is a last-bit one: the backend sums cosine terms in Python set
// order, which is not the insertion order the port uses. That is worth about
// 1e-16 and never reorders a ranking. Anything larger is a real drift.
const TOLERANCE = 1e-12;

function compare(label, a, b) {
  const delta = Math.abs(a - b);

  maxDelta = Math.max(maxDelta, delta);

  if (delta > TOLERANCE) {
    console.error(`  ${label}: browser ${a} vs backend ${b} (delta ${delta})`);

    return false;
  }

  return true;
}

let refusals = 0;

answerSets.forEach((answers, index) => {
  const result = calculateProfile(answers, questionnaire.questions, profiles);

  const userProfiles = Object.fromEntries(
    result.profiles.map((profile) => [profile.id, profile.similarity]),
  );

  let recommendations = null;

  try {
    recommendations = rankBooks(
      centerDimensions(result.normalized_scores),
      userProfiles,
      books,
    );
  } catch {
    // Mirrors the backend's KeyError on an incomplete set of dimensions.
    recommendations = null;
  }

  const reference = expected[index];

  const problems = [];

  for (const [dimension, score] of Object.entries(reference.normalized_scores)) {
    if (!compare(`normalized_scores.${dimension}`, result.normalized_scores[dimension], score)) {
      problems.push(dimension);
    }
  }

  reference.profiles.forEach((profile, position) => {
    const own = result.profiles[position];

    if (own.id !== profile.id) {
      console.error(`  profile ${position}: browser ${own.id} vs backend ${profile.id}`);
      problems.push("profile-order");
    }

    if (!compare(`profile.${profile.id}.similarity`, own.similarity, profile.similarity)) {
      problems.push("profile-similarity");
    }
  });

  if ((reference.recommendations === null) !== (recommendations === null)) {
    console.error(
      `  one side refused to rank and the other did not ` +
        `(backend: ${reference.recommendations === null ? "refused" : "ranked"}, ` +
        `browser: ${recommendations === null ? "refused" : "ranked"})`,
    );

    problems.push("refusal");
  }

  if (reference.recommendations === null) {
    refusals += 1;
  }

  (reference.recommendations ?? []).forEach((book, position) => {
    const own = recommendations[position];

    if (own.book_id !== book.book_id) {
      console.error(`  rank ${position + 1}: browser ${own.book_id} vs backend ${book.book_id}`);
      problems.push("book-order");
    }

    for (const field of ["final_score", "base_score", "dimension_score", "profile_score"]) {
      if (!compare(`rank ${position + 1} ${field}`, own[field], book[field])) {
        problems.push(field);
      }
    }
  });

  if (problems.length > 0) {
    failures += 1;

    console.error(`Answer set ${index} diverged: ${[...new Set(problems)].join(", ")}`);
    console.error(`  answers: ${JSON.stringify(answers)}`);
  }
});

console.log(
  `${runs - failures}/${runs} answer sets match the backend exactly ` +
    `(largest difference ${maxDelta}).`,
);

if (refusals > 0) {
  console.log(
    `${refusals} of them left a dimension untouched, and both sides declined ` +
      `to rank books for it.`,
  );
}

process.exit(failures === 0 ? 0 : 1);
