import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function test() {
  const p = await prisma.faculty.findFirst({
    where: { name: { contains: 'Pavithra J' } }
  });
  console.log("Pavithra:", p);

  const s = await prisma.faculty.findFirst({
    where: { name: { contains: 'Sasi Rekha Sankar' } }
  });
  console.log("Sasi:", s);
}

test().finally(() => prisma.$disconnect());
