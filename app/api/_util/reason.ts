import { NextRequest } from "next/server";

export async function requireReason(req: NextRequest): Promise<string | null> {
  let reason: string | null = null;
  const contentType = req.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    try {
      const clone = req.clone();
      const body = await clone.json();
      if (typeof body?.reason === 'string' && body.reason.trim().length > 0) {
        return body.reason.trim();
      }
    } catch {}
  }
  try {
    const url = new URL(req.url);
    const q = url.searchParams.get('reason');
    if (q && q.trim()) return q.trim();
  } catch {}
  return null;
}
