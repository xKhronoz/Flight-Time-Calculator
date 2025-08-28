import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest, { params }: { params: { iata: string } }) {
  const iata = (params.iata || "").toUpperCase();
  if (!iata || iata.length !== 3) return NextResponse.json({ error: "Invalid IATA" }, { status: 400 });
  const { searchParams } = new URL(req.url);
  const take = Math.min(parseInt(searchParams.get("take") || "50", 10), 200);
  const snaps = await prisma.snapshot.findMany({
    where: { iata },
    orderBy: { changedAt: "desc" },
    take,
  });
  return NextResponse.json(snaps);
}
