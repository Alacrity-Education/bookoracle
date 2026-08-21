/**
 * The recommendation engine, in the browser.
 *
 * This is a line-by-line port of the backend's personality_service.py and
 * recomendation_service.py. It exists because the tablet has to produce a
 * result with no network, and it is the only path the app uses — online and
 * offline alike — so the code that runs in front of a user is the code that
 * gets exercised on every run, not a fallback that only wakes up when the
 * Wi-Fi drops.
 *
 * Because it is a port, it has to stay one. Two rules:
 *
 *   1. Do not "improve" the arithmetic. Rounding a score or reordering a sum
 *      makes the tablet disagree with the backend, and the difference shows up
 *      as a different book at rank 1.
 *   2. Change this together with the Python, never on its own.
 *
 * scripts/check-parity.mjs replays random answer sets through both and fails
 * on any divergence.
 */

import type { Question } from "@/types/question";
import type { QuestionnaireResult, ProfileResult } from "@/types/questionnaireResult";
import type { Recommendation } from "@/types/Recommendation";

// The order the backend lists them in. Kept identical because it is also the
// order the profile vector is built in, and cosine similarity is not
// order-sensitive but a mismatched name would silently read undefined.
const DIMENSIONS = [
  "curiosity",
  "reflection",
  "complexity",
  "emotionality",
  "characters",
  "pace",
  "imagination",
  "realism",
  "ambiguity",
  "culture",
] as const;

const LITERARY_PROFILES = [
  "explorer",
  "analyst",
  "empath",
  "adventurer",
  "realist",
  "visionary",
] as const;

const DIMENSION_SCORE_WEIGHT = 0.85;
const PROFILE_SCORE_WEIGHT = 0.15;

// score 1 -> no bonus, score 2 -> 5%.
const SOURCE_BONUS: Record<number, number> = {
  1: 1.0,
  2: 1.05,
};

type ScoreMap = Record<string, number>;

export interface LiteraryProfileData {
  id: string;
  name: string;
  description: string;
  dimensions: ScoreMap;
}

export interface OfflineBook {
  id: string;
  title: string;
  author: string;
  dimensions: ScoreMap;
  score: number;
  /** Precomputed on the backend by generate_book_profiles.py. */
  profiles: ScoreMap;
}

// ============================================================
// DIMENSIONS
// ============================================================

interface DimensionCalculation {
  scores: ScoreMap;
  contributions: QuestionnaireResult["contributions"];
}

/**
 * Sums each answer's weighted contribution per dimension.
 *
 * `answers` maps a question id to the chosen answer's value (-2..2), which is
 * what the answer buttons emit and what the backend expects.
 */
export function calculateDimensions(
  questions: Question[],
  answers: Record<number, number>,
): DimensionCalculation {
  const scores: ScoreMap = {};
  const contributions: QuestionnaireResult["contributions"] = [];

  for (const question of questions) {
    const answer = answers[question.id];

    // Skipped questions contribute nothing rather than counting as neutral.
    if (answer === undefined) {
      continue;
    }

    for (const [dimension, weight] of Object.entries(question.weights)) {
      if (weight === undefined) {
        continue;
      }

      const contribution = answer * weight * question.importance;

      scores[dimension] = (scores[dimension] ?? 0) + contribution;

      contributions.push({
        question_id: question.id,
        dimension,
        contribution,
      });
    }
  }

  return { scores, contributions };
}

/**
 * Maps each raw score onto 0..100, where 50 is neutral.
 *
 * The maximum is computed from every question, answered or not, so a
 * half-finished questionnaire lands near the middle instead of at an extreme.
 */
