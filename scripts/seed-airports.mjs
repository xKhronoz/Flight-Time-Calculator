import { runSeed } from "./seed-airports-lib.mjs";

async function main() {
  console.log("Seeding airports (standalone)...");
  const count = await runSeed(false);
  console.log(`Done. Airports in DB: ${count}`);
}

main().catch((e) => { console.error(e); process.exit(1); });
