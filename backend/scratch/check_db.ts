import { prisma } from '../src/config/db';

async function main() {
  try {
    const features = await prisma.mDCFeatureCatalog.findMany();
    console.log('Features:', features.length);
    const pricing = await prisma.mDCTierPricing.findMany();
    console.log('Pricing entries:', pricing.length);
  } catch (err) {
    console.error('Database Error:', err);
  } finally {
    await prisma.$disconnect();
  }
}

main();
