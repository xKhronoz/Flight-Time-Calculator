import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const q = (searchParams.get("q") || "").trim();
  const take = Math.min(parseInt(searchParams.get("take") || "20", 10), 100);

  if (!q) {
    const recent = await prisma.airport.findMany({ take: 20, orderBy: { iata: "asc" } });
    return NextResponse.json(recent);
  }

  const res = await prisma.airport.findMany({
    where: {
      OR: [
        { iata: { contains: q, mode: "insensitive" } },
        { icao: { contains: q, mode: "insensitive" } },
        { name: { contains: q, mode: "insensitive" } },
        { city: { contains: q, mode: "insensitive" } },
        { country: { contains: q, mode: "insensitive" } },
      ],
    },
    take,
    orderBy: [{ iata: "asc" }],
  });

  return NextResponse.json(res);
}
