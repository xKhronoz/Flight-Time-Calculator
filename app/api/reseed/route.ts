import { NextRequest, NextResponse } from "next/server";
import { runSeed } from "../../../scripts/seed-airports-lib";

export async function POST(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const reset = (url.searchParams.get("reset") || "").toLowerCase() === "true";
    const count = await runSeed(reset);
    return NextResponse.json({ ok: true, reset, count });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || String(e) }, { status: 500 });
  }
}
