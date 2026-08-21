/**
 * Loads the data the scoring engine needs from /offline-data/.
 *
 * These files are produced by scripts/sync-offline-data.mjs and precached by
 * the service worker at install time, so the first fetch after installation is
 * the only one that ever touches the network. Each file is fetched at most
 * once per page load and the in-flight promise is shared, so two callers
 * racing on the same file do not download it twice.
 */

import type { Questionnaire } from "@/types/questionnaire";

import type { LiteraryProfileData, OfflineBook } from "./engine";

const cache = new Map<string, Promise<unknown>>();

function loadJson<T>(file: string): Promise<T> {
  const existing = cache.get(file);

  if (existing) {
    return existing as Promise<T>;
  }

  const request = fetch(`/offline-data/${file}`, { cache: "no-cache" })
    .then((response) => {
      if (!response.ok) {
        throw new Error(`Could not load /offline-data/${file}: ${response.status}`);
      }

      return response.json() as Promise<T>;
    })
    .catch((error) => {
      // Drop the rejected promise so a later attempt — after the tablet is
      // back online, say — is not served the same failure forever.
      cache.delete(file);

      throw error;
    });

  cache.set(file, request);

  return request;
}

export function loadBooks(): Promise<OfflineBook[]> {
  return loadJson<OfflineBook[]>("books.json");
}

export function loadLiteraryProfiles(): Promise<LiteraryProfileData[]> {
  return loadJson<LiteraryProfileData[]>("literary-profiles.json");
}

/**
 * The questionnaire as it stood when the data was last synced. Only used when
 * the server could not reach the backend; the questions normally arrive with
 * the page, already rendered.
 */
export function loadOfflineQuestionnaire(): Promise<Questionnaire> {
  return loadJson<Questionnaire>("prose.json");
}

/**
 * Pulls the scoring data into the HTTP cache ahead of time.
 *
 * Called when the questionnaire opens so the ~190 kB of book data is already
 * there by the time the reader answers the last question, instead of being
 * fetched while they wait for a result.
 */
export function warmScoringData(): void {
  void loadBooks().catch(() => {});
  void loadLiteraryProfiles().catch(() => {});
}
