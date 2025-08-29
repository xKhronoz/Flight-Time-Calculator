import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

function parseDate(s?: string | null): Date | undefined {
  if (!s) return undefined;
  const d = new Date(s);
  return isNaN(d.getTime()) ? undefined : d;
}

// GET /api/airports/:iata/audit?field=&user=&from=&to=
export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ iata: string }> } // <-- params is a Promise
) {
  const { iata: rawIata } = await ctx.params;   // <-- await it
  const iata = (rawIata ?? "").toUpperCase();
  if (iata.length !== 3) {
    return NextResponse.json({ error: "Invalid IATA" }, { status: 400 });
  }

  const { searchParams } = new URL(req.url);
  const field = (searchParams.get("field") ?? "").trim();
  const user = (searchParams.get("user") ?? "").trim();
  const from = parseDate(searchParams.get("from"));
  const to = parseDate(searchParams.get("to"));

  const where: Prisma.AuditLogWhereInput = {
    iata,
    ...(field && { field }),
    ...(user && {
      changedBy: { contains: user, mode: Prisma.QueryMode.insensitive },
    }),
    ...((from || to) && {
      changedAt: {
        ...(from && { gte: from }),
        ...(to && { lte: to }),
      },
    }),
  };

  const logs = await prisma.auditLog.findMany({
    where,
    orderBy: { changedAt: "desc" },
    take: 500,
  });

  return NextResponse.json(logs);
}
