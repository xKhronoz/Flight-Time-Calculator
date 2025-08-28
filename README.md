
## Deploying to Vercel

### 1) Provision database
- Use **Vercel Postgres** (recommended) or compatible Postgres.
- Grab both URLs:
  - `DATABASE_URL` (pooled)
  - `DIRECT_URL` (non-pooled)

### 2) Set environment variables (Vercel → Project → Settings → Environment Variables)
```
DATABASE_URL=...
DIRECT_URL=...
ADMIN_USER=admin
ADMIN_PASS=change-me
```

### 3) Build settings
- **Build Command**: `prisma generate && next build`
- (Optional) If you want to run migrations during build:
  `prisma generate && prisma migrate deploy && next build`
- **Output Directory**: `.next`

### 4) First deploy, then run migrations
From your machine or CI (pointing to the production DB):
```bash
npx prisma migrate deploy
```

### 5) Seed the airports
Call the admin-only endpoint with Basic Auth once:
```
POST /api/reseed
```

### 6) Regions (optional)
`vercel.json` pins functions to `sin1`. Adjust or remove as needed.

## Docker & Compose
Build and run locally with Postgres:
```bash
docker compose up --build
# App at http://localhost:3000
```

## GitHub Actions (Vercel deploy + Prisma migrate)
A workflow is provided at `.github/workflows/vercel-deploy.yml` that:
1) Runs `prisma migrate deploy` against your production DB
2) Builds and deploys to Vercel using the CLI

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
1) Runs `prisma migrate deploy` against **staging** DB
2) Builds and deploys a **Preview** to Vercel

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
  1) Open **Actions → Promote to Production (Manual)**
  2) Enter the `ref` (branch/tag/SHA). The job will fail if there isn't a successful `preview-deploy` for that commit.

> Note: The staging workflow posts a PR comment with the preview URL and promotion instructions.
