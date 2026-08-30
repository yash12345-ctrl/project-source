import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const allFaculty = await prisma.faculty.findMany();
  console.log(`Total faculty in DB: ${allFaculty.length}`);
  
  const toDelete = await prisma.faculty.findMany({
    where: {
      OR: [
        { imageBase64: null },
        { imageBase64: '' }
      ]
    }
  });
  
  console.log(`Faculty with missing imageBase64: ${toDelete.length}`);
  
  if (toDelete.length > 0) {
    const ids = toDelete.map(f => f.id);
    const result = await prisma.faculty.deleteMany({
      where: {
        id: { in: ids }
      }
    });
    console.log(`Deleted ${result.count} faculty members.`);
  }
}

main().catch(e => console.error(e)).finally(() => prisma.$disconnect());
