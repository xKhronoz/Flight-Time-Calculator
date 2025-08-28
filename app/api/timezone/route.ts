import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const iata = (searchParams.get("iata") || "").toUpperCase().trim();
  if (!iata || iata.length !== 3) {
    return NextResponse.json({ error: "Provide ?iata=AAA" }, { status: 400 });
  }
  const airport = await prisma.airport.findUnique({ where: { iata } });
  if (!airport || !airport.timezone) {
    return NextResponse.json({ error: "IATA not found or missing timezone" }, { status: 404 });
  }
  return NextResponse.json({ iata, timezone: airport.timezone });
}
