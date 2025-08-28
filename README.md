
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
