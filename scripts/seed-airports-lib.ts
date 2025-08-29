import { PrismaClient } from "@prisma/client";
import fs from "node:fs";
import path from "node:path";
import tzLookup from "tz-lookup";

const prisma = new PrismaClient();

function uniqueBy<T>(array: T[], keyFn: (item: T) => string | null | undefined): T[] {
    const seen = new Set<string>();
    const out: T[] = [];
    for (const item of array) {
        const k = keyFn(item);
        if (!k || seen.has(k)) continue;
        seen.add(k);
        out.push(item);
    }
    return out;
}

interface AirportRow {
    iata: string;
    icao: string | null;
    name: string | null;
    city: string | null;
    country: string | null;
    lat: number | null;
    lon: number | null;
    tz?: string | null;
    timezone?: string | null;
}

async function tryLoadWorldAirports(): Promise<AirportRow[]> {
    try {
        const mod = await import("world-airports");
        const arr = (mod && (mod.default || mod)) || [];
        if (!Array.isArray(arr)) return [];
        return arr.map((a: any) => ({
            iata: (a.iata || "").toUpperCase(),
            icao: a.icao || null,
            name: a.name || null,
            city: a.city || null,
            country: a.country || null,
            lat: typeof a.lat === "number" ? a.lat : (a.lat && parseFloat(a.lat)) || null,
            lon: typeof a.lon === "number" ? a.lon : (a.lon && parseFloat(a.lon)) || null,
            tz: a.tz || a.timezone || null,
        }));
    } catch {
        return [];
    }
}

export async function seedAirportsFromJson(): Promise<AirportRow[]> {
    const file = path.join(process.cwd(), "data", "airports.json");
    const raw = fs.readFileSync(file, "utf8");
    const rows: AirportRow[] = JSON.parse(raw);

    for (const a of rows) {
        // Ensure iata is exactly 3 chars and icao is at most 4 chars
        const iata = (a.iata || "").toUpperCase().slice(0, 3);
        const icao = a.icao ? a.icao.toUpperCase().slice(0, 4) : "";
        await prisma.airport.upsert({
            where: { iata },
            update: {
                icao,
                name: a.name ?? "",
                city: a.city ?? "",
                country: a.country ?? "",
                lat: a.lat ?? null,
                lon: a.lon ?? null,
                timezone: a.timezone ?? "",
            },
            create: {
                iata,
                icao,
                name: a.name ?? "",
                city: a.city ?? "",
                country: a.country ?? "",
                lat: a.lat ?? null,
                lon: a.lon ?? null,
                timezone: a.timezone ?? "",
            },
        });
    }
    return rows;
}

function resolveTimezone(lat: number | null, lon: number | null, existingTz?: string | null): string | null {
    try {
        if (existingTz) return existingTz;
        if (typeof lat === "number" && typeof lon === "number") {
            return tzLookup(lat, lon);
        }
    } catch { }
    return null;
}

export async function runSeed(reset = false): Promise<number> {
    if (reset) {
        await prisma.airport.deleteMany({});
    }

    let rows: AirportRow[] = await tryLoadWorldAirports();
    if (!rows.length) rows = await seedAirportsFromJson();

    // Ensure iata is exactly 3 chars and icao is at most 4 chars
    rows = rows.filter((r) => r.iata && r.iata.length === 3);
    for (const r of rows) {
        r.iata = r.iata.toUpperCase().slice(0, 3);
        r.icao = r.icao ? r.icao.toUpperCase().slice(0, 4) : "";
        r.timezone = resolveTimezone(r.lat, r.lon, r.tz);
    }
    rows = rows.filter((r) => r.timezone);
    rows = uniqueBy(rows, (r) => r.iata);

    const chunkSize = 500;
    for (let i = 0; i < rows.length; i += chunkSize) {
        const chunk = rows.slice(i, i + chunkSize);
        await prisma.$transaction(chunk.map((r) =>
            prisma.airport.upsert({
                where: { iata: r.iata },
                create: {
                    iata: r.iata,
                    icao: r.icao ?? "",
                    name: r.name ?? "",
                    city: r.city ?? "",
                    country: r.country ?? "",
                    lat: r.lat,
                    lon: r.lon,
                    timezone: r.timezone ?? "",
                },
                update: {
                    icao: r.icao ?? "",
                    name: r.name ?? "",
                    city: r.city ?? "",
                    country: r.country ?? "",
                    lat: r.lat,
                    lon: r.lon,
                    timezone: r.timezone ?? "",
                },
            })
        ));
    }

    const count = await prisma.airport.count();
    return count;
}
