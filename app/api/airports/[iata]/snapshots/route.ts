import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ iata: string }> } // <-- params is a Promise
) {
  try {
    const { iata: rawIata } = await ctx.params;     // <-- await it
    const iata = (rawIata || "").toUpperCase();
    if (iata.length !== 3) {
      return NextResponse.json({ error: "Invalid IATA" }, { status: 400 });
    }
    const { searchParams } = new URL(req.url);
    const takeParam = parseInt(searchParams.get("take") || "50", 10);
    const take = Math.max(1, Math.min(Number.isFinite(takeParam) ? takeParam : 50, 200));
    const snaps = await prisma.snapshot.findMany({
      where: { iata },
      orderBy: { changedAt: "desc" },
      take,
    });
    return NextResponse.json(snaps);
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch snapshots", details: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
}
