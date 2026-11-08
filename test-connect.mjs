import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({
  log: ['error', 'warn'],
});

const result = await prisma.$runCommandRaw({ ping: 1 });
console.log('Connected:', result);
await prisma.$disconnect();
console.log('Disconnected');
process.exit(0);
