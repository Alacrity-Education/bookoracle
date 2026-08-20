/**
 * Server-only access to the FastAPI backend.
 *
 * Read at request time rather than build time, which is the whole point of
 * routing API traffic through the Next server: the deployed image carries no
 * baked-in hostname, so the same image runs in any environment.
 *
 * Never import this from a client component — BACKEND_URL has no NEXT_PUBLIC_
 * prefix and would be undefined in the browser.
 */
export function backendUrl(): string {
  // Defaults to the local dev backend; compose overrides it with the
  // internal service name (http://backend:8000).
  const raw = process.env.BACKEND_URL ?? "http://127.0.0.1:8000";

  // A trailing slash would produce "//api/..." after joining.
  return raw.replace(/\/+$/, "");
}

/**
 * Fetches a JSON resource from the backend for server-side rendering.
 * `path` is relative to the backend's /api prefix, e.g. "questionnaires/prose".
 */
export async function fetchFromBackend<T>(
  path: string,
  init?: RequestInit,
): Promise<T> {
  const response = await fetch(`${backendUrl()}/api/${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...init?.headers },
    // Questionnaire content is small and changes with a deploy, but a stale
    // cache here would be confusing; correctness beats a cache hit.
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(
      `Backend responded ${response.status} for /api/${path}`,
    );
  }

  return response.json() as Promise<T>;
}
