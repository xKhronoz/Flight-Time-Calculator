import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getBasicAuthUser } from "@/app/api/_util/auth";
import { createAirportSnapshot } from "@/app/api/_util/snapshot";
import { requireReason } from "@/app/api/_util/reason";
import type { Prisma } from "@prisma/client";

// GET /api/airports/:iata
export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ iata: string }> } // params is a Promise
) {
  try {
    const { iata: rawIata } = await ctx.params;
    const iata = (rawIata || "").toUpperCase();
    if (iata.length !== 3) {
      return NextResponse.json({ error: "Invalid IATA" }, { status: 400 });
    }
    const airport = await prisma.airport.findUnique({ where: { iata } });
    if (!airport) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(airport);
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch airport", details: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
}

// PATCH /api/airports/:iata  (admin-only via middleware)
export async function PATCH(
  req: NextRequest,
  ctx: { params: Promise<{ iata: string }> } // params is a Promise
) {
  try {
    const { iata: rawIata } = await ctx.params;
    const iata = (rawIata || "").toUpperCase();
    if (iata.length !== 3) {
      return NextResponse.json({ error: "Invalid IATA" }, { status: 400 });
    }
    const payload = (await req.json().catch(() => ({}))) as Record<string, unknown>;
    const reason = await requireReason(req);
    if (!reason) return NextResponse.json({ error: "Reason is required" }, { status: 400 });
    const fields = ["name", "city", "country", "timezone", "icao", "lat", "lon"] as const;
    type EditableKey = typeof fields[number];
    // Pick only allowed fields
    const picked: Partial<Record<EditableKey, unknown>> = {};
    for (const k of fields) {
      if (k in payload && (payload as any)[k] !== undefined) picked[k] = (payload as any)[k];
    }
    if (Object.keys(picked).length === 0) {
      return NextResponse.json({ error: "No valid fields to update." }, { status: 400 });
    }
    // Coerce numbers for lat/lon
    if (picked.lat !== undefined && typeof picked.lat === "string") {
      const n = parseFloat(picked.lat);
      picked.lat = Number.isFinite(n) ? n : null;
    }
    if (picked.lon !== undefined && typeof picked.lon === "string") {
      const n = parseFloat(picked.lon);
      picked.lon = Number.isFinite(n) ? n : null;
    }
    const before = await prisma.airport.findUnique({ where: { iata } });
    if (!before) return NextResponse.json({ error: "Not found" }, { status: 404 });
    // Type as Prisma update input
    const updateData: Prisma.AirportUpdateInput = picked as Prisma.AirportUpdateInput;
    const updated = await prisma.airport.update({ where: { iata }, data: updateData });
    // Audit logs per changed field
    const authHeader = req.headers.get("authorization") || req.headers.get("Authorization") || undefined;
    const changedBy = getBasicAuthUser(authHeader) || "(api)";
    const logs = Object.keys(picked).flatMap((key) => {
      const k = key as EditableKey;
      const oldVal = (before as any)[k];
      const newVal = (updated as any)[k];
      if (oldVal === newVal) return [];
      return [
        prisma.auditLog.create({
          data: {
            iata,
            field: k,
            oldValue: oldVal == null ? null : String(oldVal),
            newValue: newVal == null ? null : String(newVal),
            changedBy,
            reason,
          },
        }),
      ];
    });
    if (logs.length) await prisma.$transaction(logs);
    // Snapshot AFTER the update for O(1) restore
    await createAirportSnapshot(iata, changedBy);
    return NextResponse.json(updated);
  } catch (error) {
    return NextResponse.json({ error: "Failed to update airport", details: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
}
