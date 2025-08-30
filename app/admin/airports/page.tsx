import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import Link from "next/link";
import { use } from "react";
import type { UrlObject } from "url";

function toInt(v: string | null | undefined, d: number) {
  const n = v ? parseInt(v, 10) : NaN;
  return Number.isFinite(n) ? n : d;
}

type SearchParams = Record<string, string | string[] | undefined>;

export const dynamic = "force-dynamic";

export default function AirportsPage(
  { searchParams }: { searchParams?: Promise<SearchParams> } // <- Promise only
) {
  // unwrap; if undefined, use an empty object
  const params = use(searchParams ?? Promise.resolve({} as SearchParams));

  const qRaw = params.q;
  const q = (Array.isArray(qRaw) ? qRaw[0] : qRaw ?? "").trim();

  const pageRaw = params.page;
  const page = Math.max(
    1,
    toInt(Array.isArray(pageRaw) ? pageRaw[0] : (pageRaw as string | undefined) ?? null, 1)
  );

  const take = 50;
  const skip = (page - 1) * take;

  const where: Prisma.AirportWhereInput = q
    ? {
        OR: [
          { iata: { contains: q, mode: Prisma.QueryMode.insensitive } },
          { icao: { contains: q, mode: Prisma.QueryMode.insensitive } },
          { name: { contains: q, mode: Prisma.QueryMode.insensitive } },
          { city: { contains: q, mode: Prisma.QueryMode.insensitive } },
          { country: { contains: q, mode: Prisma.QueryMode.insensitive } },
          { timezone: { contains: q, mode: Prisma.QueryMode.insensitive } },
        ],
      }
    : {};

  const [items, total, error] = use(
    Promise.all([
      prisma.airport.findMany({ where, take, skip, orderBy: { iata: "asc" } }),
      prisma.airport.count({ where }),
    ])
      .then(([items, total]) => [items, total, null])
      .catch(e => [null, null, e instanceof Error ? e.message : String(e)])
  );

  const safeTotal = typeof total === "number" && Number.isFinite(total) ? total : 0;
  const pages = Math.max(1, Math.ceil(safeTotal / take));

  const qs = (p: number): UrlObject => ({
    pathname: "/admin/airports",
    query: q ? { q, page: p } : { page: p },
  });

  if (typeof error === "string" && error) {
    return (
      <div className="max-w-6xl mx-auto p-6">
        <div className="text-red-500">Failed to load airports: {error}</div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      {/* ... */}
      <div className="flex items-center gap-2 mt-4">
        <Link href={qs(Math.max(1, page - 1))} className="px-3 py-2 rounded-xl border border-slate-700 hover:bg-slate-800">
          Prev
        </Link>
        <span className="text-slate-400">Page {page} / {pages}</span>
        <Link href={qs(Math.min(pages, page + 1))} className="px-3 py-2 rounded-xl border border-slate-700 hover:bg-slate-800">
          Next
        </Link>
      </div>
    </div>
  );
}
