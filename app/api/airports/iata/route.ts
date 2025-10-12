import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const q = (searchParams.get("q") || "").trim();
    const take = Math.min(parseInt(searchParams.get("take") || "20", 10), 100);

    if (!q) return NextResponse.json([]);

    const res = await prisma.airport.findMany({
      where: {
        iata: { startsWith: q, mode: "insensitive" },
      },
      take,
      orderBy: [{ iata: "asc" }],
    });

    return NextResponse.json(res);
  } catch (error) {
    return NextResponse.json(
      {
        error: "Failed to fetch iata matches",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
