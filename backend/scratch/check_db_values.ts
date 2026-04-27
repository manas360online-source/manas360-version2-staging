import { prisma } from '../src/config/db';

async function main() {
  try {
    const tiers = await prisma.mDCTierPricing.findMany({
      select: { clinicTier: true },
      distinct: ['clinicTier'],
    });
    console.log('Tiers in DB:', tiers.map(t => t.clinicTier));
    
    const features = await prisma.mDCFeatureCatalog.findMany({
      select: { slug: true },
    });
    console.log('Features in DB:', features.map(f => f.slug));
  } catch (err) {
    console.error('Database Error:', err);
  } finally {
    await prisma.$disconnect();
  }
}

main();
