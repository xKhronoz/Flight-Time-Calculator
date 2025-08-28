import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

function parseDate(s?: string | null): Date | undefined {
  if (!s) return undefined;
  const d = new Date(s);
  return isNaN(d.getTime()) ? undefined : d;
}

// GET /api/airports/:iata/audit?field=&user=&from=&to=
export async function GET(req: NextRequest, { params }: { params: { iata: string } }) {
  const iata = (params.iata || "").toUpperCase();
  if (!iata || iata.length !== 3) return NextResponse.json({ error: "Invalid IATA" }, { status: 400 });
  const { searchParams } = new URL(req.url);
  const field = (searchParams.get("field") || "").trim();
  const user = (searchParams.get("user") || "").trim();
  const from = parseDate(searchParams.get("from"));
  const to = parseDate(searchParams.get("to"));

  const where: any = { iata };
  if (field) where.field = field;
  if (user) where.changedBy = { contains: user, mode: "insensitive" };
  if (from || to) where.changedAt = {};
  if (from) where.changedAt.gte = from;
  if (to) where.changedAt.lte = to;

  const logs = await prisma.auditLog.findMany({
    where,
    orderBy: { changedAt: "desc" },
    take: 500,
  });
  return NextResponse.json(logs);
}
