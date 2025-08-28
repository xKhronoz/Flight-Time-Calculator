import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

export default async function main() {
  try {
    const c = await prisma.airport.count();
    await prisma.$disconnect();
    return c;
  } catch (e) {
    await prisma.$disconnect();
    return 0;
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().then((c) => {
    console.log(c);
  });
}
