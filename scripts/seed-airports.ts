import { runSeed } from "./seed-airports-lib";

async function main(): Promise<void> {
    console.log("Seeding airports (standalone)...");
    const count = await runSeed({ reset: false });
    console.log(`Done. Airports in DB: ${count}`);
}

main().catch((e) => { console.error(e); process.exit(1); });
