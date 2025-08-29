import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getBasicAuthUser } from "@/app/api/_util/auth";
import { createAirportSnapshot } from "@/app/api/_util/snapshot";
import { requireReason } from "@/app/api/_util/reason";
import type { Prisma } from "@prisma/client";

function parseAt(s?: string | null): Date | null {
  if (!s) return null;
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d;
}

// POST /api/airports/:iata/rollback-to?at=ISO8601
export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ iata: string }> } // <-- params is a Promise
) {
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
  const at = parseAt(url.searchParams.get("at"));
  if (!at) {
    return NextResponse.json({ error: "Provide a valid ?at=ISO-8601 timestamp" }, { status: 400 });
  }

  const airport = await prisma.airport.findUnique({ where: { iata } });
  if (!airport) {
    return NextResponse.json({ error: "Airport not found" }, { status: 404 });
  }

  const logs = await prisma.auditLog.findMany({
    where: { iata, changedAt: { gt: at } },
    orderBy: { changedAt: "desc" },
    take: 10000,
  });

  if (logs.length === 0) {
    return NextResponse.json({
      ok: true,
      message: "No changes after the specified time; nothing to roll back.",
      airport,
    });
  }

  // Build a typed patch from the newest-to-oldest logs, keeping the earliest
  // oldValue seen for each field (so we roll back to the state at `at`)
  const patchEntries = new Map<keyof typeof airport, unknown>();
  for (const log of logs) {
    const field = log.field as keyof typeof airport;
    if (patchEntries.has(field)) continue;
    if (field === "lat" || field === "lon") {
      patchEntries.set(field, log.oldValue == null ? null : parseFloat(String(log.oldValue)));
    } else {
      patchEntries.set(field, log.oldValue);
    }
  }

  const patch = Object.fromEntries(patchEntries) as Partial<typeof airport>;
  // Constrain to Prisma type for update data
  const updateData: Prisma.AirportUpdateInput = patch;

  const before = airport;
  const updated = await prisma.airport.update({ where: { iata }, data: updateData });

  const authHeader = req.headers.get("authorization") || req.headers.get("Authorization") || undefined;
  const changedBy = getBasicAuthUser(authHeader);

  // Write audit entries for each field we touched
  const tx = [...patchEntries.keys()].map((key) =>
    prisma.auditLog.create({
      data: {
        iata,
        field: key as string,
        oldValue: (before as any)[key] == null ? null : String((before as any)[key]),
        newValue: (updated as any)[key] == null ? null : String((updated as any)[key]),
        changedBy: changedBy ? `${changedBy} (rollback-to)` : "(rollback-to)",
        reason,
      },
    })
  );
  if (tx.length) await prisma.$transaction(tx);

  await createAirportSnapshot(iata, changedBy ? `${changedBy} (rollback-to)` : "(rollback-to)");

  return NextResponse.json({ ok: true, at: at.toISOString(), updated });
}
