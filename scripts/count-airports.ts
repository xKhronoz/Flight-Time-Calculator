import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

export default async function main(): Promise<number> {
    try {
        const c = await prisma.airport.count();
        await prisma.$disconnect();
        return c;
    } catch (e) {
        await prisma.$disconnect();
        return 0;
    }
}

if (require.main === module) {
    main().then((c) => {
        console.log(c);
    });
}
