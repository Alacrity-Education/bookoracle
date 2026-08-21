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

What still goes over that proxy is narrower than it looks. The questionnaire is
scored **in the browser**, so `/api/*` is only used to load the questions and
to record a completed run (and email it, if the reader asked for that). See
[Offline](#offline) below.

## Local development

```bash
npm install
echo 'BACKEND_URL=http://127.0.0.1:8000' > .env.local
npm run dev
```

Then open http://localhost:3000 with FastAPI running on port 8000.

| Script                       | Purpose                                                        |
| ---------------------------- | -------------------------------------------------------------- |
| `npm run dev`                | Dev server with hot reload                                       |
| `npm run build`              | Production build (`output: standalone`)                          |
| `npm start`                  | Not used in production — see note below                          |
| `npm run typecheck`          | `tsc --noEmit`                                                   |
| `npm run lint`               | Oxlint                                                           |
| `npm run sync:offline-data`  | Copy questions, profiles and books out of the backend            |
| `npm run check:parity`       | Prove the browser scoring engine matches the backend             |
| `npm run check:precache`     | Prove the service worker's route list is complete and reachable  |
| `npm run check:offline`      | Run the service worker with the network cut, and walk the flow   |

The last three need something running: `check:parity` reads the backend's
Python directly (no server), while `check:precache` and `check:offline` expect
`npm run build && npm run start` on port 3000 with the backend up.

`next.config.ts` sets `output: "standalone"`, so production runs
`node server.js` from `.next/standalone` (which is what the Dockerfile does).
`npm start` warns and is not the supported path.

## Layout

```text
public/
├── sw.js                           service worker: precache sweep + strategies
├── icons/                          installed-app icons (generated, committed)
└── offline-data/                   synced from the backend, precached
src/
├── app/
│   ├── layout.tsx                  root layout, global CSS, SessionProvider
│   ├── manifest.ts                 web app manifest (/manifest.webmanifest)
│   ├── page.tsx                    Welcome
│   ├── terms|gdpr|introduction|processing|email|finish/
│   ├── questionnaire/[category]/   server component + client stepper
│   ├── results/[category]/
│   ├── healthz/route.ts            container health probe
│   └── api/[...path]/route.ts      proxy to FastAPI
├── components/
│   ├── ui/                         presentational, no hooks
│   └── pwa/OfflineSupport.tsx      worker registration, queue flush, banner
├── lib/
│   ├── backend.ts                  server-only backend access
│   ├── offlineQueue.ts             IndexedDB queue for unsent participations
│   ├── scoring/                    the recommendation engine, in the browser
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

## Offline

The tablets this runs on are brought online once, the app is installed, and
from then on they are expected to work with no network at all — including a
cold start, a reload and a full run of the questionnaire.

### What needs a network, and what does not

| Step                        | Offline | How                                             |
| --------------------------- | ------- | ----------------------------------------------- |
| Opening the app             | ✅      | Pages and build assets are precached             |
| Reading terms / GDPR / intro| ✅      | Same                                             |
| Answering the questionnaire | ✅      | Questions are precached, and synced to disk      |
| Profile and recommendations | ✅      | Scored in the browser, not on the backend        |
| Recording the participation | ⏳      | Queued in IndexedDB, sent when the network is back |
| Emailing the results        | ⏳      | Same queue — the backend sends the mail          |

A reader is never blocked by the last two. The run finishes, and `/finish`
tells them the results will go out once the tablet is online again.

### How it works

**Scoring runs in the browser.** `src/lib/scoring/engine.ts` is a port of the
backend's `personality_service.py` and `recomendation_service.py`, and it is
the only path the app uses — online and offline alike, so the code a reader
depends on is exercised on every run rather than only when the Wi-Fi drops.
`npm run check:parity` replays random answer sets through both the port and the
Python and fails on any divergence.

**The data it scores against is synced, not fetched.**
`npm run sync:offline-data` copies the questions, the literary profiles and the
books out of `book-recommender-backend/app/data` into `public/offline-data/`,
which is committed. Re-run it whenever that data changes — the backend stays
the source of truth, this is just its copy on the device.

**The service worker precaches the whole app up front.** `public/sw.js` does
not wait to see what the reader visits: on install it fetches every route in
`APP_ROUTES`, the React flight payload behind each one, and every
`/_next/static` asset those pages reference. After that it serves from cache
and refreshes in the background, which is what makes an offline run instant and
lets a new deploy reach a tablet that is online again.

> A route added to the app and not added to `APP_ROUTES` installs fine, passes
> every other check, and then dead ends the first time a tablet opens it with
> no network. `npm run check:precache` is what catches that.

**Unsent runs are queued.** `src/lib/offlineQueue.ts` stores a completion the
backend could not be reached for, and replays it on the next `online` event or
the next time the app starts. A completion the backend *did* answer — with an
error — is not queued when an email is involved, because retrying it would mail
the same reader twice.

### Installing on a tablet

1. Connect the tablet to the internet.
2. Open the app in Chrome (Android) or Safari (iOS).
3. Install it: Chrome offers **Install app** / **Add to Home screen** from the
   menu; on iOS use **Share → Add to Home Screen**.
4. **Leave it open and online for a few seconds.** This is the part that
   matters: the install sweep is downloading the whole app, about 250 kB of it
   the book data. Closing the tab immediately can leave the cache half warm.
5. Open the installed app from the home screen and walk one full questionnaire
   while still online.
6. Put the tablet in airplane mode and run it again. Every page should work,
   and the banner at the top should say the results will be sent later.

### Updating a tablet that is already installed

Being online is enough. Every navigation refreshes its page in the background,
and on each start the app asks the worker to re-sweep, which pulls in a new
deploy's pages and assets. Give a tablet a minute of network after a deploy.

Bump `CACHE_VERSION` in `public/sw.js` when the worker's own caching behaviour
changes: it drops the previous caches on activation and re-precaches from
scratch.

### Verifying a change

```bash
npm run check:parity                      # engine still agrees with the backend
npm run build && npm run start            # in another terminal, backend up
npm run check:precache                    # every route and asset is reachable
npm run check:offline                     # the flow works with the network cut
```

`check:offline` runs `public/sw.js` for real — in a sandbox with a Cache API
shim — installs it against the running server, then makes every fetch fail and
replays the reader's path through the worker's own fetch handler. It covers the
worker's logic, not the browser's: registration, scope and the install
lifecycle still want one real device before a rollout.

## Cloudflare

The app is served through Cloudflare in production. Most of it needs no
configuration, but three things are worth getting right.

**1. `/sw.js` must never be served stale.** The worker decides what an offline
tablet can do, so a cached copy of it is a cached copy of the whole app's
behaviour. The origin already sends `Cache-Control: no-cache, no-store,
must-revalidate` (set in `next.config.ts`), and Cloudflare respects that — with
one exception:

- **Caching → Configuration → Browser Cache TTL** must be
  *Respect Existing Headers*. Any fixed value there overrides the origin and
  pins the worker in the browser's cache for that long.
- Optionally, belt and braces: a Cache Rule matching `URI Path equals /sw.js`
  with *Bypass cache*.

**2. Do not cache HTML or flight payloads at the edge.** That is the default,
so this is a "don't turn it on" rather than a "turn it on":

- No **Cache Everything** rule covering the app's routes, and no APO.
- Reason beyond the usual staleness: a page URL answers *two* different things
  depending on the `RSC` request header — the HTML document and the React
  flight payload. Cloudflare ignores `Vary` (other than `Accept-Encoding`), so
  an edge-cached route can serve one where the browser asked for the other.
  Stale HTML is also worse than usual here, because it points at hashed asset
  filenames that no longer exist after a deploy.

**3. Leave `/_next/static/*` cached, and leave Rocket Loader off.** Next stamps
those filenames with a content hash and serves them `immutable`, so
Cloudflare's default caching of them is exactly right. Rocket Loader rewrites
how scripts load and is a known way to break service worker registration; it is
off by default, so just don't enable it for this hostname.

Also worth knowing:

- **HTTPS is required** for service workers. Any normal Cloudflare setup gives
  you that; SSL/TLS mode should be Full (strict) with *Always Use HTTPS* on.
- **`/offline-data/*.json`** is sent with `must-revalidate` and `.json` is not
  an extension Cloudflare caches by default, so it comes from the origin and
  the tablet serves it from the worker's cache anyway. Nothing to configure.
- **Bot protection**: the install sweep is ~50 requests in a couple of seconds
  from one address. If Bot Fight Mode or a rate limit challenges it, those
  responses are not 200 and the worker skips them, leaving the tablet with a
  half-warm cache and no error anyone will see. Keep the app's hostname off
  aggressive bot rules.
