/**
 * Container-level liveness probe. Deliberately does not touch the backend:
 * it answers "is this Next server up", which is what the orchestrator
 * restarts on. Backend reachability is reported per request by the proxy.
 */
export const dynamic = "force-dynamic";

export function GET(): Response {
  return new Response("ok\n", {
    status: 200,
    headers: { "Content-Type": "text/plain" },
  });
}
