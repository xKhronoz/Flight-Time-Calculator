import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const reset = (url.searchParams.get("reset") || "").toLowerCase() === "true";
    const { runSeed } = await import("../../../scripts/seed-airports-lib.mjs");
    const count = await runSeed(reset);
    return NextResponse.json({ ok: true, reset, count });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || String(e) }, { status: 500 });
  }
}
