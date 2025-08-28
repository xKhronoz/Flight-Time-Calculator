import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getBasicAuthUser } from "@/app/api/_util/auth";
import { createAirportSnapshot } from "@/app/api/_util/snapshot";
import { requireReason } from "@/app/api/_util/reason";

// GET /api/airports/:iata
export async function GET(_: NextRequest, { params }: { params: { iata: string } }) {
  const iata = (params.iata || "").toUpperCase();
  if (!iata || iata.length !== 3) {
    return NextResponse.json({ error: "Invalid IATA" }, { status: 400 });
  }
  const airport = await prisma.airport.findUnique({ where: { iata } });
  if (!airport) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(airport);
}

// PATCH /api/airports/:iata  (admin-only via middleware)
export async function PATCH(req: NextRequest, { params }: { params: { iata: string } }) {
  const iata = (params.iata || "").toUpperCase();
  if (!iata || iata.length !== 3) {
    return NextResponse.json({ error: "Invalid IATA" }, { status: 400 });
  }
  const payload = await req.json().catch(() => ({}));
  const reason = await requireReason(req);
  if (!reason) return NextResponse.json({ error: 'Reason is required' }, { status: 400 });
  const allowed: any = {};
  const fields = ["name", "city", "country", "timezone", "icao", "lat", "lon"];
  for (const k of fields) {
    if (k in payload && payload[k] !== undefined) allowed[k] = payload[k];
  }
  if (Object.keys(allowed).length === 0) {
    return NextResponse.json({ error: "No valid fields to update." }, { status: 400 });
  }

  // coerce numbers
  if (allowed.lat !== undefined) allowed.lat = typeof allowed.lat === "string" ? parseFloat(allowed.lat) : allowed.lat;
  if (allowed.lon !== undefined) allowed.lon = typeof allowed.lon === "string" ? parseFloat(allowed.lon) : allowed.lon;

  const before = await prisma.airport.findUnique({ where: { iata } });
  if (!before) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const updated = await prisma.airport.update({ where: { iata }, data: allowed });

  // write audit logs per field changed
  const changedBy = getBasicAuthUser(req.headers.get('authorization') || req.headers.get('Authorization'));
  const logs = [];
  for (const key of Object.keys(allowed)) {
    const oldVal = (before as any)[key];
    const newVal = (updated as any)[key];
    if (oldVal === newVal) continue;
    logs.push(prisma.auditLog.create({
      data: {
        iata,
        field: key,
        oldValue: oldVal === null || oldVal === undefined ? null : String(oldVal),
        newValue: newVal === null || newVal === undefined ? null : String(newVal),
        changedBy: changedBy,
        reason: reason,
      }
    }));
  }
  if (logs.length) await prisma.$transaction(logs);

  // snapshot AFTER the update for O(1) restore
  await createAirportSnapshot(iata, changedBy);

  return NextResponse.json(updated);
}
