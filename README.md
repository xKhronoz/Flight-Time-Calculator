# ✈️ Flight Time Calculator

A Next.js + Prisma web app for calculating flight times between airports.  
Includes timezone/DST awareness, airport database with reseed, admin UI, audit logs, and snapshots.

---

## 🚀 Features

- Calculate flight times and transit times across airports
- Full IANA timezone support (DST aware)
- Persisted airport DB (Prisma + Postgres)
- Admin UI (Basic Auth gated)
- Audit log with reason/comments, snapshots, rollback, diff view
- `/api/reseed` endpoint to import airports from `data/airports.json`
- `/api/health` endpoint for uptime checks
- Ready for deployment to **Vercel** (with Postgres)

---

## 🛠️ Local Development

### Prerequisites

- Node.js 18+ (Node 20 recommended)
- Postgres 14+ (local or via Docker)
- Docker Desktop (if using Docker setup)

---

### Option A: Run locally without Docker

1. **Create a local Postgres DB or Start a docker Postgres container**

   Local Postgres:

   ```bash
   createdb flight_time_local
   # or
   psql -c "CREATE DATABASE flight_time_local;"
   ```

   Or with Docker:

   ```bash
   docker compose --profile db up -d
   ```

2. **Create `.env`**

   ```ini
   DATABASE_URL=postgres://postgres:postgres@localhost:5432/flight_time_local?sslmode=disable
   DIRECT_URL=postgres://postgres:postgres@localhost:5432/flight_time_local?sslmode=disable
   ADMIN_USER=admin
   ADMIN_PASS=change-me
   ```

3. **Install deps & generate Prisma client**

   ```bash
   npm install
   npx prisma generate
   ```

4. **Build the airports JSON (one-time)**

   ```bash
   npm run build:airports
   ```

5. **Apply migrations**

   ```bash
   npx prisma migrate dev --name init_local
   ```

6. **Run the app**

   ```bash
   npm run dev
   # http://localhost:3000
   ```

7. **Seed airports**

   ```bash
   curl -X POST -u admin:change-me http://localhost:3000/api/reseed
   ```

---

### Option B: Run with Docker

1. **Start services**

   ```bash
   docker compose up --build
   # App → http://localhost:3000
   # DB  → localhost:5432
   ```

2. **Migrations**
   The container runs `npx prisma migrate deploy` on startup.
   Run manually if needed:

   ```bash
   docker compose exec web npx prisma migrate deploy
   ```

3. **Build airports JSON**

   ```bash
   npm install
   npm run build:airports
   curl -X POST -u admin:change-me http://localhost:3000/api/reseed
   ```

---

## 🔧 Common Tasks

### Health check

```bash
curl http://localhost:3000/api/health
# → { "ok": true, "db": "up" }
```

### Prisma Studio (inspect DB)

```bash
npx prisma studio
# or inside Docker:
docker compose exec web npx prisma studio
```

### Reset DB

```bash
npx prisma migrate reset
```

### Admin UI

- Navigate to: `http://localhost:3000/admin/airports/SEA`
- Login with Basic Auth: `ADMIN_USER` / `ADMIN_PASS`

### Docker Commands

```bash
# dev stack
docker compose --profile dev up --build

# prod-like stack
docker compose --profile prod up --build

# database only
docker compose --profile db up -d
```

---

## 🌍 Building `airports.json` (one-time)

```bash
# Ensure dependencies:
npm i csv-parse tz-lookup
# Run:
npm run build:airports
# Or override source:
OURAIRPORTS_CSV=https://ourairports.com/data/airports.csv npm run build:airports
```

- Keeps only airports with an IATA code
- Ensures valid IANA timezones (CSV tz if present, else tz-lookup by lat/lon)
- Outputs `data/airports.json` for `/api/reseed`

---

## ☁️ Deploying to Vercel

- Provision **Vercel Postgres** (one for Production, one for Preview/Staging).
- Set env vars in **Project → Settings → Environment Variables**:

```bash
DATABASE_URL=...
DIRECT_URL=...
ADMIN_USER=admin
ADMIN_PASS=change-me
```

- `vercel.json` build command:

  ```json
  "buildCommand": "sh -c 'prisma generate && if [ \"$VERCEL_ENV\" = \"production\" ]; then prisma migrate deploy; fi; next build'"
  ```

- First deploy → run migrations:

  ```bash
  npx prisma migrate deploy
  ```

