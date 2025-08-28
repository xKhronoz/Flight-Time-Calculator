import { prisma } from "@/lib/prisma";
import Link from "next/link";

function toInt(v: string | null, d: number) {
  const n = v ? parseInt(v, 10) : NaN;
  return Number.isFinite(n) ? n : d;
}

export const dynamic = "force-dynamic";

export default async function AirportsPage({ searchParams }: { searchParams?: Record<string, string | string[] | undefined> }) {
  const q = (searchParams?.q as string || "").trim();
  const page = Math.max(1, toInt(searchParams?.page as string || null, 1));
  const take = 50;
  const skip = (page - 1) * take;

  const where = q ? {
    OR: [
      { iata: { contains: q, mode: "insensitive" } },
      { icao: { contains: q, mode: "insensitive" } },
      { name: { contains: q, mode: "insensitive" } },
      { city: { contains: q, mode: "insensitive" } },
      { country: { contains: q, mode: "insensitive" } },
      { timezone: { contains: q, mode: "insensitive" } },
    ]
  } : {};

  const [items, total] = await Promise.all([
    prisma.airport.findMany({ where, take, skip, orderBy: { iata: "asc" } }),
    prisma.airport.count({ where }),
  ]);
  const pages = Math.max(1, Math.ceil(total / take));

  const qs = (p: number) => {
    const sp = new URLSearchParams();
    if (q) sp.set("q", q);
    sp.set("page", String(p));
    return `/admin/airports?${sp.toString()}`;
  };

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="flex items-end justify-between mb-4">
        <h1 className="text-2xl font-semibold">Airports Admin</h1>
        <Link href="/admin" className="text-sm px-3 py-2 rounded-xl border border-slate-700 hover:bg-slate-800">Admin Home</Link>
      </div>

      <form className="mb-4 flex gap-2" action="/admin/airports" method="get">
        <input name="q" placeholder="Search IATA/ICAO/Name/City/Country/TZ" defaultValue={q}
               className="w-full rounded-xl bg-slate-800 border border-slate-700 px-3 py-2" />
        <button className="px-4 py-2 rounded-xl bg-slate-700 hover:bg-slate-600">Search</button>
      </form>

      <div className="text-sm text-slate-300 mb-2">Total: {total} • Page {page} / {pages}</div>

      <div className="overflow-auto border border-slate-800 rounded-xl">
        <table className="w-full text-sm">
          <thead className="bg-slate-900 sticky top-0">
            <tr>
              <th className="px-3 py-2 text-left">IATA</th>
              <th className="px-3 py-2 text-left">ICAO</th>
              <th className="px-3 py-2 text-left">Name</th>
              <th className="px-3 py-2 text-left">City</th>
              <th className="px-3 py-2 text-left">Country</th>
              <th className="px-3 py-2 text-left">Timezone</th>
              <th className="px-3 py-2 text-left">Lat</th>
              <th className="px-3 py-2 text-left">Lon</th>
            </tr>
          </thead>
          <tbody>
            {items.map(a => (
              <tr key={a.id} className="border-t border-slate-800">
                <td className="px-3 py-2 font-mono">
                  <Link href={`/admin/airports/${a.iata}`} className="underline hover:no-underline">{a.iata}</Link>
                </td>
                <td className="px-3 py-2 font-mono">{a.icao || ""}</td>
                <td className="px-3 py-2">{a.name || ""}</td>
                <td className="px-3 py-2">{a.city || ""}</td>
                <td className="px-3 py-2">{a.country || ""}</td>
                <td className="px-3 py-2 font-mono">{a.timezone || ""}</td>
                <td className="px-3 py-2">{a.lat ?? ""}</td>
                <td className="px-3 py-2">{a.lon ?? ""}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex items-center gap-2 mt-4">
        <Link href={qs(Math.max(1, page - 1))} className="px-3 py-2 rounded-xl border border-slate-700 hover:bg-slate-800">Prev</Link>
        <span className="text-slate-400">Page {page} / {pages}</span>
        <Link href={qs(Math.min(pages, page + 1))} className="px-3 py-2 rounded-xl border border-slate-700 hover:bg-slate-800">Next</Link>
      </div>
    </div>
  );
}
