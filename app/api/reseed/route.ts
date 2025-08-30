import { NextRequest, NextResponse } from "next/server";
import { seedChunk } from "@/scripts/seed-airports-lib";

export const maxDuration = 120; // keep each chunk well under limits

// POST /api/reseed?offset=0&limit=500&mode=upsert|replace
export async function POST(req: NextRequest) {
  const url = new URL(req.url);
  const offset = Math.max(0, parseInt(url.searchParams.get("offset") || "0", 10));
  const limit = Math.min(2000, Math.max(1, parseInt(url.searchParams.get("limit") || "500", 10)));
  const mode = (url.searchParams.get("mode") || "upsert") as "upsert" | "replace";

  const { processed, total, nextOffset, done } = await seedChunk(offset, limit, { replace: mode === "replace" });

  return NextResponse.json({ mode, processed, total, nextOffset, done });
}