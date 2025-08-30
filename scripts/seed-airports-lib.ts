import { PrismaClient, Airport } from "@prisma/client";
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

function isValidIanaTz(tz?: string | null): tz is string {
    if (!tz) return false;
    try {
        new Intl.DateTimeFormat("en-US", { timeZone: tz });
        return true;
    } catch {
        return false;
    }
}

function sanitizeIata(iata?: string | null): string | null {
    const v = (iata || "").toUpperCase().trim();
    return /^[A-Z0-9]{3}$/.test(v) ? v : null;
}
function sanitizeIcao(icao?: string | null): string | null {
    const v = (icao || "").toUpperCase().trim();
    if (!v) return null;
    return /^[A-Z0-9]{3,4}$/.test(v) ? v.slice(0, 4) : null;
}

export interface AirportRow {
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

function readAirportsJson(): AirportRow[] {
    const file = path.join(process.cwd(), "data", "airports.json");
    const raw = fs.readFileSync(file, "utf8");
    return JSON.parse(raw);
}

async function loadSource(): Promise<AirportRow[]> {
    const p = path.join(process.cwd(), "data", "airports.json");
    if (fs.existsSync(p)) return readAirportsJson();
    return tryLoadWorldAirports();
}

function resolveTimezone(lat: number | null, lon: number | null, existingTz?: string | null): string | null {
    const candidate = existingTz && isValidIanaTz(existingTz) ? existingTz : null;
    if (candidate) return candidate;
    if (typeof lat === "number" && typeof lon === "number") {
        try {
            const tz = tzLookup(lat, lon);
            return isValidIanaTz(tz) ? tz : null;
        } catch {
            return null;
        }
    }
    return null;
}

function same(a: Partial<Airport>, b: Partial<Airport>): boolean {
    return (
        (a.icao ?? null) === (b.icao ?? null) &&
        (a.name ?? null) === (b.name ?? null) &&
        (a.city ?? null) === (b.city ?? null) &&
        (a.country ?? null) === (b.country ?? null) &&
        (a.lat ?? null) === (b.lat ?? null) &&
        (a.lon ?? null) === (b.lon ?? null) &&
        (a.timezone ?? null) === (b.timezone ?? null)
    );
}

/**
 * Chunkable seeding used by the API route.
 * Returns { processed, total, nextOffset, done }.
 */
export async function seedChunk(offset: number, limit: number, { replace = false } = {}) {
    let rows = await loadSource();

    rows = rows
        .map((r) => {
            const iata = sanitizeIata(r.iata);
            if (!iata) return null;
            const icao = sanitizeIcao(r.icao);
            const lat = typeof r.lat === "number" ? r.lat : null;
            const lon = typeof r.lon === "number" ? r.lon : null;
            const timezone = resolveTimezone(lat, lon, r.tz ?? r.timezone);
            return timezone
                ? {
                    iata,
                    icao,
                    name: r.name?.trim() || null,
                    city: r.city?.trim() || null,
                    country: r.country?.trim() || null,
                    lat,
                    lon,
                    timezone,
                }
                : null;
        })
        .filter(Boolean) as any[];

    rows = uniqueBy(rows, (r) => r.iata);

    const total = rows.length;
    const slice = rows.slice(offset, offset + limit);

    if (replace && offset === 0) {
        await prisma.auditLog.deleteMany();
        await prisma.snapshot.deleteMany();
        await prisma.airport.deleteMany();
    }

    // First pass: createMany for speed
    await prisma.airport.createMany({
        data: slice.map((r) => ({
            iata: r.iata,
            icao: r.icao ?? null,
            name: r.name ?? r.iata,
            city: r.city ?? null,
            country: r.country ?? null,
            lat: r.lat ?? null,
            lon: r.lon ?? null,
            timezone: r.timezone ?? "",
        })),
        skipDuplicates: true,
    });

    // Change-aware updates (only when values differ)
    const existing = await prisma.airport.findMany({
        where: { iata: { in: slice.map((r) => r.iata) } },
        select: { iata: true, icao: true, name: true, city: true, country: true, lat: true, lon: true, timezone: true },
    });
    const byIata = new Map(existing.map((e) => [e.iata, e]));

    for (const r of slice) {
        const curr = byIata.get(r.iata);
        if (!curr) continue;
        const next: Partial<Airport> = {
            icao: r.icao ?? null,
            name: r.name ?? r.iata,
            city: r.city ?? null,
            country: r.country ?? null,
            lat: r.lat ?? null,
            lon: r.lon ?? null,
            timezone: r.timezone ?? undefined,
        };
        if (!same(curr, next)) {
            await prisma.airport.update({
                where: { iata: r.iata },
                data: next,
            });
        }
    }

    const nextOffset = Math.min(offset + slice.length, total);
    const done = nextOffset >= total;
    return { processed: slice.length, total, nextOffset, done };
}

/** Script-style full seed (optional; not used by the API chunker) */
export async function runSeed({ reset = false, chunkSize = 500 }: { reset?: boolean; chunkSize?: number } = {}) {
    try {
        let offset = 0;
        let total = 0;
        let done = false;
        if (reset) {
            await prisma.auditLog.deleteMany();
            await prisma.snapshot.deleteMany();
            await prisma.airport.deleteMany();
        }
        while (!done) {
            const r = await seedChunk(offset, chunkSize, { replace: false });
            offset = r.nextOffset;
            total = r.total;
            done = r.done;
        }
        return prisma.airport.count();
    } finally {
        await prisma.$disconnect();
    }
}
