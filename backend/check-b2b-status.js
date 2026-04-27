const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkB2BStatus() {
  console.log('--- B2B Status Audit ---');
  
  const companyCount = await prisma.$queryRaw`SELECT COUNT(*) FROM companies`;
  console.log('Total Companies:', companyCount[0].count);
  
  const companies = await prisma.$queryRaw`SELECT "companyKey", name FROM companies`;
  console.log('Companies:', companies);
  
  const employeeCount = await prisma.$queryRaw`SELECT COUNT(*) FROM company_employees`;
  console.log('Total Employees:', employeeCount[0].count);
  
  const adminCount = await prisma.$queryRaw`SELECT COUNT(*) FROM users WHERE "is_company_admin" = true`;
  console.log('Corporate Admins:', adminCount[0].count);

  const leads = await prisma.$queryRaw`SELECT COUNT(*) FROM leads WHERE "companyKey" IS NOT NULL`;
  console.log('B2B Leads:', leads[0].count);

  await prisma.$disconnect();
}

checkB2BStatus();