export function normalizeDimensions(
  rawScores: ScoreMap,
  questions: Question[],
): ScoreMap {
  const maxScores: ScoreMap = {};

  for (const question of questions) {
    for (const [dimension, weight] of Object.entries(question.weights)) {
      if (weight === undefined) {
        continue;
      }

      maxScores[dimension] =
        (maxScores[dimension] ?? 0) + Math.abs(weight) * question.importance * 2;
    }
  }

  const normalized: ScoreMap = {};

  for (const [dimension, rawScore] of Object.entries(rawScores)) {
    const maxScore = maxScores[dimension] ?? 0;

    if (maxScore === 0) {
      normalized[dimension] = 50;
      continue;
    }

    normalized[dimension] = ((rawScore + maxScore) / (2 * maxScore)) * 100;
  }

  return normalized;
}

// ============================================================
// VECTOR OPERATIONS
// ============================================================

/** Moves 0..100 onto -1..1, so a neutral answer sits at the origin. */
export function centerDimensions(normalizedScores: ScoreMap): ScoreMap {
  const centered: ScoreMap = {};

  for (const [dimension, score] of Object.entries(normalizedScores)) {
    centered[dimension] = (score - 50) / 50;
  }

  return centered;
}

/** Cosine similarity over the union of both key sets; missing keys read 0. */
function cosineSimilarityByKey(vectorA: ScoreMap, vectorB: ScoreMap): number {
  let dotProduct = 0;
  let magnitudeA = 0;
  let magnitudeB = 0;

  const dimensions = new Set([...Object.keys(vectorA), ...Object.keys(vectorB)]);

  for (const dimension of dimensions) {
    const valueA = vectorA[dimension] ?? 0;
    const valueB = vectorB[dimension] ?? 0;

    dotProduct += valueA * valueB;

    magnitudeA += valueA ** 2;
    magnitudeB += valueB ** 2;
  }

  if (magnitudeA === 0 || magnitudeB === 0) {
    return 0;
  }

  return dotProduct / (Math.sqrt(magnitudeA) * Math.sqrt(magnitudeB));
}

/** Cosine similarity over two vectors already in the same coordinate order. */
function cosineSimilarityVector(vectorA: number[], vectorB: number[]): number {
  if (vectorA.length !== vectorB.length) {
    throw new Error("Vectors must have the same length.");
  }

  let dotProduct = 0;
  let magnitudeA = 0;
  let magnitudeB = 0;

  for (let index = 0; index < vectorA.length; index += 1) {
    dotProduct += vectorA[index] * vectorB[index];

    magnitudeA += vectorA[index] * vectorA[index];
    magnitudeB += vectorB[index] * vectorB[index];
  }

  if (magnitudeA === 0 || magnitudeB === 0) {
    return 0;
  }

  return dotProduct / (Math.sqrt(magnitudeA) * Math.sqrt(magnitudeB));
}

// ============================================================
// LITERARY PROFILE RANKING
// ============================================================

function rankLiteraryProfiles(
  normalizedScores: ScoreMap,
  profiles: LiteraryProfileData[],
): ProfileResult[] {
  const userVector = centerDimensions(normalizedScores);

  const ranked = profiles.map((profile) => ({
    id: profile.id,
    name: profile.name,
    description: profile.description,
    similarity: cosineSimilarityByKey(userVector, profile.dimensions),
  }));

  // Stable in both languages, so ties keep the order of literary-profiles.json.
  ranked.sort((a, b) => b.similarity - a.similarity);

  return ranked;
}

/** The /questionnaires/{category}/submit response, computed locally. */
export function calculateProfile(
  answers: Record<number, number>,
  questions: Question[],
  profiles: LiteraryProfileData[],
): QuestionnaireResult {
  const { scores: rawScores, contributions } = calculateDimensions(
    questions,
    answers,
  );

  const normalizedScores = normalizeDimensions(rawScores, questions);

  return {
    raw_scores: rawScores,
    normalized_scores: normalizedScores,
    contributions,
    profiles: rankLiteraryProfiles(normalizedScores, profiles),
  };
}

// ============================================================
// BOOK SCORING
// ============================================================

/**
 * How closely the reader and the book sit on each of the ten dimensions,
 * averaged. Both vectors are in -1..1, so the widest possible gap is 2.
 */
