# LIRA — frontend (Next.js)

Next.js 16 (App Router) + TypeScript. Serves the questionnaire UI and acts as
the only public entry point for the stack.

## How it talks to the backend

The browser never calls FastAPI directly. It calls this app's own `/api/*`
routes, which forward the request to the backend on the server:

```text
browser ──▶ /api/questionnaires/prose        (same origin)
                  │
            Next server  ── BACKEND_URL ──▶  FastAPI /api/questionnaires/prose
```

Two consequences worth knowing:

- **No API URL is compiled into the bundle.** `BACKEND_URL` is read per
  request, so the same image runs in every environment and moving domains is a
  restart, not a rebuild. (A `NEXT_PUBLIC_*` variable would *not* behave this
  way — those are inlined at build time, exactly like Vite's `VITE_*`.)
- **No CORS.** Every browser request stays on one origin.

The backend therefore needs no public domain; in `docker-compose.yml` it is
reachable only on the internal network.

## Local development

```bash
npm install
echo 'BACKEND_URL=http://127.0.0.1:8000' > .env.local
npm run dev
```

Then open http://localhost:3000 with FastAPI running on port 8000.

| Script            | Purpose                                       |
| ----------------- | --------------------------------------------- |
| `npm run dev`     | Dev server with hot reload                    |
| `npm run build`   | Production build (`output: standalone`)        |
| `npm start`       | Not used — see note below                     |
| `npm run typecheck` | `tsc --noEmit`                              |
| `npm run lint`    | Oxlint                                        |

`next.config.ts` sets `output: "standalone"`, so production runs
`node server.js` from `.next/standalone` (which is what the Dockerfile does).
`npm start` warns and is not the supported path.

## Layout

```text
src/
├── app/
│   ├── layout.tsx                  root layout, global CSS, SessionProvider
│   ├── page.tsx                    Welcome
│   ├── terms|gdpr|introduction|processing|email|finish/
│   ├── questionnaire/[category]/   server component + client stepper
│   ├── results/[category]/
│   ├── healthz/route.ts            container health probe
│   └── api/[...path]/route.ts      proxy to FastAPI
├── components/ui/                  presentational, no hooks
├── lib/
│   ├── backend.ts                  server-only backend access
│   └── session.tsx                 questionnaire session context
├── services/                       client API calls (baseURL "/api")
├── types/  utils/  constants/  content/  styles/
```

### Server vs client

`questionnaire/[category]/page.tsx` is a **server component**: it fetches the
questions from FastAPI so they arrive in the initial HTML. The 20-question
stepper is inherently interactive, so it lives in a sibling client component.

`components/ui/*` use no hooks and no browser APIs, so they carry no
`"use client"` directive and stay usable from server components.

### Carrying the result between pages

react-router passed results via `navigate(..., { state })`. The App Router has
no equivalent, so `lib/session.tsx` holds the session in context and mirrors it
to `sessionStorage`. Consumers must wait for `ready` before treating a missing
session as absent, otherwise the first paint after a refresh would flash the
"result unavailable" state.

Unlike the previous implementation, refreshing `/results` keeps the results.
`/finish` clears the stored session.
