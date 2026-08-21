# Quality Inspection Tracker

A mobile-first web app for Arvind shop-floor supervisors to log, track and resolve fabric quality defects — replacing the paper register and the spreadsheet re-entry that follows it.

**Stack:** React 19 · Vite · TypeScript · Tailwind CSS · Node · Express 5 · Prisma 7 · PostgreSQL 16 · Docker

---

## Setup

### With Docker

```bash
git clone https://github.com/HARDIK-31/quality-Inspection-tracker.git
cd quality-inspection-tracker
docker compose up --build
```

| | |
|---|---|
| App | <http://localhost:8080> |
| API | <http://localhost:4000/api/health> |
| Login | `supervisor` / `arvind123` |

That is the only command. The API container applies migrations on start and seeds ~25 demo inspections across every severity, status and defect type, so the list, filters and summary all have data on first load.

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

- **Offline sync** — the app requires connectivity.

---

## Mobile-first

Designed and tested at **390px** in a real browser: no horizontal scrolling on any screen, every tap target at least 44px, and all text inputs at 16px so iOS Safari does not zoom on focus. Inspections render as cards with a coloured severity rail rather than table rows, which are unreadable at that width. Filters open in a bottom sheet so they cost no screen height while scanning the list.

---

## API

Base path `/api`. Errors share one shape:

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

### SAP webhook

SAP cannot complete an interactive login, so this endpoint sits outside the JWT wall and is authenticated with a **shared secret in the `x-sap-signature` header** instead. A request with a missing or incorrect header is rejected with `401` before the payload is even parsed.

The secret comes from `SAP_WEBHOOK_SECRET` and defaults to `x-arvind-001-dhrq24sd3-sap`; override it in `.env` or the environment.

```bash
curl -X POST http://localhost:4000/api/sap-webhook \
  -H 'content-type: application/json' \
  -H 'x-sap-signature: x-arvind-001-dhrq24sd3-sap' \
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
---

## Architecture decisions

**Two separate apps, one Docker setup.**
The API and the web app are independent npm packages, tied together only by `docker-compose.yml`. I skipped monorepo tools because they add a layer that can break on someone else's machine, and these two never import each other.

**Express, with the logic kept out of the routes.**
Nine plain endpoints, no realtime and no background jobs, so Express is enough. Routes only read the request and pick a status code; the real work lives in separate service files.

**The same validation rules on both sides.**
Zod checks every request on the server, and the same rules run in the browser through react-hook-form. That is duplicated on purpose: the browser copy gives instant feedback, the server copy is what actually protects the database.

**Database enums, and a single table.**
The brief describes one thing — an inspection — so defect type, severity and status are Postgres enums instead of extra lookup tables. Severity is declared Critical, Major, Minor, so sorting by that column is already sorting by urgency.

**The inspection date is a plain date, not a timestamp.**
A supervisor records which day a defect was found, not the exact moment, and a timestamp would make an 11pm entry in India show up as the previous day elsewhere. The created and resolved times are still full timestamps, because there the moment does matter.

**nginx serves the app and forwards `/api` to the API.**
The browser uses one address for both, so there is no CORS setup and no API URL baked into the frontend build. The dev server forwards the same way, so local development and Docker behave identically.

---

## What I'd do differently with more time

- **Automated tests.** The biggest gap — verified by hand instead. Vitest plus Supertest against a throwaway Postgres would come first.
- **Offline support.** Needs an IndexedDB write queue *and* a service worker for the app shell; half of it would silently lose entries.
- **Per-user attribution.** No `created_by` or `resolved_by`, so the audit trail is weaker than the paper register it replaces.
- **Photo attachments.** The most useful missing field for a fabric defect; skipped because it pulls in object storage.
- **Editing an inspection.** Only create and resolve exist, so a typo in a machine ID cannot be corrected.
