#!/bin/sh
set -e

# Ensure SQLite dir exists
mkdir -p /app/prisma

# Apply schema to SQLite and seed if empty
echo "Prisma db push..."
npx prisma db push

# Seed only if Airport table is empty
COUNT=$(node -e "import('./scripts/count-airports.mjs').then(m=>m.default()).then(c=>console.log(c))")
if [ "$COUNT" = "0" ]; then
  echo "Seeding airports..."
  npm run seed || true
else
  echo "Airports already present: $COUNT"
fi

echo "Starting Next.js..."
npm run start
