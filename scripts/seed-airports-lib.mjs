import { PrismaClient } from "@prisma/client";
import fs from "node:fs";
import path from "node:path";
import tzLookup from "tz-lookup";

const prisma = new PrismaClient();

function uniqueBy(array, keyFn) {
  const seen = new Set();
  const out = [];
  for (const item of array) {
    const k = keyFn(item);
    if (!k || seen.has(k)) continue;
    seen.add(k);
    out.push(item);
  }
  return out;
}

async function tryLoadWorldAirports() {
  try {
    const mod = await import("world-airports");
    const arr = (mod && (mod.default || mod)) || [];
    if (!Array.isArray(arr)) return [];
    return arr.map((a) => ({
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

async function tryLoadAirportsData() {
  try {
    const mod = await import("airports-data");
    const data = (mod && (mod.default || mod)) || {};
    const rows = [];
    if (data.iata) {
      for (const [iata, rec] of Object.entries(data.iata)) {
        rows.push({
          iata: iata.toUpperCase(),
          icao: rec.icao || null,
          name: rec.name || rec.airport || null,
          city: rec.city || null,
          country: rec.country || null,
          lat: rec.lat || rec.latitude || null,
          lon: rec.lon || rec.longitude || null,
          tz: rec.tz || rec.timezone || null,
        });
      }
    } else {
      for (const rec of Object.values(data)) {
        if (!rec) continue;
        const iata = (rec.iata || "").toUpperCase();
        if (!iata) continue;
        rows.push({
          iata,
          icao: rec.icao || null,
          name: rec.name || rec.airport || null,
          city: rec.city || null,
          country: rec.country || null,
          lat: rec.lat || rec.latitude || null,
          lon: rec.lon || rec.longitude || null,
          tz: rec.tz || rec.timezone || null,
        });
      }
    }
    return rows;
  } catch {
    return [];
  }
}

async function loadFallbackCsv() {
  const p = path.join(process.cwd(), "data", "fallback-airports.csv");
  if (!fs.existsSync(p)) return [];
  const csv = fs.readFileSync(p, "utf8");
  const [header, ...lines] = csv.trim().split(/\r?\n/);
  const cols = header.split(",");
  const idx = (k) => cols.indexOf(k);
  const out = [];
  for (const line of lines) {
    const parts = line.split(",");
    out.push({
      iata: (parts[idx("iata")] || "").toUpperCase(),
      icao: parts[idx("icao")] || null,
      name: parts[idx("name")] || null,
      city: parts[idx("city")] || null,
      country: parts[idx("country")] || null,
      lat: parts[idx("lat")] ? parseFloat(parts[idx("lat")]) : null,
      lon: parts[idx("lon")] ? parseFloat(parts[idx("lon")]) : null,
      tz: parts[idx("timezone")] || null,
    });
  }
  return out;
}

function resolveTimezone(lat, lon, existingTz) {
  try {
    if (existingTz) return existingTz;
    if (typeof lat === "number" && typeof lon === "number") {
      return tzLookup(lat, lon);
    }
  } catch {}
  return null;
}

export async function runSeed(reset = false) {
  if (reset) {
    await prisma.airport.deleteMany({});
  }

  let rows = await tryLoadWorldAirports();
  if (!rows.length) rows = await tryLoadAirportsData();
  if (!rows.length) rows = await loadFallbackCsv();

  rows = rows.filter((r) => r.iata && r.iata.length === 3);
  for (const r of rows) {
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
          icao: r.icao,
          name: r.name,
          city: r.city,
          country: r.country,
          lat: r.lat,
          lon: r.lon,
          timezone: r.timezone,
        },
        update: {
          icao: r.icao,
          name: r.name,
          city: r.city,
          country: r.country,
          lat: r.lat,
          lon: r.lon,
          timezone: r.timezone,
        },
      })
    ));
  }

  const count = await prisma.airport.count();
  return count;
}