function calculateDimensionScore(
  userDimensions: ScoreMap,
  bookDimensions: ScoreMap,
): number {
  let totalSimilarity = 0;

  for (const dimension of DIMENSIONS) {
    const userValue = userDimensions[dimension];
    const bookValue = bookDimensions[dimension];

    // The backend raises a KeyError here. Say which dimension is missing
    // instead, because on a tablet this is the only diagnostic anyone gets.
    if (userValue === undefined || bookValue === undefined) {
      throw new Error(`Missing dimension '${dimension}' while scoring a book.`);
    }

    totalSimilarity += 1.0 - Math.abs(userValue - bookValue) / 2.0;
  }

  return totalSimilarity / DIMENSIONS.length;
}

/**
 * Compatibility between the reader's six literary-profile similarities and the
 * book's, as one cosine mapped from -1..1 onto 0..1.
 */
function calculateProfileScore(
  userProfiles: ScoreMap,
  bookProfiles: ScoreMap,
): number {
  const userVector: number[] = [];
  const bookVector: number[] = [];

  for (const profile of LITERARY_PROFILES) {
    const userValue = userProfiles[profile];
    const bookValue = bookProfiles[profile];

    if (userValue === undefined || bookValue === undefined) {
      throw new Error(`Missing literary profile '${profile}' while scoring a book.`);
    }

    userVector.push(userValue);
    bookVector.push(bookValue);
  }

  return (cosineSimilarityVector(userVector, bookVector) + 1.0) / 2.0;
}

/**
 * Ranks every book for one reader.
 *
 *   base_score  = 0.85 * dimension_score + 0.15 * profile_score
 *   final_score = base_score * source_bonus
 */
export function rankBooks(
  userDimensions: ScoreMap,
  userProfiles: ScoreMap,
  books: OfflineBook[],
  topN = 10,
): Recommendation[] {
  if (topN <= 0) {
    throw new Error("topN must be greater than zero.");
  }

  const ranked = books.map((book) => {
    const dimensionScore = calculateDimensionScore(userDimensions, book.dimensions);
    const profileScore = calculateProfileScore(userProfiles, book.profiles);

    const baseScore =
      DIMENSION_SCORE_WEIGHT * dimensionScore + PROFILE_SCORE_WEIGHT * profileScore;

    const sourceBonus = SOURCE_BONUS[book.score];

    if (sourceBonus === undefined) {
      throw new Error(
        `Invalid book source score: ${book.score}. Expected 1 or 2.`,
      );
    }

    return {
      // rank is assigned after sorting, like the backend does.
      rank: 0,
      book_id: book.id,
      title: book.title,
      author: book.author,

      dimension_score: dimensionScore,
      profile_score: profileScore,
      base_score: baseScore,

      source_score: book.score,
      source_bonus: sourceBonus,

      final_score: baseScore * sourceBonus,
    } satisfies Recommendation;
  });

  ranked.sort((a, b) => b.final_score - a.final_score);

  const top = ranked.slice(0, topN);

  for (let index = 0; index < top.length; index += 1) {
    top[index].rank = index + 1;
  }

  return top;
}

/**
 * The full pipeline: answers in, profile and recommendations out.
 *
 * Mirrors what the /recommendations/{category} route does after calling
 * calculate_profile — including re-centering the normalized scores, which is
 * the second place -1..1 gets derived and has to match.
 */
export function scoreQuestionnaire(
  answers: Record<number, number>,
  questions: Question[],
  profiles: LiteraryProfileData[],
  books: OfflineBook[],
  topN = 10,
): { result: QuestionnaireResult; recommendations: Recommendation[] } {
  const result = calculateProfile(answers, questions, profiles);

  const userDimensions = centerDimensions(result.normalized_scores);

  const userProfiles: ScoreMap = {};

  for (const profile of result.profiles) {
    userProfiles[profile.id] = profile.similarity;
  }

  return {
    result,
    recommendations: rankBooks(userDimensions, userProfiles, books, topN),
  };
}