- Seed airports:

  ```bash
  curl -X POST -u admin:change-me https://<your-app>.vercel.app/api/reseed
  ```

### Chunked reseed on Vercel

- Use **/admin/ops** to run a chunked reseed (client will call `/api/reseed` repeatedly).
- Endpoint: `POST /api/reseed?offset=<n>&limit=<n>&mode=upsert|replace`
- Defaults: `limit=500`, `mode=upsert`. Increase/decrease `limit` if needed.
- If your middleware requires Basic Auth for APIs, toggle “Send Basic Auth header” and enter `ADMIN_USER`/`ADMIN_PASS`.

---

## ✅ Troubleshooting

- **ECONNREFUSED 5432** → DB not up or wrong URL.
  Check with:

  ```bash
  psql "postgres://postgres:postgres@localhost:5432/flight_time_local" -c '\\dt'
  ```

- **401 Unauthorized on admin endpoints** → Use Basic Auth with `ADMIN_USER`/`ADMIN_PASS`.

- **Airports missing** → Rebuild and reseed:

  ```bash
  npm run build:airports
  curl -X POST -u admin:change-me http://localhost:3000/api/reseed
  ```

---

## Docker & Compose

Build and run locally with Postgres:

```bash
docker compose up --build
# App at http://localhost:3000
```

## GitHub Actions (Vercel deploy + Prisma migrate)

A workflow is provided at `.github/workflows/vercel-deploy.yml` that:

1. Runs `prisma migrate deploy` against your production DB
2. Builds and deploys to Vercel using the CLI

Set these repo **secrets** (Settings → Secrets and variables → Actions):

- `VERCEL_TOKEN` – Vercel token from your account
- `VERCEL_ORG_ID` – Vercel org ID
- `VERCEL_PROJECT_ID` – Vercel project ID
- `PRODUCTION_DATABASE_URL` – pooled DB URL for Prisma Client
- `PRODUCTION_DIRECT_URL` – direct DB URL for Prisma Migrate

> Tip: You can find org/project IDs via `vercel link` or the Vercel dashboard.

## Staging Workflow

- `.github/workflows/vercel-deploy-staging.yml` deploys to **Vercel Preview** from the `develop` branch.
- Expects these secrets:
  - `STAGING_DATABASE_URL` (pooled URL)
  - `STAGING_DIRECT_URL` (direct URL)

## Health Check Endpoint

- `GET /api/health` returns `{ status: "ok", uptime: <seconds>, timestamp: <ISO> }`
- Useful for uptime monitoring or Vercel/Load Balancer health probes.

## Health endpoint

- `GET /api/health` → `{ ok: true, db: "up|down" }`

## Staging / Preview workflow

A workflow is provided at `.github/workflows/vercel-deploy-staging.yml` which:

1. Runs `prisma migrate deploy` against **staging** DB
2. Builds and deploys a **Preview** to Vercel

Set these **staging secrets** in GitHub:

- `STAGING_DATABASE_URL` – pooled URL for Prisma Client
- `STAGING_DIRECT_URL` – direct URL for Prisma Migrate

It also uses your existing `VERCEL_TOKEN`, `VERCEL_ORG_ID`, and `VERCEL_PROJECT_ID`.

## Manual approval before production

This repo is configured to use **GitHub Environments** for production gating:

1. In **GitHub → Settings → Environments**, create an environment named **`production`**.
2. Add **Required reviewers** (e.g., your SREs or leads).
3. The following workflows will PAUSE until a reviewer approves:
   - `.github/workflows/vercel-deploy.yml` (prod deploy on pushes to `main`/`master`)
   - `.github/workflows/promote-to-production.yml` (manual promotion)
4. To promote manually, run the **Promote to Production (Manual)** workflow and pick the `ref` you want to deploy.

> Tip: Keep your staging/preview workflow free of gates so you can iterate quickly, then promote with a single approval step.

## Promotion gating with required checks

- The **staging workflow** sets a commit status `preview-deploy=success` and comments on PRs with the preview URL.
- The **promotion workflow** requires that status before proceeding.
- To promote:
  1. Open **Actions → Promote to Production (Manual)**
  2. Enter the `ref` (branch/tag/SHA). The job will fail if there isn't a successful `preview-deploy` for that commit.

> Note: The staging workflow posts a PR comment with the preview URL and promotion instructions.

## 📜 License

MIT (app code).
Airport data from [OurAirports](https://ourairports.com/data/) (Public Domain / CC0).
