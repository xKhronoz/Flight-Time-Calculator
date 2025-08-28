import { prisma } from "@/lib/prisma";

export async function createAirportSnapshot(iata: string, changedBy?: string | null) {
  const airport = await prisma.airport.findUnique({ where: { iata } });
  if (!airport) return null;
  const snap = await prisma.snapshot.create({
    data: {
      iata,
      data: airport as any,
      changedBy: changedBy || null,
    }
  });
  return snap;
}
