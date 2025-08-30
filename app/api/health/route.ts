import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  // Basic liveness and (optional) DB check
  try {
    // Ping the DB quickly; ignore errors to still return liveness
    await prisma.$queryRaw`SELECT 1`;
    return NextResponse.json({ ok: true, db: "up" }, { status: 200 });
  } catch (error) {
    // Optionally log error details for debugging
    console.error("DB health check failed:", error);
    return NextResponse.json(
      { ok: true, db: "down", details: error instanceof Error ? error.message : String(error) },
      { status: 200 }
    );
  }
}
