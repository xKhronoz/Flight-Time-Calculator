import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getBasicAuthUser } from "@/app/api/_util/auth";
import { createAirportSnapshot } from "@/app/api/_util/snapshot";
import { requireReason } from "@/app/api/_util/reason";

// POST /api/airports/:iata/rollback?id=LOG_ID  (admin-only via middleware)
export async function POST(req: NextRequest, { params }: { params: { iata: string } }) {
  const iata = (params.iata || "").toUpperCase();
  if (!iata || iata.length !== 3) return NextResponse.json({ error: "Invalid IATA" }, { status: 400 });
  const reason = await requireReason(req);
  if (!reason) return NextResponse.json({ error: 'Reason is required' }, { status: 400 });
  const url = new URL(req.url);
  const idStr = url.searchParams.get("id");
  const id = idStr ? parseInt(idStr, 10) : NaN;
  if (!Number.isFinite(id)) return NextResponse.json({ error: "Provide ?id=<auditLogId>" }, { status: 400 });

  const log = await prisma.auditLog.findUnique({ where: { id } });
  if (!log || log.iata !== iata) return NextResponse.json({ error: "Log not found for that IATA" }, { status: 404 });

  // Apply rollback: set field to oldValue
  const field = log.field as keyof any;
  const data: any = {};
  if (field === 'lat' || field === 'lon') {
    data[field] = log.oldValue === null || log.oldValue === undefined ? null : parseFloat(String(log.oldValue));
  } else {
    data[field] = log.oldValue;
  }

  const before = await prisma.airport.findUnique({ where: { iata } });
  const updated = await prisma.airport.update({ where: { iata }, data });

  // Write an audit entry for the rollback
  const changedBy = getBasicAuthUser(req.headers.get('authorization') || req.headers.get('Authorization'));
  await prisma.auditLog.create({
    data: {
      iata,
      field: String(field),
      oldValue: before ? (before as any)[field] === null || (before as any)[field] === undefined ? null : String((before as any)[field]) : null,
      newValue: data[field] === null || data[field] === undefined ? null : String(data[field]),
      changedBy: changedBy ? `${changedBy} (rollback)` : "(rollback)",
      reason: reason
    }
  });

  // Snapshot AFTER rollback
  await createAirportSnapshot(iata, changedBy ? `${changedBy} (rollback)` : "(rollback)");

  return NextResponse.json({ ok: true, updated });
}
