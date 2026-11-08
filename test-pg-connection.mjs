import { PrismaClient } from '@prisma/client';

console.log('Testing MongoDB Atlas connection...');
const prisma = new PrismaClient();

try {
  const result = await prisma.$runCommandRaw({ ping: 1 });
  console.log('✅ SUCCESS! MongoDB Atlas connected:', result);
  await prisma.$disconnect();
  process.exit(0);
} catch (e) {
  console.log(`❌ Connection failed: ${e.message.substring(0, 150)}`);
  await prisma.$disconnect();
  process.exit(1);
}
