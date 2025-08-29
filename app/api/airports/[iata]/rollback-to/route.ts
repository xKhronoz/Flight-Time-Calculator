import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getBasicAuthUser } from "@/app/api/_util/auth";
import { createAirportSnapshot } from "@/app/api/_util/snapshot";
import { requireReason } from "@/app/api/_util/reason";

function parseAt(s?: string | null): Date | null {
  if (!s) return null;
  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d;
}

export async function POST(req: NextRequest, { params }: { params: { iata: string } }) {
  const iata = (params.iata || "").toUpperCase();
  if (!iata || iata.length !== 3) return NextResponse.json({ error: "Invalid IATA" }, { status: 400 });

  const reason = await requireReason(req);
  if (!reason) return NextResponse.json({ error: 'Reason is required' }, { status: 400 });
  const url = new URL(req.url);
  const at = parseAt(url.searchParams.get("at"));
  if (!at) return NextResponse.json({ error: "Provide a valid ?at=ISO-8601 timestamp" }, { status: 400 });

  const airport = await prisma.airport.findUnique({ where: { iata } });
  if (!airport) return NextResponse.json({ error: "Airport not found" }, { status: 404 });

  const logs = await prisma.auditLog.findMany({
    where: { iata, changedAt: { gt: at } },
    orderBy: { changedAt: "desc" },
    take: 10000,
  });

  if (!logs.length) {
    return NextResponse.json({ ok: true, message: "No changes after the specified time; nothing to roll back.", airport });
  }

  const patch: any = {};
  for (const log of logs) {
    const field = log.field as keyof typeof airport;
    if (patch[field] !== undefined) continue;
    if (field === 'lat' || field === 'lon') {
      patch[field] = log.oldValue == null ? null : parseFloat(String(log.oldValue));
    } else {
      patch[field] = log.oldValue;
    }
  }

  const before = airport;
  const updated = await prisma.airport.update({ where: { iata }, data: patch });

  const changedBy = getBasicAuthUser(req.headers.get('authorization') || req.headers.get('Authorization'));
  const tx = [];
  for (const key of Object.keys(patch)) {
    const k = key as keyof typeof updated;
    tx.push(prisma.auditLog.create({
      data: {
        iata,
        field: key,
        oldValue: (before as any)[k] == null ? null : String((before as any)[k]),
        newValue: (updated as any)[k] == null ? null : String((updated as any)[k]),
        changedBy: changedBy ? `${changedBy} (rollback-to)` : "(rollback-to)",
        reason: reason
      }
    }));
  }
  if (tx.length) await prisma.$transaction(tx);

  // Snapshot AFTER rollback-to
  await createAirportSnapshot(iata, changedBy ? `${changedBy} (rollback-to)` : "(rollback-to)");

  return NextResponse.json({ ok: true, at: at.toISOString(), updated });
}
