# Quality Inspection Tracker

A mobile-first web app for Arvind shop-floor supervisors to log, track and resolve fabric quality defects — replacing the paper register and the spreadsheet re-entry that follows it.

**Stack:** React 19 · Vite · TypeScript · Tailwind CSS · Node · Express 5 · Prisma 7 · PostgreSQL 16 · Docker

---

## Setup

### With Docker

```bash
git clone <repo-url>
cd quality-inspection-tracker
docker compose up --build
```

| | |
|---|---|
| App | <http://localhost:8080> |
| API | <http://localhost:4000/api/health> |
| Login | `supervisor` / `arvind123` |

That is the only command. The API container applies migrations on start and seeds ~25 demo inspections across every severity, status and defect type, so the list, filters and summary all have data on first load.

The seed skips itself once the database has rows, so a restart never wipes your data. To reset deliberately:

```bash
docker compose down -v && docker compose up --build
```

### Without Docker

Needs Node 20+ and a PostgreSQL 14+ instance.

```bash
# API — terminal 1
cd apps/api
cp .env.example .env          # set DATABASE_URL
npm install
npx prisma generate           # client is generated, not committed
npx prisma migrate deploy
npm run db:seed
npm run dev                   # http://localhost:4000

# Web — terminal 2
cd apps/web
npm install
npm run dev                   # http://localhost:5173
```

The Vite dev server proxies `/api` to port 4000, so there is no CORS setup and no API URL to configure. Every environment variable has a working default; see the `.env.example` files if you need to change one.

---

## What's implemented

**All four required features**

- **Log an inspection** — date (defaults to today, backdatable), machine/line ID, defect type, severity, optional remarks
- **List** — filter by severity, status, date range, defect type and machine ID; six sort orders; paginated
- **Resolve** — mandatory resolution note, enforced on both client and server
- **Summary** — open/resolved counts by severity, plus totals

**Two of the three bonuses**

