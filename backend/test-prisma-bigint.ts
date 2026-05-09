import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function run() {
  try {
    await prisma.financialPayment.create({
      data: {
        merchantTransactionId: 'test-' + Date.now(),
        amountMinor: 100, // <--- number instead of BigInt
      } as any
    });
  } catch (e: any) {
    console.log("PRISMA ERROR MESSAGE:", e.message);
  } finally {
    await prisma.$disconnect();
  }
}
run();
