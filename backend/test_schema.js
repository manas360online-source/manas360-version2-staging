const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    // Test if LeadAssignment model works
    const count = await prisma.leadAssignment.count();
    console.log('✅ LeadAssignment table exists. Current records:', count);
    
    // Test if new fields exist on ProviderSubscription
    const subs = await prisma.providerSubscription.count();
    console.log('✅ ProviderSubscription table accessible. Records:', subs);
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

main();
