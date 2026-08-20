# Quality Inspection Tracker

A mobile-first web app for Arvind shop-floor supervisors to log, track and resolve fabric quality defects — replacing the paper register and the spreadsheet re-entry that follows it.

Built for the Arvind AI & Analytics full-stack hiring assignment.

---

## Quick start

### With Docker (recommended)

```bash
git clone <this-repo>
cd quality-inspection-tracker
docker compose up --build
```

Then open **<http://localhost:8080>**.

| | |
|---|---|
| **App** | <http://localhost:8080> |
| **API** | <http://localhost:4000/api/health> |
| **Login** | `supervisor` / `arvind123` |

Nothing else to run. The API container applies migrations on start and seeds ~25 demo inspections spread across every severity, status and defect type, so the list, filters and summary all have something to show on first load.

The seed is **idempotent** — it skips entirely once the database has rows, so `docker compose restart` never destroys your data. To reset deliberately:

```bash
docker compose down -v && docker compose up --build
```

#### What `docker compose up` actually does

You do not need PostgreSQL installed — the database runs in a container too. On a
cold start the stack builds itself end to end:

1. Docker creates the network and the `postgres-data` volume.
2. Postgres sees an empty volume, runs `initdb`, and creates the `qit` role and
   the `qit` database from the compose environment.
3. A `pg_isready` healthcheck polls until the database genuinely accepts
   connections. The API is gated on it (`depends_on: condition: service_healthy`)
   — without that gate the first migration races an unready database.
4. The API entrypoint verifies the generated Prisma client is in the image, runs
   `prisma migrate deploy` to create every table, enum and index, then seeds demo
   data, then starts serving.
5. nginx serves the built SPA and proxies `/api` to the API container.

What happens on later runs depends only on whether the volume already holds data:

| Command | Volume | Migrations | Seed |
|---|---|---|---|
| First `up --build` | created | applied | 25 inspections inserted |
| `up` or `restart` again | reused | "no pending" | skipped — your data is kept |
| `down` then `up` | kept | "no pending" | skipped |
| `down -v` then `up` | wiped and recreated | applied | 25 inspections again |

The Prisma client is generated at **build** time, not at boot. Prisma 7's
`prisma-client` generator emits TypeScript, which only becomes runnable once
`tsc` compiles it into `dist/`; the runtime image contains no `src/` directory to
regenerate into. The entrypoint therefore verifies the client exists and fails
with an actionable message rather than repeating a step that cannot work there.

> **Port note:** Postgres is published on host port `5432` so you can attach psql
> or Prisma Studio. If you also run PostgreSQL natively, set `POSTGRES_PORT=5433`
> in `.env` — container-to-container traffic uses `postgres:5432` regardless.

### Without Docker

Requires Node 20+ and a PostgreSQL 14+ instance you can reach.

```bash
# 1. API
cd apps/api
cp .env.example .env          # edit DATABASE_URL to point at your Postgres
npm install
npx prisma generate           # required: the client is generated, not committed
npx prisma migrate deploy
npm run db:seed
npm run dev                   # → http://localhost:4000

# 2. Web (in a second terminal)
cd apps/web
npm install
npm run dev                   # → http://localhost:5173
```

The Vite dev server proxies `/api` to `localhost:4000`, so there is no CORS setup and no API URL to configure.

Neither app needs a `.env` file to run — every value has a working default. Both ship an `.env.example` for the cases where you do:

| File | Contains |
|---|---|
| `.env.example` (root) | compose overrides — ports, Postgres credentials, `JWT_SECRET` |
| `apps/api/.env.example` | API config for running it outside Docker; `DATABASE_URL` is the one you must set |
| `apps/web/.env.example` | `API_PROXY_TARGET` (dev proxy) and `VITE_API_BASE_URL` (baked into the bundle) |

Only `VITE_`-prefixed variables reach the browser. `API_PROXY_TARGET` is deliberately unprefixed: it configures the dev server, never the bundle.

### Verifying a running stack

```bash
./scripts/smoke-test.sh
```

Exercises all 22 API behaviours — auth, filters, resolution rules, the SAP webhook and the error envelope — and doubles as executable documentation of the contract.

---

## What's implemented

**All four required features**

- **Log an inspection** — date (defaults to today, backdatable), machine/line ID, defect type, severity, optional remarks
- **List** — filter by severity, status, date range, defect type and machine ID; six sort orders; paginated
- **Resolve** — one-way transition to Resolved with a mandatory resolution note, enforced on both client and server
- **Summary** — Open/Resolved counts by severity, plus plant-wide totals

**Two of the three bonuses**

