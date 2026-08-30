import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function test() {
  const p = await prisma.faculty.findFirst({
    where: { name: { contains: 'PAVITHRA J' } }
  });
  console.log("PAVITHRA:", p);
}
test().finally(() => prisma.$disconnect());