- **Mock SAP integration** — `POST /api/sap-webhook`, secured with a shared-secret header ([details below](#sap-webhook))
- **Authentication** — JWT with bcrypt-hashed passwords; login is required on every route except `/api/health` and the SAP webhook

**Not implemented**

- **Offline sync** — the app requires connectivity. A save attempted with no network fails with an error rather than queueing; the entry has to be re-entered. See [What I'd do differently](#what-id-do-differently-with-more-time).

---

## Mobile-first

Designed and tested at **390px** in a real browser: no horizontal scrolling on any screen, every tap target at least 44px, and all text inputs at 16px so iOS Safari does not zoom on focus. Inspections render as cards with a coloured severity rail rather than table rows, which are unreadable at that width. Filters open in a bottom sheet so they cost no screen height while scanning the list.

---

## API

Base path `/api`. Errors share one shape:

```json
{ "error": { "code": "VALIDATION_ERROR", "message": "One or more fields are invalid",
             "details": { "machineId": ["Machine / line ID is required"] } } }
```

| Method | Path | Notes |
|---|---|---|
| `GET` | `/health` | Liveness. No auth. |
| `POST` | `/auth/login` | `{ username, password }` → `{ token, user }` |
| `GET` | `/auth/me` | Validates a stored token |
| `GET` | `/inspections` | Filter, sort, paginate |
| `POST` | `/inspections` | `201` on success |
| `GET` | `/inspections/:id` | Single record |
| `PATCH` | `/inspections/:id/resolve` | `{ resolutionNote }` — `422` if blank, `409` if already resolved |
| `GET` | `/inspections/summary` | Counts by severity and status |
| `POST` | `/sap-webhook` | Requires `x-sap-signature`. No login. |

**Query parameters on `GET /inspections`**

`status` · `severity` · `defectType` · `machineId` (partial match) · `from` / `to` (`YYYY-MM-DD`, inclusive, on the inspection date) · `sortBy` (`inspectionDate` \| `createdAt` \| `severity` \| `machineId`) · `order` · `page` · `limit`

**Status codes**

`200` OK · `201` created · `400` malformed JSON · `401` bad or missing credentials · `404` not found · `409` already resolved · `413` body too large · `422` validation failed · `503` database unreachable

### SAP webhook

SAP cannot complete an interactive login, so this endpoint sits outside the JWT wall and is authenticated with a **shared secret in the `x-sap-signature` header** instead. A request with a missing or incorrect header is rejected with `401` before the payload is even parsed.

The secret comes from `SAP_WEBHOOK_SECRET` and defaults to `arvind-sap-demo-secret`; override it in `.env` or the environment.

```bash
curl -X POST http://localhost:4000/api/sap-webhook \
  -H 'content-type: application/json' \
  -H 'x-sap-signature: arvind-sap-demo-secret' \
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

| Field | Required | Maps to |
|---|---|---|
| `notification_no` | yes | Idempotency key, stored as `sap:<no>` |
| `work_center` | yes | Machine ID, uppercased |
| `defect_code` | yes | Defect type — `WEAVE` / `SHADE` / `HOLE` / `TEAR` / `COUNT`, anything else becomes `OTHER` |
| `priority` | no | Severity — `1` Critical, `2` Major, `3` Minor; absent means Major |
| `posting_date` | no | Inspection date; absent means today |
| `plant_code`, `long_text` | no | Folded into remarks |

SAP resends a notification until it gets a `2xx`, so the notification number is used as an idempotency key: a redelivery returns `200` with the original record instead of creating a duplicate. Unknown defect codes fall back to `OTHER` rather than being rejected, since a `4xx` would just make the sender retry forever.

---

## Architecture decisions

**Two apps, one compose file, no monorepo tooling.**
`apps/api` and `apps/web` are independent npm packages with their own lockfiles, joined only by `docker-compose.yml`. Workspaces or Turborepo would add dependency-resolution behaviour that can fail on someone else's machine, and these two packages never import each other. The cost is some duplicated dev dependencies; the benefit is that either app builds in isolation.

**Express with thin routes over a service layer.**
Nine CRUD endpoints, no realtime and no background jobs, so Express is the smallest thing that does the job and needs no framework conventions explained. Route handlers only parse input and choose a status code; all logic lives in a service module. That keeps the HTTP layer swappable and the business rules testable on their own.

**Zod at the edges, mirrored on the client.**
Every request body and query string is parsed by Zod before a handler runs, and the same rules are repeated in the browser with react-hook-form. The duplication is deliberate: the client copy gives instant per-field feedback, while the server copy is the one that actually protects the database. Failures are returned as a per-field map so the form can highlight the exact input.

**Postgres enums and a single table.**
The brief describes one entity, so defect type, severity and status are database enums rather than lookup tables — the value set is fixed and Postgres will reject anything that slips past validation. A useful side effect: the `Severity` enum is declared `CRITICAL, MAJOR, MINOR`, so ordering by that column ascending is also ordering by urgency, and "most severe first" needs no `CASE` expression.

**`inspection_date` is a SQL `DATE` pinned to UTC.**
A supervisor records which *day* a defect was found, not an instant, and storing a timestamp would make a defect logged at 11pm IST read as the previous day elsewhere. The column is `DATE`, the API returns `YYYY-MM-DD`, and the client formats it without ever building a local-time `Date`. The audit fields `createdAt` and `resolvedAt` stay full timestamps, because there the exact moment is the point.

**nginx serves the SPA and proxies `/api`.**
The browser therefore talks to a single origin, which means no CORS configuration and no API URL baked into the bundle at build time. The Vite dev server proxies identically, so development and the Docker deployment behave the same.

---

## Assumptions

Stated here rather than asked, per the brief:

1. **The inspection date is user-picked and backdatable** — supervisors are clearing a paper backlog, so forcing today's date would defeat the purpose. Future dates are rejected.
2. **The date filter applies to the inspection date, not the created date** — a register filled in today can describe last week's defect.
3. **Status is a stored column**, not derived from whether a resolution note exists. Simpler to index and filter, and it leaves room for a future in-progress state.
4. **Resolution is one-way** — re-opening is not in the brief, so a second resolve attempt returns `409` instead of overwriting the original note.
5. **Summary counts are plant-wide** and ignore the list filters, since the summary answers "how is the plant doing" rather than "what am I looking at".
6. **Machine IDs are normalised on write** (trimmed and uppercased). There is no machine master data, and without this, filtering breaks the moment someone types `loom-14`.
7. **Single plant, single tenant** — no site dimension, since the hierarchy was not specified.
8. **One shared supervisor account** — auth is a bonus and the brief said keep it simple, so there are no roles and inspections are not attributed to a user.

---

## What I'd do differently with more time

- **Automated tests.** The biggest gap. I verified the API end to end with curl and drove the UI through a headless browser at 390px, but there is no committed test suite. First additions would be Vitest plus Supertest against a throwaway Postgres, covering the date-range filter, the resolve rules and webhook idempotency — the logic most likely to break quietly.
- **Offline support.** Descoped. Doing it properly needs two halves: an IndexedDB write queue keyed by an idempotency token, *and* a service worker to cache the app shell, since a phone that gets locked and reopened needs the page itself to load without a network. A half-built version that silently loses a supervisor's entry would be worse than not offering it.
- **Per-user attribution.** Inspections record no author. Real use needs `created_by` and `resolved_by`, without which the audit trail is weaker than the signed paper register it replaces.
- **Photo attachments.** The single most useful missing field for a fabric defect, left out because it pulls in object storage and upload handling.
- **Editing an inspection.** Only create and resolve exist today, so a typo in a machine ID cannot be corrected.
- **Hardening.** The JWT lives in `localStorage`, which is readable by any XSS; an httpOnly cookie with CSRF protection is the production answer. There is also no rate limiting on login or the webhook, and `JWT_SECRET` needs to come from a secret manager rather than a default.
