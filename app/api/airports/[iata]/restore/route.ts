import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { getBasicAuthUser } from "@/app/api/_util/auth";
import { createAirportSnapshot } from "@/app/api/_util/snapshot";
import { requireReason } from "@/app/api/_util/reason";

// The only fields allowed to be restored from a snapshot
const editableKeys = ["name", "city", "country", "timezone", "icao", "lat", "lon"] as const;
type EditableKey = typeof editableKeys[number];

// POST /api/airports/:iata/restore?id=SNAPSHOT_ID
export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ iata: string }> } // <- params is a Promise
) {
  const { iata: rawIata } = await ctx.params;     // <- await it
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
    return NextResponse.json({ error: "Provide ?id=<snapshotId>" }, { status: 400 });
  }

  const snap = await prisma.snapshot.findUnique({ where: { id } });
  if (!snap || snap.iata.toUpperCase() !== iata) {
    return NextResponse.json({ error: "Snapshot not found for that IATA" }, { status: 404 });
  }

  // Snapshot data is JSON; pick only editable fields
  const snapData = snap.data as Record<string, unknown>;
  const patch: Prisma.AirportUpdateInput = Object.fromEntries(
    editableKeys
      .filter((k) => k in snapData)
      .map((k) => [k, snapData[k]])
  );

  const before = await prisma.airport.findUnique({ where: { iata } });
  const updated = await prisma.airport.update({ where: { iata }, data: patch });

  const authHeader = req.headers.get("authorization") || req.headers.get("Authorization");
  const changedBy =
    getBasicAuthUser(authHeader ?? undefined) || undefined;

  // Write audit entries per changed field
  const tx = editableKeys.flatMap((key) => {
    const oldVal = (before as any)?.[key];
    const newVal = (updated as any)?.[key];
    if (oldVal === newVal) return [];
    return [
      prisma.auditLog.create({
        data: {
          iata,
          field: key,
          oldValue: oldVal == null ? null : String(oldVal),
          newValue: newVal == null ? null : String(newVal),
          changedBy: changedBy ? `${changedBy} (restore-snapshot)` : "(restore-snapshot)",
          reason,
        },
      }),
    ];
  });

  if (tx.length) await prisma.$transaction(tx);

  // Snapshot AFTER restore
  await createAirportSnapshot(iata, changedBy ? `${changedBy} (restore-snapshot)` : "(restore-snapshot)");

  return NextResponse.json({ ok: true, updated, snapshotId: snap.id });
}
