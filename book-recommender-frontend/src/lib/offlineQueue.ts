"use client";

/**
 * Holds participations that could not be sent, and sends them later.
 *
 * The questionnaire itself is scored on the device, so the only thing the
 * tablet still needs the backend for is recording that someone took part and
 * emailing them their result. Neither can happen mid-flight on a tablet with
 * no network, and neither should block the reader — so a failed submission is
 * written to IndexedDB and replayed the next time the app is open and online.
 *
 * IndexedDB rather than localStorage because this data outlives the tab and
 * must survive the app being closed with a queue still in it.
 */

import type { ParticipationCompletion } from "@/services/participationService";

const DATABASE_NAME = "lira-offline";
const DATABASE_VERSION = 1;
const STORE_NAME = "participations";

/** Set when a result was queued, so /finish can say so. Per tab, unlike the queue. */
const NOTICE_KEY = "lira:queued-notice";

export interface QueuedParticipation {
  id?: number;
  category: "prose" | "poetry";
  payload: ParticipationCompletion;
  queuedAt: string;
}

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DATABASE_NAME, DATABASE_VERSION);

    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORE_NAME)) {
        request.result.createObjectStore(STORE_NAME, {
          keyPath: "id",
          autoIncrement: true,
        });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function promisify<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function enqueueParticipation(
  entry: Omit<QueuedParticipation, "id">,
): Promise<void> {
  const database = await openDatabase();

  try {
    const transaction = database.transaction(STORE_NAME, "readwrite");

    await promisify(transaction.objectStore(STORE_NAME).add(entry));
  } finally {
    database.close();
  }
}

export async function queuedCount(): Promise<number> {
  try {
    const database = await openDatabase();

    try {
      const transaction = database.transaction(STORE_NAME, "readonly");

      return await promisify(transaction.objectStore(STORE_NAME).count());
    } finally {
      database.close();
    }
  } catch {
    // A blocked or unavailable IndexedDB (private mode, storage pressure) is
    // reported as an empty queue; nothing about the run depends on the count.
    return 0;
  }
}

/** Set while a flush is running, so overlapping triggers share one pass. */
let flushing: Promise<number> | null = null;

/**
 * Replays the queue oldest-first, deleting each entry only once the backend
 * has acknowledged it.
 *
 * Stops at the first failure and leaves the rest queued: if the backend is
 * unreachable, hammering it with the whole queue achieves nothing, and order
 * is worth preserving in the participation log.
 *
 * Returns the number of entries sent.
 */
export function flushQueue(): Promise<number> {
  // Starting the app just as the network comes back fires both triggers at
  // once, and two passes over the same entries would send each one twice.
  if (!flushing) {
    flushing = runFlush().finally(() => {
      flushing = null;
    });
  }

  return flushing;
}

async function runFlush(): Promise<number> {
  if (typeof navigator !== "undefined" && navigator.onLine === false) {
    return 0;
  }

  let database: IDBDatabase;

  try {
    database = await openDatabase();
  } catch {
    return 0;
  }

  let sent = 0;

  try {
    const transaction = database.transaction(STORE_NAME, "readonly");

    const entries = await promisify<QueuedParticipation[]>(
      transaction.objectStore(STORE_NAME).getAll() as IDBRequest<QueuedParticipation[]>,
    );

    for (const entry of entries) {
      let response: Response;

      try {
        response = await fetch(
          `/api/questionnaires/${entry.category}/complete`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(entry.payload),
          },
        );
      } catch {
        // Still offline, or the proxy is down. Try again on the next trigger.
        break;
      }

      // 5xx means the backend took the request and failed on it; retrying is
      // the point of the queue. A 4xx will fail identically forever, so the
      // entry is dropped rather than blocking everything behind it.
      if (response.status >= 500) {
        break;
      }

      const writeTransaction = database.transaction(STORE_NAME, "readwrite");

      await promisify(writeTransaction.objectStore(STORE_NAME).delete(entry.id!));

      if (response.ok) {
        sent += 1;
      } else {
        console.warn(
          `Dropped a queued participation the backend rejected (${response.status}).`,
        );
      }
    }
  } finally {
    database.close();
  }

  return sent;
}

export function markResultQueued(): void {
  try {
    window.sessionStorage.setItem(NOTICE_KEY, "1");
  } catch {
    // Only affects whether /finish mentions the delay.
  }
}

/** Reads the notice and clears it, so it is shown once. */
export function takeQueuedNotice(): boolean {
  try {
    const notice = window.sessionStorage.getItem(NOTICE_KEY);

    window.sessionStorage.removeItem(NOTICE_KEY);

    return notice === "1";
  } catch {
    return false;
  }
}
