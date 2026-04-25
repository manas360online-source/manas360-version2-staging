const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('--- Seeding Plan Configurations ---');

  const patientPlans = [
    { key: 'patient-free', name: 'Free Plan', price: 0 },
    { key: 'patient-1month', name: '1 Month Plan', price: 99 },
    { key: 'patient-3month', name: '3 Month Plan', price: 249 },
    { key: 'patient-1year', name: '1 Year Plan', price: 799 },
  ];

  for (const plan of patientPlans) {
    await prisma.patientPlanConfig.upsert({
      where: { key: plan.key },
      update: { name: plan.name, price: plan.price },
      create: plan,
    });
  }
  console.log('Seeded Patient Plans');

  const providerPlans = {
    'lead-free': { name: 'Free Plan', baseAmount: 0, features: ['Basic profile'] },
    'lead-basic': { name: 'Basic Plan', baseAmount: 99, features: ['10 leads/mo'] },
    'lead-standard': { name: 'Standard Plan', baseAmount: 299, features: ['50 leads/mo'] },
    'lead-premium': { name: 'Premium Plan', baseAmount: 599, features: ['Unlimited leads'] },
  };

  // For provider plans, we store the whole object in the JSON 'data' field
  // We'll use the plan ID as the key in GlobalSettings or similar, 
  // but since we have ProviderPlanConfig, we'll store them there.
  // Wait, ProviderPlanConfig doesn't have a 'key' field, it's just 'data'.
  // We'll clear it and add them.
  await prisma.providerPlanConfig.deleteMany();
  await prisma.providerPlanConfig.create({
    data: {
      data: providerPlans
    }
  });
  console.log('Seeded Provider Plans');

}

main()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