- **Mock SAP integration** — `POST /api/sap-webhook` auto-creates inspections from an SAP QM-shaped payload ([contract below](#sap-webhook))
- **Authentication** — JWT bearer tokens, bcrypt password hashing, single seeded supervisor. Login is required: every route except `/api/health` and `/api/sap-webhook` rejects an unauthenticated request with `401`.

Offline support was scoped out — see [What I cut](#what-i-cut-and-what-id-do-differently).

---

## Architecture decisions

**Two apps, one compose file, no monorepo tooling.**
`apps/api` and `apps/web` are independent npm packages with their own lockfiles, wired together only by `docker-compose.yml`. Turborepo or workspaces would add a layer of resolution behaviour that can fail on a reviewer's machine, and this project has exactly two packages that never import each other. The cost is duplicated dev dependencies; the benefit is that either app can be built in isolation with `npm ci && npm run build`.

**Express over Nest or Fastify.**
The API is eleven endpoints of CRUD with no realtime, no background jobs and no plugin surface. Express is the smallest thing that does that job and the one a reviewer can read top-to-bottom without learning a framework's conventions first. Routes stay thin and delegate to a service layer, so the framework is swappable if this ever grows.

**Zod schemas at the edges, twice.**
Every request body and query string is parsed by Zod before a route handler sees it, and the same rules are duplicated in the browser with `react-hook-form`. The duplication is deliberate: the client copy gives instant feedback and still works with no network, while the server copy is the one that actually protects the database. Zod failures are converted to a per-field error map so forms can highlight the exact input.

**Postgres enums and a single table.**
The assignment describes one entity. Defect type, severity, status and source are database enums rather than lookup tables — the value set is fixed by the spec, and enums let Postgres reject a bad write that somehow bypassed validation. A useful side effect: because the `Severity` enum is declared `CRITICAL, MAJOR, MINOR`, sorting ascending on that column is also sorting by urgency, so "most severe first" needs no `CASE` expression.

**`inspection_date` is a bare SQL `DATE`, pinned to UTC.**
Supervisors record *which day* a defect was found, not an instant. Storing a timestamp would mean a defect logged at 11pm IST reads as the previous day to a reviewer in UTC. The column is `DATE`, the API serialises it as `YYYY-MM-DD`, and the client formats it without ever constructing a local-time `Date` — the audit timestamps (`createdAt`, `resolvedAt`) remain full ISO instants because for those the exact moment *is* the point.

**Machine IDs are normalised on write.**
The spec says free text, so there is no machine master data and no validation. But `loom-4`, `LOOM-4` and `Loom-4 ` are the same loom, and if they are stored as typed then filtering by machine is quietly useless. Every ID is trimmed, internally whitespace-collapsed and uppercased before it is saved.

**Idempotency keys, not "did it send?"**
SAP resends a notification until it receives a `2xx`, so the webhook derives an idempotency key from the document number (`sap:<notification_no>`) and stores it in the unique `client_ref` column. A redelivery of a notification the server already committed collapses onto the existing row and returns `200` with the original record, rather than `201` and a duplicate. The UI never sets this key — it is a machine-to-machine concern.

**Mutations fail fast instead of hanging when the network is down.**
React Query's default `networkMode: 'online'` *pauses* a mutation whenever the browser reports itself offline: the mutation function never runs, its promise never settles, and the save button spins indefinitely with no error shown. `networkMode: 'always'` lets the request run, fail immediately, and surface a message the supervisor can act on.

**Filters live in the URL.**
The list view's state is entirely in the query string, so "all open criticals" is a bookmarkable, shareable link, and the browser back button restores the exact view a supervisor left rather than dumping them at an unfiltered list.

**Cards, not a table.**
A five-column table is unreadable at 390px. Each inspection is a card with a coloured severity rail on the left edge for at-a-glance triage, and the whole card is the tap target. Severity is never communicated by colour alone — every badge carries its label too.

---

## Mobile-first notes

Designed and verified at **390px** (iPhone 12/13/14). Checked with a headless browser at that exact viewport:

- Zero horizontal overflow on every screen
- Every interactive control is at least 44px tall
- All text inputs are 16px, below which iOS Safari auto-zooms on focus and breaks the layout
- Native `<select>` and `<input type="date">` so phones open the OS picker
- Bottom navigation and the "Log" button sit within thumb reach, with `env(safe-area-inset-bottom)` padding to clear the home indicator
- Filters open in a bottom sheet rather than an always-visible row, which at 390px would consume a third of the screen for an occasional action

---

## API reference

Base URL `/api`. All responses are JSON. Errors share one envelope:

```json
{ "error": { "code": "VALIDATION_ERROR", "message": "One or more fields are invalid", "details": { "machineId": ["Machine / line ID is required"] } } }
```

| Method | Path | Notes |
|---|---|---|
| `GET` | `/health` | Liveness. Never touches the database. |
| `GET` | `/health/ready` | Readiness. `503` if Postgres is unreachable. |
| `POST` | `/auth/login` | `{ username, password }` → `{ token, user }`. |
| `GET` | `/auth/me` | Validates a stored token. |
| `GET` | `/inspections` | Filter, sort and paginate. Parameters below. |
| `POST` | `/inspections` | Create. `201` on success. |
| `GET` | `/inspections/:id` | Single record. |
| `PATCH` | `/inspections/:id/resolve` | `{ resolutionNote }`. `422` if blank, `409` if already resolved. |
| `GET` | `/inspections/summary` | Counts by severity and status. |
| `POST` | `/sap-webhook` | Mock SAP integration. No auth required. |

**Query parameters on `GET /inspections`**

| Parameter | Values |
|---|---|
| `status` | `OPEN` \| `RESOLVED` |
| `severity` | `CRITICAL` \| `MAJOR` \| `MINOR` |
| `defectType` | `WEAVE_DEFECT` \| `SHADE_VARIATION` \| `HOLE_TEAR` \| `COUNT_DEVIATION` \| `OTHER` |
| `machineId` | Partial match, case-insensitive |
| `from`, `to` | `YYYY-MM-DD`, inclusive, applied to `inspectionDate` |
| `sortBy` | `inspectionDate` \| `createdAt` \| `severity` \| `machineId` |
| `order` | `asc` \| `desc` |
| `page`, `limit` | `limit` capped at 100, default 20 |

### SAP webhook

Modelled on an SAP QM quality-notification outbound message: snake_case keys, coded values rather than labels, and a document number that works as an idempotency key.

```bash
curl -X POST http://localhost:4000/api/sap-webhook \
  -H 'content-type: application/json' \
  -d '{
    "notification_no": "10000456",
    "plant_code": "AHM-01",
    "posting_date": "2026-08-19",
    "work_center": "LOOM-14",
    "defect_code": "WEAVE",
    "priority": 1,
    "long_text": "Auto-raised from SAP QM notification."
  }'
```

| Field | Required | Maps to | Notes |
|---|---|---|---|
| `notification_no` | yes | `clientRef` as `sap:<no>` | Idempotency key |
| `work_center` | yes | `machineId` | Normalised to uppercase |
| `defect_code` | yes | `defectType` | `WEAVE` / `SHADE` / `HOLE` / `TEAR` / `COUNT`; anything else → `OTHER` |
| `priority` | no | `severity` | `1`→Critical, `2`→Major, `3`→Minor; absent → Major |
| `posting_date` | no | `inspectionDate` | `YYYY-MM-DD`; absent → today |
| `plant_code` | no | appended to `remarks` | |
| `long_text` | no | `remarks` | |

Responds `201` for a new notification and `200` for a replay, both with the resulting inspection. The full payload is retained in a `sap_payload` JSONB column for traceability, and records created this way are tagged with a **SAP** badge in the UI.

Unrecognised defect codes degrade to `OTHER` rather than rejecting the message — a webhook that 4xxs on an unknown code just gets retried forever by the sender. Set `SAP_WEBHOOK_SECRET` to require a matching `x-sap-signature` header; it is unset by default so the endpoint is curl-able in development.

---

## Assumptions

The brief said to state assumptions and proceed. These are the calls I made:

1. **The inspection date is user-picked and backdatable.** Supervisors are clearing a paper backlog, so forcing today's date would defeat the purpose of the tool. Future dates are rejected.
2. **The date-range filter applies to `inspectionDate`, not `createdAt`.** A register backfilled today can describe a defect from last week, and "show me last week" should mean when the defect happened.
3. **`status` is a stored column, not derived** from the presence of a resolution note. Simpler to index and filter, and it leaves room for a future `IN_PROGRESS` state.
4. **Resolution is one-way.** Re-opening is not in the spec, so a resolved inspection returns `409` on a second resolve attempt rather than silently overwriting the original note.
5. **Summary counts are plant-wide** and deliberately ignore the list view's filters. The summary answers "how is the plant doing", which should not shift as someone narrows a list on another screen.
6. **Single plant, single tenant.** No plant or site dimension, even though the brief mentions plants across Gujarat and Maharashtra — adding one without knowing the hierarchy would be guessing.
7. **`OTHER` does not force a remark.** The spec marks remarks optional with no exception, so I did not add one.
8. **One shared supervisor account.** Auth is a bonus and the brief said keep it simple, so there is no registration, no roles and no per-user attribution of inspections.

---

## What I cut, and what I'd do differently

**Cut deliberately**

- **Automated tests.** There is no unit or integration suite. Instead there is `scripts/smoke-test.sh`, which covers 22 API behaviours end-to-end, and I drove the full UI through a headless browser at 390px to verify the flows. With more time the first thing I would add is Vitest plus Supertest against a throwaway Postgres, because the service layer's date-range and idempotency logic is exactly the kind of code that breaks quietly.
- **Per-user attribution.** Inspections record no author. The `users` table exists for login only. Real deployment needs `created_by` and `resolved_by` — without them the audit trail is incomplete, which somewhat undercuts the point of replacing a signed paper register.
- **Offline support.** Descoped. The app requires connectivity: a failed save reports an error rather than queueing the entry. Implementing it well means an IndexedDB write queue keyed by an idempotency token *plus* a service worker to cache the app shell, since a phone that gets locked and reopened needs the page itself to load without a network. Both halves are needed for the feature to be real, and a half-built version that loses a supervisor's entry is worse than not offering it.
- **Photo attachments.** The single most valuable missing field for a fabric defect. Left out because it drags in object storage and upload progress handling.
- **Editing an inspection.** Only create and resolve exist. A typo in a machine ID currently cannot be fixed.
- **Server-side pagination cursors.** Offset pagination is fine at this scale but degrades on large tables.

**Known limitations**

- **The app requires connectivity.** With no signal a save fails with an error and the entry is lost — the supervisor has to re-enter it. On a shop floor with patchy coverage this is the most user-visible gap.
- **The JWT is stored in `localStorage`,** which is readable by any XSS on the page. An httpOnly cookie plus CSRF protection is the right answer for production; `localStorage` is the simple one the brief asked for.
- **The SAP webhook is unauthenticated by default.** It is the one route outside the login wall, because SAP cannot complete an interactive login. Set `SAP_WEBHOOK_SECRET` to require a matching `x-sap-signature` header.
- **`JWT_SECRET` has a development default.** Fine for a local assignment, not for a deployment — it must be set from a secret manager.
- **No rate limiting** on `/auth/login` or the webhook.

**Verification status — full disclosure**

I do not have Docker or PostgreSQL installed on this machine, so I want to be precise about what has and has not been executed:

| | Status |
|---|---|
| API against real PostgreSQL 16 | ✅ Verified — migration, seed and all 24 smoke-test checks pass |
| Full UI flow at 390px in a real browser | ✅ Verified — login, log, filter, sort, resolve, summary; no console errors, no horizontal overflow, all tap targets ≥44px |
| Typecheck, ESLint, production builds | ✅ Clean on both apps |
| `prisma migrate deploy` with production-only dependencies | ✅ Verified against a simulated runtime dependency set |
| **`docker compose up --build`** | ⚠️ **Not executed** — Docker is not installed here |

I ran Postgres for the above through an embedded binary rather than a container. The compose file, both Dockerfiles and the nginx config are written carefully and the YAML is valid, but **the container build itself is the one part of this submission I could not run**. If it fails for you, the non-Docker path above is fully tested and takes about two minutes.

---

## Project layout

```
quality-inspection-tracker/
├── docker-compose.yml          # postgres + api + web
├── .env.example                # every value has a working default
├── scripts/smoke-test.sh       # 24-check API verification
└── apps/
    ├── api/
    │   ├── prisma/
    │   │   ├── schema.prisma
    │   │   └── migrations/
    │   ├── src/
    │   │   ├── modules/        # inspections | auth | sap
    │   │   ├── middleware/     # auth, error handling
    │   │   ├── lib/            # errors, dates, async wrapper
    │   │   ├── app.ts          # express wiring
    │   │   ├── server.ts       # listen + graceful shutdown
    │   │   └── seed.ts
    │   ├── Dockerfile
    │   └── docker-entrypoint.sh   # migrate deploy, then start
    └── web/
        ├── src/
        │   ├── pages/          # list | new | detail | summary | login
        │   ├── components/     # layout, cards, filter sheet, ui primitives
        │   ├── hooks/          # queries and mutations
        │   ├── lib/            # api client, formatting, labels
        │   └── context/        # auth
        ├── nginx.conf          # SPA fallback + /api proxy
        └── Dockerfile
```

## Tech stack

**Frontend** React 19 · Vite · TypeScript · Tailwind CSS v4 · TanStack Query · react-hook-form · Zod · React Router · ESLint · Prettier

**Backend** Node 24 · TypeScript · Express 5 · Prisma 7 · PostgreSQL 16 · Zod · JWT · bcrypt · ESLint · Prettier

**Deployment** Docker · docker-compose · nginx
