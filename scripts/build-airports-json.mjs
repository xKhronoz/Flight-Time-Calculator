import fs from 'node:fs';
import path from 'node:path';
import { parse } from 'csv-parse/sync';
import tzlookup from 'tz-lookup';

const OURAIRPORTS_CSV = process.env.OURAIRPORTS_CSV || 'https://davidmegginson.github.io/ourairports-data/airports.csv';
const OUTPUT = path.join(process.cwd(), 'data', 'airports.json');

function isValidNumber(x) { const n = Number(x); return Number.isFinite(n); }
function isValidIata(x) { return typeof x === 'string' && /^[A-Z0-9]{3}$/.test(x.toUpperCase()); }
function isValidTz(tz) { try { new Intl.DateTimeFormat('en-US', { timeZone: tz }); return true; } catch { return false; } }

async function main() {
  console.log('Downloading:', OURAIRPORTS_CSV);
  const res = await fetch(OURAIRPORTS_CSV);
  if (!res.ok) throw new Error(`Failed to fetch CSV: ${res.status} ${res.statusText}`);
  const csvText = await res.text();
  console.log('Parsing CSV...');
  const rows = parse(csvText, { columns: true, skip_empty_lines: true });

  const byIata = {};
  for (const r of rows) {
    const iata = (r.iata_code || '').trim().toUpperCase();
    if (!isValidIata(iata)) continue;

    const lat = Number(r.latitude_deg);
    const lon = Number(r.longitude_deg);
    if (!isValidNumber(lat) || !isValidNumber(lon)) continue;

    let tz = (r.tz || r.timezone || '').trim();
    if (!tz || !isValidTz(tz)) {
      try { tz = tzlookup(lat, lon); } catch { tz = ''; }
    }
    if (!isValidTz(tz)) continue;

    const icao = (r.ident || '').trim().toUpperCase();
    const rec = {
      iata,
      icao: icao || null,
      name: r.name?.trim() || iata,
      city: (r.municipality || '').trim() || null,
      country: (r.iso_country || '').trim() || null,
      lat,
      lon,
      timezone: tz
    };

    const sizeRank = (type) => ({ large_airport: 3, medium_airport: 2, small_airport: 1 }[type] || 0);
    const existing = byIata[iata];
    if (!existing || sizeRank(r.type) > sizeRank(existing.__type)) {
      rec.__type = r.type;
      byIata[iata] = rec;
    }
  }

  const out = Object.values(byIata).map(x => { const { __type, ...rest } = x; return rest; })
    .sort((a, b) => a.iata.localeCompare(b.iata));

  fs.mkdirSync(path.dirname(OUTPUT), { recursive: true });
  fs.writeFileSync(OUTPUT, JSON.stringify(out, null, 2), 'utf8');
  console.log(`Wrote ${out.length} airports → ${OUTPUT}`);
}

main().catch(e => { console.error(e); process.exit(1); });
