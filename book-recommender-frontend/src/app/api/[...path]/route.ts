import { backendUrl } from "@/lib/backend";

/**
 * Same-origin proxy to FastAPI.
 *
 * The browser only ever talks to this route, so the backend needs no public
 * domain and no CORS configuration, and the API location stays a runtime
 * setting instead of being compiled into the bundle.
 */

// The proxy must run per-request; caching it would serve one user's
// recommendations to the next.
export const dynamic = "force-dynamic";

type RouteContext = {
  // Dynamic params are async in Next 15+.
  params: Promise<{ path: string[] }>;
};

async function proxy(request: Request, context: RouteContext): Promise<Response> {
  const { path } = await context.params;

  const search = new URL(request.url).search;
  const target = `${backendUrl()}/api/${path.join("/")}${search}`;

  // GET/HEAD must not carry a body, and Node's fetch rejects one outright.
  const hasBody = request.method !== "GET" && request.method !== "HEAD";

  let response: Response;

  try {
    response = await fetch(target, {
      method: request.method,
      headers: {
        "Content-Type":
          request.headers.get("content-type") ?? "application/json",
        Accept: request.headers.get("accept") ?? "application/json",
      },
      body: hasBody ? await request.text() : undefined,
      cache: "no-store",
    });
  } catch (error) {
    // A DNS failure or refused connection would otherwise surface as an
    // opaque 500; make it explicit that the backend is the unreachable part.
    console.error(`Proxy to ${target} failed:`, error);

    return Response.json(
      { detail: "Backend unavailable." },
      { status: 502 },
    );
  }

  // Stream the body through untouched and keep the backend's status, so
  // FastAPI validation errors still reach the client intact.
  return new Response(response.body, {
    status: response.status,
    headers: {
      "Content-Type":
        response.headers.get("content-type") ?? "application/json",
    },
  });
}

export { proxy as GET, proxy as POST, proxy as PUT, proxy as PATCH, proxy as DELETE };
