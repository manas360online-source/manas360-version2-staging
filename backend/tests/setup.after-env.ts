import { prisma } from '../src/config/db';

afterAll(async () => {
  await prisma.$disconnect().catch(() => undefined);
});
