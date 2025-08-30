import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getBasicAuthUser } from "@/app/api/_util/auth";
import { createAirportSnapshot } from "@/app/api/_util/snapshot";
import { requireReason } from "@/app/api/_util/reason";
import type { Prisma } from "@prisma/client";

// POST /api/airports/:iata/rollback?id=LOG_ID  (admin-only via middleware)
export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ iata: string }> } // <-- params is a Promise
) {
  try {
    const { iata: rawIata } = await ctx.params; // <-- await it
    const iata = (rawIata || "").toUpperCase();
    if (iata.length !== 3) {
      return NextResponse.json({ error: "Invalid IATA" }, { status: 400 });
    }

    const reason = await requireReason(req);
    if (!reason) {
      return NextResponse.json({ error: "Reason is required" }, { status: 400 });
    }

    const url = new URL(req.url);
    const idStr = url.searchParams.get("id");
    const id = idStr ? parseInt(idStr, 10) : NaN;
    if (!Number.isFinite(id)) {
      return NextResponse.json({ error: "Provide ?id=<auditLogId>" }, { status: 400 });
    }

    const log = await prisma.auditLog.findUnique({ where: { id } });
    if (!log || log.iata.toUpperCase() !== iata) {
      return NextResponse.json({ error: "Log not found for that IATA" }, { status: 404 });
    }

    // Build a typed update payload for just the one field we’re rolling back
    type AirportScalarKey = "name" | "city" | "country" | "timezone" | "icao" | "lat" | "lon";
    const field = log.field as AirportScalarKey;

    const updateData: Prisma.AirportUpdateInput =
      field === "lat" || field === "lon"
        ? {
            [field]:
              log.oldValue === null || log.oldValue === undefined
                ? null
                : parseFloat(String(log.oldValue)),
          }
        : {
            [field]: log.oldValue as any, // other columns are strings or null
          };

    const before = await prisma.airport.findUnique({ where: { iata } });
    const updated = await prisma.airport.update({ where: { iata }, data: updateData });

    const authHeader = req.headers.get("authorization") || req.headers.get("Authorization") || undefined;
    const changedBy = getBasicAuthUser(authHeader);

    await prisma.auditLog.create({
      data: {
        iata,
        field,
        oldValue:
          before && (before as any)[field] != null ? String((before as any)[field]) : null,
        newValue:
          (updated as any)[field] != null ? String((updated as any)[field]) : null,
        changedBy: changedBy ? `${changedBy} (rollback)` : "(rollback)",
        reason,
      },
    });

    // Snapshot AFTER rollback
    await createAirportSnapshot(iata, changedBy ? `${changedBy} (rollback)` : "(rollback)");

    return NextResponse.json({ ok: true, updated });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to rollback airport field", details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
