const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function reset() {
  await prisma.$executeRawUnsafe('DROP SCHEMA public CASCADE');
  await prisma.$executeRawUnsafe('CREATE SCHEMA public');
  console.log('Schema reset complete');
  await prisma.$disconnect();
}
reset().catch((e) => {
  console.error(e);
  process.exit(1);
});
