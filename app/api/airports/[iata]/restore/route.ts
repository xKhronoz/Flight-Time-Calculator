import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getBasicAuthUser } from "@/app/api/_util/auth";
import { createAirportSnapshot } from "@/app/api/_util/snapshot";
import { requireReason } from "@/app/api/_util/reason";

// POST /api/airports/:iata/restore?id=SNAPSHOT_ID
export async function POST(req: NextRequest, { params }: { params: { iata: string } }) {
  const iata = (params.iata || "").toUpperCase();
  if (!iata || iata.length !== 3) return NextResponse.json({ error: "Invalid IATA" }, { status: 400 });
  const reason = await requireReason(req);
  if (!reason) return NextResponse.json({ error: 'Reason is required' }, { status: 400 });
  const url = new URL(req.url);
  const idStr = url.searchParams.get("id");
  const id = idStr ? parseInt(idStr, 10) : NaN;
  if (!Number.isFinite(id)) return NextResponse.json({ error: "Provide ?id=<snapshotId>" }, { status: 400 });

  const snap = await prisma.snapshot.findUnique({ where: { id } });
  if (!snap || snap.iata !== iata) return NextResponse.json({ error: "Snapshot not found for that IATA" }, { status: 404 });

  const data = snap.data as any;
  // Only allow editable fields to be restored
  const patch: any = {};
  for (const k of ["name", "city", "country", "timezone", "icao", "lat", "lon"]) {
    if (k in data) patch[k] = data[k];
  }

  const before = await prisma.airport.findUnique({ where: { iata } });
  const updated = await prisma.airport.update({ where: { iata }, data: patch });

  const changedBy = getBasicAuthUser(req.headers.get('authorization') || req.headers.get('Authorization'));
  // Write audit entries for each field
  const tx = [];
  for (const key of Object.keys(patch)) {
    const oldVal = (before as any)?.[key];
    const newVal = (updated as any)?.[key];
    if (oldVal === newVal) continue;
    tx.push(prisma.auditLog.create({
      data: {
        iata,
        field: key,
        oldValue: oldVal == null ? null : String(oldVal),
        newValue: newVal == null ? null : String(newVal),
        changedBy: changedBy ? `${changedBy} (restore-snapshot)` : "(restore-snapshot)",
        reason: reason
      }
    }));
  }
  if (tx.length) await prisma.$transaction(tx);

  // Snapshot AFTER restore
  await createAirportSnapshot(iata, changedBy ? `${changedBy} (restore-snapshot)` : "(restore-snapshot)");

  return NextResponse.json({ ok: true, updated, snapshotId: snap.id });
}
