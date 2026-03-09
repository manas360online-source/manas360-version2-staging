import { randomUUID } from 'crypto';
import { prisma } from '../config/db';
import { AppError } from '../middleware/error.middleware';
import { hashPassword } from '../utils/hash';

type BulkEmployeeRow = {
  employeeId?: string;
  name?: string;
  email?: string;
  department?: string;
  location?: string;
  manager?: string;
};

type CorporateSettingsUpdate = {
  companyName?: string;
  employeeLimit?: number;
  sessionQuota?: number;
  ssoProvider?: string;
  privacyPolicy?: string;
  supportEmail?: string;
  supportPhone?: string;
  supportSla?: string;
};

type ProgramCreateInput = {
  title: string;
  durationWeeks: number;
  employeesEnrolled: number;
  completionRate: number;
  status?: string;
};

type WorkshopCreateInput = {
  title: string;
  provider: string;
  department: string;
  date: string;
  attendees: number;
  status?: string;
};

type CampaignCreateInput = {
  title: string;
  audience: string;
  startDate: string;
  endDate: string;
  reachCount: number;
  engagementRate: number;
  status?: string;
};

type SessionAllocationUpdate = {
  department: string;
  allocatedSessions: number;
};

type PaymentMethodCreateInput = {
  methodType?: string;
  label?: string;
  details?: string;
  isPrimary?: boolean;
};

type PaymentMethodUpdateInput = {
  label?: string;
  details?: string;
  isPrimary?: boolean;
  isActive?: boolean;
};

type CorporateDemoRequestInput = {
  companyName?: string;
  workEmail?: string;
  companySize?: string;
  industry?: string;
  country?: string;
  contactName?: string;
  phone?: string;
};

type CorporateAccountCreateInput = {
  companyName?: string;
  workEmail?: string;
  password?: string;
  companySize?: string;
  industry?: string;
  country?: string;
  contactName?: string;
};

const DEFAULT_COMPANY_KEY = 'techcorp-india';

const queryRaw = async <T>(sql: string, ...params: unknown[]): Promise<T> => (
  prisma.$queryRawUnsafe(sql, ...params) as Promise<T>
);

const toInt = (value: unknown, fallback = 0): number => {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.round(n);
};

const toPct = (value: number, total: number): number => {
  if (!total) return 0;
  return Number(((value / total) * 100).toFixed(1));
};

const sanitizeKeyPart = (value: string): string =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40);

const resolveUniqueCompanyKey = async (companyName: string): Promise<string> => {
  const base = sanitizeKeyPart(companyName) || `company-${randomUUID().slice(0, 8)}`;

  const existing = await queryRaw<Array<{ companyKey: string }>>(
    `SELECT "companyKey" FROM "companies" WHERE "companyKey" LIKE $1`,
    `${base}%`,
  );

  const existingSet = new Set(existing.map((row) => String(row.companyKey)));
  if (!existingSet.has(base)) {
    return base;
  }

  let suffix = 2;
  while (existingSet.has(`${base}-${suffix}`)) {
    suffix += 1;
  }
  return `${base}-${suffix}`;
};

const normalizeEmail = (value: unknown): string => String(value || '').trim().toLowerCase();

const getDomainFromEmail = (email: string): string | null => {
  const parts = String(email || '').toLowerCase().split('@');
  if (parts.length !== 2) return null;
  const domain = parts[1].trim();
  return domain || null;
};

const normalizeRisk = (value: string | null | undefined): 'HIGH' | 'MEDIUM' | 'LOW' => {
  const raw = String(value || '').toUpperCase();
  if (raw === 'HIGH') return 'HIGH';
  if (raw === 'MEDIUM') return 'MEDIUM';
  return 'LOW';
};

export const ensureCorporateTables = async (): Promise<void> => {
  await prisma.$executeRawUnsafe(`ALTER TABLE "users" ADD COLUMN IF NOT EXISTS company_key text;`);
  await prisma.$executeRawUnsafe(`ALTER TABLE "users" ADD COLUMN IF NOT EXISTS is_company_admin boolean DEFAULT false;`);

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "companies" (
      "id" TEXT PRIMARY KEY,
      "companyKey" TEXT NOT NULL UNIQUE,
      "name" TEXT NOT NULL,
      "employeeLimit" INTEGER NOT NULL DEFAULT 300,
      "sessionQuota" INTEGER NOT NULL DEFAULT 200,
      "ssoProvider" TEXT NOT NULL DEFAULT 'Google Workspace',
      "privacyPolicy" TEXT NOT NULL DEFAULT 'Only aggregate analytics are visible to HR. Individual therapy notes, diagnosis, medications, and provider details are never shown.',
      "supportEmail" TEXT NOT NULL DEFAULT 'enterprise-support@manas360.com',
      "supportPhone" TEXT NOT NULL DEFAULT '+91-80-4000-3600',
      "supportSla" TEXT NOT NULL DEFAULT 'Priority support within 4 business hours.',
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);

  await prisma.$executeRawUnsafe(`
    ALTER TABLE "companies" ADD COLUMN IF NOT EXISTS "domain" TEXT;
  `);

  await prisma.$executeRawUnsafe(`
    ALTER TABLE "companies" ADD COLUMN IF NOT EXISTS "supportEmail" TEXT NOT NULL DEFAULT 'enterprise-support@manas360.com';
  `);

  await prisma.$executeRawUnsafe(`
    ALTER TABLE "companies" ADD COLUMN IF NOT EXISTS "supportPhone" TEXT NOT NULL DEFAULT '+91-80-4000-3600';
  `);

  await prisma.$executeRawUnsafe(`
    ALTER TABLE "companies" ADD COLUMN IF NOT EXISTS "supportSla" TEXT NOT NULL DEFAULT 'Priority support within 4 business hours.';
  `);

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "company_departments" (
      "id" TEXT PRIMARY KEY,
      "companyId" TEXT NOT NULL,
      "name" TEXT NOT NULL,
      "riskIndicator" TEXT NOT NULL DEFAULT 'MODERATE',
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "company_departments_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE,
      CONSTRAINT "company_departments_companyId_name_key" UNIQUE ("companyId", "name")
    );
  `);

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "company_employees" (
      "id" TEXT PRIMARY KEY,
      "companyId" TEXT NOT NULL,
      "departmentId" TEXT,
      "employeeCode" TEXT,
      "name" TEXT NOT NULL,
      "email" TEXT NOT NULL,
      "location" TEXT,
      "managerName" TEXT,
      "riskBand" TEXT NOT NULL DEFAULT 'LOW',
      "phq9Score" INTEGER NOT NULL DEFAULT 0,
      "gad7Score" INTEGER NOT NULL DEFAULT 0,
      "sessionsUsed" INTEGER NOT NULL DEFAULT 0,
      "engagementScore" INTEGER NOT NULL DEFAULT 0,
      "preferredService" TEXT NOT NULL DEFAULT 'Stress therapy',
      "isActive" BOOLEAN NOT NULL DEFAULT true,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "company_employees_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE,
      CONSTRAINT "company_employees_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "company_departments"("id") ON DELETE SET NULL,
      CONSTRAINT "company_employees_companyId_email_key" UNIQUE ("companyId", "email")
    );
  `);

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "company_session_allocations" (
      "id" TEXT PRIMARY KEY,
      "companyId" TEXT NOT NULL,
      "departmentId" TEXT NOT NULL,
      "allocatedSessions" INTEGER NOT NULL DEFAULT 0,
      "usedSessions" INTEGER NOT NULL DEFAULT 0,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "company_session_allocations_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE,
      CONSTRAINT "company_session_allocations_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "company_departments"("id") ON DELETE CASCADE,
      CONSTRAINT "company_session_allocations_companyId_departmentId_key" UNIQUE ("companyId", "departmentId")
    );
  `);

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "corporate_programs" (
      "id" TEXT PRIMARY KEY,
      "companyId" TEXT NOT NULL,
      "title" TEXT NOT NULL,
      "durationWeeks" INTEGER NOT NULL DEFAULT 4,
      "employeesEnrolled" INTEGER NOT NULL DEFAULT 0,
      "completionRate" INTEGER NOT NULL DEFAULT 0,
      "status" TEXT NOT NULL DEFAULT 'ACTIVE',
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "corporate_programs_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE
    );
  `);

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "corporate_workshops" (
      "id" TEXT PRIMARY KEY,
      "companyId" TEXT NOT NULL,
      "title" TEXT NOT NULL,
      "provider" TEXT NOT NULL,
      "department" TEXT NOT NULL,
      "workshopDate" DATE NOT NULL,
      "attendees" INTEGER NOT NULL DEFAULT 0,
      "status" TEXT NOT NULL DEFAULT 'SCHEDULED',
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "corporate_workshops_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE
    );
  `);

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "corporate_campaigns" (
      "id" TEXT PRIMARY KEY,
      "companyId" TEXT NOT NULL,
      "title" TEXT NOT NULL,
      "audience" TEXT NOT NULL,
      "startDate" DATE NOT NULL,
      "endDate" DATE NOT NULL,
      "reachCount" INTEGER NOT NULL DEFAULT 0,
      "engagementRate" INTEGER NOT NULL DEFAULT 0,
      "status" TEXT NOT NULL DEFAULT 'ACTIVE',
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "corporate_campaigns_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE
    );
  `);

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "corporate_reports" (
      "id" TEXT PRIMARY KEY,
      "companyId" TEXT NOT NULL,
      "reportType" TEXT NOT NULL,
      "quarter" TEXT NOT NULL,
      "format" TEXT NOT NULL,
      "downloadUrl" TEXT,
      "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "corporate_reports_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE
    );
  `);

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "corporate_monthly_metrics" (
      "id" TEXT PRIMARY KEY,
      "companyId" TEXT NOT NULL,
      "monthLabel" TEXT NOT NULL,
      "sessionsUsed" INTEGER NOT NULL DEFAULT 0,
      "sessionsAllocated" INTEGER NOT NULL DEFAULT 0,
      "activeUsers" INTEGER NOT NULL DEFAULT 0,
      "stressScore" INTEGER NOT NULL DEFAULT 0,
      "utilizationRate" INTEGER NOT NULL DEFAULT 0,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "corporate_monthly_metrics_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE,
      CONSTRAINT "corporate_monthly_metrics_companyId_monthLabel_key" UNIQUE ("companyId", "monthLabel")
    );
  `);

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "corporate_payment_methods" (
      "id" TEXT PRIMARY KEY,
      "companyId" TEXT NOT NULL,
      "methodType" TEXT NOT NULL,
      "label" TEXT NOT NULL,
      "details" TEXT NOT NULL,
      "isPrimary" BOOLEAN NOT NULL DEFAULT false,
      "isActive" BOOLEAN NOT NULL DEFAULT true,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "corporate_payment_methods_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE
    );
  `);

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "corporate_invoices" (
      "id" TEXT PRIMARY KEY,
      "companyId" TEXT NOT NULL,
      "invoiceCode" TEXT NOT NULL,
      "title" TEXT NOT NULL,
      "billingPeriod" TEXT NOT NULL,
      "amountPaise" INTEGER NOT NULL DEFAULT 0,
      "currency" TEXT NOT NULL DEFAULT 'INR',
      "status" TEXT NOT NULL DEFAULT 'DUE',
      "dueDate" DATE,
      "paidDate" DATE,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "corporate_invoices_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE,
      CONSTRAINT "corporate_invoices_companyId_invoiceCode_key" UNIQUE ("companyId", "invoiceCode")
    );
  `);

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "corporate_demo_requests" (
      "id" TEXT PRIMARY KEY,
      "companyName" TEXT NOT NULL,
      "companyKey" TEXT,
      "workEmail" TEXT NOT NULL,
      "companySize" TEXT,
      "industry" TEXT,
      "country" TEXT,
      "contactName" TEXT,
      "phone" TEXT,
      "status" TEXT NOT NULL DEFAULT 'NEW',
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);

  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS "corporate_demo_requests_workEmail_idx" ON "corporate_demo_requests"("workEmail");
  `);
};

const getCompanyByKey = async (companyKey = DEFAULT_COMPANY_KEY): Promise<{ id: string; name: string } | null> => {
  const rows = await queryRaw<Array<{ id: string; name: string }>>(
    `SELECT "id", "name" FROM "companies" WHERE "companyKey" = $1 LIMIT 1`,
    companyKey,
  );
  return rows[0] || null;
};

const seedCorporateDemoData = async (companyKey = DEFAULT_COMPANY_KEY): Promise<{ companyId: string; companyName: string }> => {
  await ensureCorporateTables();

  const existing = await getCompanyByKey(companyKey);
  let companyId = existing?.id || randomUUID();

  const defaultDomain = companyKey === 'techcorp-india'
    ? 'techcorp.com'
    : companyKey === 'global-fintech-labs'
      ? 'globalfintech.com'
      : companyKey === 'zen-retail-group'
        ? 'zenretail.com'
        : `${companyKey.replace(/-+/g, '')}.com`;

  await prisma.$executeRawUnsafe(
    `INSERT INTO "companies" (
      "id","companyKey","domain","name","employeeLimit","sessionQuota","ssoProvider","privacyPolicy","supportEmail","supportPhone","supportSla","createdAt","updatedAt"
    )
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,NOW(),NOW())
     ON CONFLICT ("companyKey") DO UPDATE SET
      "domain"=EXCLUDED."domain",
      "name"=EXCLUDED."name",
      "employeeLimit"=EXCLUDED."employeeLimit",
      "sessionQuota"=EXCLUDED."sessionQuota",
      "ssoProvider"=EXCLUDED."ssoProvider",
      "privacyPolicy"=EXCLUDED."privacyPolicy",
      "supportEmail"=EXCLUDED."supportEmail",
      "supportPhone"=EXCLUDED."supportPhone",
      "supportSla"=EXCLUDED."supportSla",
      "updatedAt"=NOW();`,
    companyId,
    companyKey,
    defaultDomain,
    'TechCorp India',
    300,
    200,
    'Google Workspace',
    'Only aggregate analytics are visible to HR. Individual therapy notes, diagnosis, medications, and provider details are never shown.',
    'enterprise-support@manas360.com',
    '+91-80-4000-3600',
    'Priority support within 4 business hours.',
  );

  const company = await getCompanyByKey(companyKey);
  companyId = company?.id || companyId;

  const departments = [
    { name: 'Engineering', risk: 'HIGH', enrolled: 82, used: 48, allocated: 80 },
    { name: 'Operations', risk: 'MODERATE', enrolled: 56, used: 38, allocated: 50 },
    { name: 'Sales & Marketing', risk: 'MODERATE', enrolled: 44, used: 24, allocated: 40 },
    { name: 'Customer Support', risk: 'MODERATE', enrolled: 38, used: 19, allocated: 20 },
    { name: 'HR & Admin', risk: 'LOW', enrolled: 28, used: 13, allocated: 10 },
  ];

  for (const department of departments) {
    await prisma.$executeRawUnsafe(
      `INSERT INTO "company_departments" ("id","companyId","name","riskIndicator","createdAt","updatedAt")
       VALUES ($1,$2,$3,$4,NOW(),NOW())
       ON CONFLICT ("companyId","name") DO UPDATE SET
        "riskIndicator"=EXCLUDED."riskIndicator",
        "updatedAt"=NOW();`,
      randomUUID(),
      companyId,
      department.name,
      department.risk,
    );
  }

  const countRows = await queryRaw<Array<{ count: bigint }>>(
    `SELECT COUNT(*)::bigint as count FROM "company_employees" WHERE "companyId" = $1`,
    companyId,
  );

  if (toInt(countRows[0]?.count || 0) === 0) {
    const serviceBuckets = ['Stress therapy', 'Relationship counselling', 'Burnout recovery', 'Career coaching'];
    let employeeSeq = 1;
    for (const department of departments) {
      const deptRows = await queryRaw<Array<{ id: string }>>(
        `SELECT "id" FROM "company_departments" WHERE "companyId" = $1 AND "name" = $2 LIMIT 1`,
        companyId,
        department.name,
      );
      const departmentId = deptRows[0]?.id;
      if (!departmentId) continue;

      for (let i = 0; i < department.enrolled; i += 1) {
        const index = employeeSeq;
        const riskBand = department.risk === 'HIGH'
          ? (i % 3 === 0 ? 'HIGH' : i % 2 === 0 ? 'MEDIUM' : 'LOW')
          : department.risk === 'LOW'
            ? (i % 4 === 0 ? 'MEDIUM' : 'LOW')
            : (i % 5 === 0 ? 'HIGH' : i % 2 === 0 ? 'MEDIUM' : 'LOW');

        const sessionsUsed = index <= 166 ? (1 + (index % 4)) : 0;
        const engagementScore = index <= 166 ? 55 + (index % 40) : 20 + (index % 20);

        await prisma.$executeRawUnsafe(
          `INSERT INTO "company_employees" (
             "id","companyId","departmentId","employeeCode","name","email","location","managerName",
             "riskBand","phq9Score","gad7Score","sessionsUsed","engagementScore","preferredService","isActive","createdAt","updatedAt"
           ) VALUES (
             $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,true,NOW(),NOW()
           ) ON CONFLICT ("companyId","email") DO NOTHING;`,
          randomUUID(),
          companyId,
          departmentId,
          `EMP${String(index).padStart(4, '0')}`,
          `Employee ${index}`,
          `employee${index}@techcorp.com`,
          index % 2 === 0 ? 'Bengaluru' : 'Hyderabad',
          `Manager ${1 + (index % 12)}`,
          riskBand,
          riskBand === 'HIGH' ? 15 : riskBand === 'MEDIUM' ? 10 : 5,
          riskBand === 'HIGH' ? 14 : riskBand === 'MEDIUM' ? 9 : 4,
          sessionsUsed,
          engagementScore,
          serviceBuckets[index % serviceBuckets.length],
        );

        employeeSeq += 1;
      }
    }
  }

  for (const department of departments) {
    const deptRows = await queryRaw<Array<{ id: string }>>(
      `SELECT "id" FROM "company_departments" WHERE "companyId" = $1 AND "name" = $2 LIMIT 1`,
      companyId,
      department.name,
    );
    const departmentId = deptRows[0]?.id;
    if (!departmentId) continue;

    await prisma.$executeRawUnsafe(
      `INSERT INTO "company_session_allocations" ("id","companyId","departmentId","allocatedSessions","usedSessions","createdAt","updatedAt")
       VALUES ($1,$2,$3,$4,$5,NOW(),NOW())
       ON CONFLICT ("companyId","departmentId") DO UPDATE SET
        "allocatedSessions"=EXCLUDED."allocatedSessions",
        "usedSessions"=EXCLUDED."usedSessions",
        "updatedAt"=NOW();`,
      randomUUID(),
      companyId,
      departmentId,
      department.allocated,
      department.used,
    );
  }

  const monthly = [
    { month: 'Oct', used: 88, allocated: 160, active: 120, stress: 72, utilization: 55 },
    { month: 'Nov', used: 102, allocated: 160, active: 128, stress: 73, utilization: 64 },
    { month: 'Dec', used: 118, allocated: 180, active: 140, stress: 74, utilization: 66 },
    { month: 'Jan', used: 126, allocated: 180, active: 148, stress: 72, utilization: 70 },
    { month: 'Feb', used: 132, allocated: 200, active: 156, stress: 75, utilization: 66 },
    { month: 'Mar', used: 142, allocated: 200, active: 166, stress: 78, utilization: 71 },
  ];

  for (const row of monthly) {
    await prisma.$executeRawUnsafe(
      `INSERT INTO "corporate_monthly_metrics" (
        "id","companyId","monthLabel","sessionsUsed","sessionsAllocated","activeUsers","stressScore","utilizationRate","createdAt","updatedAt"
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,NOW(),NOW())
      ON CONFLICT ("companyId","monthLabel") DO UPDATE SET
        "sessionsUsed"=EXCLUDED."sessionsUsed",
        "sessionsAllocated"=EXCLUDED."sessionsAllocated",
        "activeUsers"=EXCLUDED."activeUsers",
        "stressScore"=EXCLUDED."stressScore",
        "utilizationRate"=EXCLUDED."utilizationRate",
        "updatedAt"=NOW();`,
      randomUUID(),
      companyId,
      row.month,
      row.used,
      row.allocated,
      row.active,
      row.stress,
      row.utilization,
    );
  }

  const programs = [
    { title: 'Stress Management Program', duration: 6, enrolled: 132, completion: 76, status: 'ACTIVE' },
    { title: 'Digital Detox Week', duration: 2, enrolled: 88, completion: 62, status: 'ACTIVE' },
    { title: 'Sleep Improvement Program', duration: 4, enrolled: 74, completion: 68, status: 'ACTIVE' },
    { title: 'Burnout Recovery Program', duration: 8, enrolled: 43, completion: 54, status: 'ACTIVE' },
  ];

  for (const program of programs) {
    await prisma.$executeRawUnsafe(
      `INSERT INTO "corporate_programs" ("id","companyId","title","durationWeeks","employeesEnrolled","completionRate","status","createdAt","updatedAt")
       VALUES ($1,$2,$3,$4,$5,$6,$7,NOW(),NOW())
       ON CONFLICT DO NOTHING;`,
      randomUUID(),
      companyId,
      program.title,
      program.duration,
      program.enrolled,
      program.completion,
      program.status,
    );
  }

  const workshops = [
    { title: 'Mindfulness Workshop', provider: 'Dr. Naina Rao', department: 'Engineering', date: '2026-03-16', attendees: 62 },
    { title: 'Leadership Stress Training', provider: 'Dr. Rajeev Sinha', department: 'Operations', date: '2026-03-19', attendees: 36 },
    { title: 'Burnout Awareness', provider: 'Dr. Meera AI', department: 'Sales & Marketing', date: '2026-03-22', attendees: 29 },
    { title: 'Emotional Intelligence', provider: 'Dr. Kavya Iyer', department: 'Customer Support', date: '2026-03-27', attendees: 24 },
  ];

  for (const workshop of workshops) {
    await prisma.$executeRawUnsafe(
      `INSERT INTO "corporate_workshops" ("id","companyId","title","provider","department","workshopDate","attendees","status","createdAt","updatedAt")
       VALUES ($1,$2,$3,$4,$5,$6::date,$7,'SCHEDULED',NOW(),NOW())
       ON CONFLICT DO NOTHING;`,
      randomUUID(),
      companyId,
      workshop.title,
      workshop.provider,
      workshop.department,
      workshop.date,
      workshop.attendees,
    );
  }

  const campaigns = [
    { title: 'Q1 Burnout Awareness Drive', audience: 'All Employees', startDate: '2026-01-08', endDate: '2026-02-15', reachCount: 214, engagementRate: 68 },
    { title: 'Sleep Better March', audience: 'Engineering + Support', startDate: '2026-03-01', endDate: '2026-03-31', reachCount: 124, engagementRate: 61 },
    { title: 'Manager Mental Fitness Toolkit', audience: 'People Managers', startDate: '2026-02-05', endDate: '2026-03-20', reachCount: 56, engagementRate: 72 },
  ];

  for (const campaign of campaigns) {
    await prisma.$executeRawUnsafe(
      `INSERT INTO "corporate_campaigns" ("id","companyId","title","audience","startDate","endDate","reachCount","engagementRate","status","createdAt","updatedAt")
       VALUES ($1,$2,$3,$4,$5::date,$6::date,$7,$8,'ACTIVE',NOW(),NOW())
       ON CONFLICT DO NOTHING;`,
      randomUUID(),
      companyId,
      campaign.title,
      campaign.audience,
      campaign.startDate,
      campaign.endDate,
      campaign.reachCount,
      campaign.engagementRate,
    );
  }

  const reports = [
    { reportType: 'Wellness report', quarter: 'Q1-2026', format: 'PDF' },
    { reportType: 'Usage report', quarter: 'Q1-2026', format: 'XLSX' },
    { reportType: 'ROI report', quarter: 'Q1-2026', format: 'PDF' },
  ];

  for (const report of reports) {
    await prisma.$executeRawUnsafe(
      `INSERT INTO "corporate_reports" ("id","companyId","reportType","quarter","format","downloadUrl","generatedAt","createdAt")
       VALUES ($1,$2,$3,$4,$5,$6,NOW(),NOW())
       ON CONFLICT DO NOTHING;`,
      randomUUID(),
      companyId,
      report.reportType,
      report.quarter,
      report.format,
      `https://cdn.manas360.local/corporate-reports/${companyKey}/${report.reportType.toLowerCase().replace(/\s+/g, '-')}.${report.format.toLowerCase()}`,
    );
  }

  const paymentMethods = [
    { methodType: 'UPI', label: 'UPI - Primary', details: 'corp.payments@okbank', isPrimary: true },
    { methodType: 'CARD', label: 'Visa Corporate Card', details: 'Visa •••• 4242', isPrimary: false },
  ];

  const paymentMethodCountRows = await queryRaw<Array<{ count: bigint }>>(
    `SELECT COUNT(*)::bigint as count FROM "corporate_payment_methods" WHERE "companyId" = $1`,
    companyId,
  );

  if (toInt(paymentMethodCountRows[0]?.count || 0) === 0) {
    for (const method of paymentMethods) {
      await prisma.$executeRawUnsafe(
        `INSERT INTO "corporate_payment_methods" (
          "id","companyId","methodType","label","details","isPrimary","isActive","createdAt","updatedAt"
        ) VALUES ($1,$2,$3,$4,$5,$6,true,NOW(),NOW())`,
        randomUUID(),
        companyId,
        method.methodType,
        method.label,
        method.details,
        method.isPrimary,
      );
    }
  }

  const invoices = [
    {
      invoiceCode: 'INV-2026-003',
      title: 'March 2026 — Enterprise Plan',
      billingPeriod: '2026-03',
      amountPaise: 5223400,
      status: 'DUE',
      dueDate: '2026-03-15',
      paidDate: null,
    },
    {
      invoiceCode: 'INV-2026-002',
      title: 'February 2026 — Enterprise Plan',
      billingPeriod: '2026-02',
      amountPaise: 4984200,
      status: 'PAID',
      dueDate: '2026-02-15',
      paidDate: '2026-02-12',
    },
    {
      invoiceCode: 'INV-2026-001',
      title: 'January 2026 — Enterprise Plan',
      billingPeriod: '2026-01',
      amountPaise: 4745000,
      status: 'PAID',
      dueDate: '2026-01-15',
      paidDate: '2026-01-13',
    },
  ];

  for (const invoice of invoices) {
    await prisma.$executeRawUnsafe(
      `INSERT INTO "corporate_invoices" (
        "id","companyId","invoiceCode","title","billingPeriod","amountPaise","currency","status","dueDate","paidDate","createdAt","updatedAt"
      ) VALUES ($1,$2,$3,$4,$5,$6,'INR',$7,$8,$9,NOW(),NOW())
      ON CONFLICT ("companyId","invoiceCode") DO UPDATE SET
        "title" = EXCLUDED."title",
        "billingPeriod" = EXCLUDED."billingPeriod",
        "amountPaise" = EXCLUDED."amountPaise",
        "status" = EXCLUDED."status",
        "dueDate" = EXCLUDED."dueDate",
        "paidDate" = EXCLUDED."paidDate",
        "updatedAt" = NOW();`,
      randomUUID(),
      companyId,
      invoice.invoiceCode,
      invoice.title,
      invoice.billingPeriod,
      invoice.amountPaise,
      invoice.status,
      new Date(invoice.dueDate),
      invoice.paidDate ? new Date(invoice.paidDate) : null,
    );
  }

  return { companyId, companyName: company?.name || 'TechCorp India' };
};

const resolveCompany = async (companyKey?: string): Promise<{ companyId: string; companyName: string; companyKey: string }> => {
  const key = String(companyKey || DEFAULT_COMPANY_KEY).trim() || DEFAULT_COMPANY_KEY;
  const seeded = await seedCorporateDemoData(key);
  return { ...seeded, companyKey: key };
};

export const getCorporateDashboard = async (companyKey?: string) => {
  const { companyId, companyName, companyKey: resolvedCompanyKey } = await resolveCompany(companyKey);

  const [
    companyRows,
    employeeCountRows,
    activeRows,
    allocationRows,
    perDepartmentAllocationRows,
    departmentRows,
    riskRows,
    demandRows,
    monthlyRows,
    programRows,
    workshopRows,
    campaignRows,
    reportRows,
  ] = await Promise.all([
    queryRaw<Array<{ employeeLimit: number; sessionQuota: number; ssoProvider: string; privacyPolicy: string }>>(
      `SELECT "employeeLimit", "sessionQuota", "ssoProvider", "privacyPolicy" FROM "companies" WHERE "id" = $1 LIMIT 1`,
      companyId,
    ),
    queryRaw<Array<{ total: bigint }>>(
      `SELECT COUNT(*)::bigint as total FROM "company_employees" WHERE "companyId" = $1`,
      companyId,
    ),
    queryRaw<Array<{ active: bigint }>>(
      `SELECT COUNT(*)::bigint as active FROM "company_employees" WHERE "companyId" = $1 AND "sessionsUsed" > 0`,
      companyId,
    ),
    queryRaw<Array<{ allocated: bigint; used: bigint }>>(
      `SELECT COALESCE(SUM("allocatedSessions"),0)::bigint as allocated, COALESCE(SUM("usedSessions"),0)::bigint as used FROM "company_session_allocations" WHERE "companyId" = $1`,
      companyId,
    ),
    queryRaw<Array<{ department: string; allocated: number; used: number }>>(
      `SELECT d."name" as department, a."allocatedSessions" as allocated, a."usedSessions" as used
       FROM "company_session_allocations" a
       INNER JOIN "company_departments" d ON d."id" = a."departmentId"
       WHERE a."companyId" = $1
       ORDER BY d."name" ASC`,
      companyId,
    ),
    queryRaw<Array<{ department: string; enrolled: bigint; active: bigint; utilization: number; sessionsUsed: bigint; riskIndicator: string }>>(
      `SELECT
         d."name" as department,
         COUNT(e."id")::bigint as enrolled,
         COUNT(CASE WHEN e."sessionsUsed" > 0 THEN 1 END)::bigint as active,
         COALESCE(ROUND((COUNT(CASE WHEN e."sessionsUsed" > 0 THEN 1 END)::numeric / NULLIF(COUNT(e."id"),0)::numeric) * 100), 0)::int as utilization,
         COALESCE(SUM(e."sessionsUsed"),0)::bigint as "sessionsUsed",
         d."riskIndicator" as "riskIndicator"
       FROM "company_departments" d
       LEFT JOIN "company_employees" e ON e."departmentId" = d."id"
       WHERE d."companyId" = $1
       GROUP BY d."name", d."riskIndicator"
       ORDER BY enrolled DESC`,
      companyId,
    ),
    queryRaw<Array<{ riskBand: string; total: bigint }>>(
      `SELECT "riskBand", COUNT(*)::bigint as total FROM "company_employees" WHERE "companyId" = $1 GROUP BY "riskBand"`,
      companyId,
    ),
    queryRaw<Array<{ service: string; total: bigint }>>(
      `SELECT "preferredService" as service, COUNT(*)::bigint as total
       FROM "company_employees"
       WHERE "companyId" = $1
       GROUP BY "preferredService"
       ORDER BY total DESC`,
      companyId,
    ),
    queryRaw<Array<{ month: string; used: number; allocated: number; activeUsers: number; stressScore: number; utilizationRate: number }>>(
      `SELECT "monthLabel" as month, "sessionsUsed" as used, "sessionsAllocated" as allocated, "activeUsers", "stressScore", "utilizationRate"
       FROM "corporate_monthly_metrics"
       WHERE "companyId" = $1
       ORDER BY "createdAt" ASC`,
      companyId,
    ),
    queryRaw<Array<{ id: string; title: string; durationWeeks: number; employeesEnrolled: number; completionRate: number; status: string }>>(
      `SELECT "id", "title", "durationWeeks", "employeesEnrolled", "completionRate", "status"
       FROM "corporate_programs"
       WHERE "companyId" = $1
       ORDER BY "createdAt" DESC`,
      companyId,
    ),
    queryRaw<Array<{ id: string; title: string; provider: string; department: string; workshopDate: Date; attendees: number; status: string }>>(
      `SELECT "id", "title", "provider", "department", "workshopDate", "attendees", "status"
       FROM "corporate_workshops"
       WHERE "companyId" = $1
       ORDER BY "workshopDate" ASC`,
      companyId,
    ),
    queryRaw<Array<{ id: string; title: string; audience: string; startDate: Date; endDate: Date; reachCount: number; engagementRate: number; status: string }>>(
      `SELECT "id", "title", "audience", "startDate", "endDate", "reachCount", "engagementRate", "status"
       FROM "corporate_campaigns"
       WHERE "companyId" = $1
       ORDER BY "startDate" DESC`,
      companyId,
    ),
    queryRaw<Array<{ id: string; reportType: string; quarter: string; format: string; downloadUrl: string; generatedAt: Date }>>(
      `SELECT "id", "reportType", "quarter", "format", "downloadUrl", "generatedAt"
       FROM "corporate_reports"
       WHERE "companyId" = $1
       ORDER BY "generatedAt" DESC`,
      companyId,
    ),
  ]);

  const settings = companyRows[0] || { employeeLimit: 300, sessionQuota: 200, ssoProvider: 'Google Workspace', privacyPolicy: '' };
  const totalEmployees = toInt(employeeCountRows[0]?.total || 0);
  const activeUsers = toInt(activeRows[0]?.active || 0);
  const allocatedSessions = toInt(allocationRows[0]?.allocated || 0);
  const usedSessions = toInt(allocationRows[0]?.used || 0);
  const utilizationRate = allocatedSessions > 0 ? Math.round((usedSessions / allocatedSessions) * 100) : 0;

  const riskAgg = { high: 0, medium: 0, low: 0 };
  for (const row of riskRows) {
    const risk = normalizeRisk(row.riskBand);
    const value = toInt(row.total || 0);
    if (risk === 'HIGH') riskAgg.high += value;
    if (risk === 'MEDIUM') riskAgg.medium += value;
    if (risk === 'LOW') riskAgg.low += value;
  }

  const totalRisk = riskAgg.high + riskAgg.medium + riskAgg.low;
    const allocationMap = new Map<string, { allocated: number; used: number }>(
      perDepartmentAllocationRows.map((row) => [
        row.department,
        {
          allocated: toInt(row.allocated, 0),
          used: toInt(row.used, 0),
        },
      ]),
    );

  const burnoutRisk = {
    high: toPct(riskAgg.high, totalRisk),
    medium: toPct(riskAgg.medium, totalRisk),
    low: toPct(riskAgg.low, totalRisk),
  };

  const therapyDemand = demandRows.map((row) => ({
    service: row.service,
    usageCount: toInt(row.total || 0),
  }));

  const monthly = monthlyRows.map((row) => ({
    month: row.month,
    sessionsUsed: toInt(row.used, 0),
    sessionsAllocated: toInt(row.allocated, 0),
    activeUsers: toInt(row.activeUsers, 0),
    stressScore: toInt(row.stressScore, 0),
    utilizationRate: toInt(row.utilizationRate, 0),
  }));

  const latestMonth = monthly[monthly.length - 1] || {
    sessionsUsed: usedSessions,
    sessionsAllocated: allocatedSessions,
    activeUsers,
    stressScore: 78,
    utilizationRate,
  };

  const totalEnrolledPrograms = programRows.reduce((sum, row) => sum + toInt(row.employeesEnrolled, 0), 0);
  const avgProgramCompletion = programRows.length
    ? Math.round(programRows.reduce((sum, row) => sum + toInt(row.completionRate, 0), 0) / programRows.length)
    : 0;

  const costPerSession = 680;
  const programCost = 890000;
  const productivityGain = 2140000;
  const roiMultiple = Number((productivityGain / Math.max(programCost, 1)).toFixed(1));

  return {
    company: {
      id: companyId,
      companyKey: resolvedCompanyKey,
      name: companyName,
      employeeLimit: toInt(settings.employeeLimit, 300),
      sessionQuota: toInt(settings.sessionQuota, 200),
      ssoProvider: settings.ssoProvider,
      privacyPolicy: settings.privacyPolicy,
      supportedSsoProviders: ['Google Workspace', 'Microsoft Azure AD', 'Okta', 'SAML'],
    },
    summary: {
      enrolledEmployees: totalEmployees,
      enrollmentRate: toPct(totalEmployees, toInt(settings.employeeLimit, 300)),
      activeUsers,
      engagementRate: toPct(activeUsers, totalEmployees),
      sessionsAllocated: toInt(latestMonth.sessionsAllocated, allocatedSessions),
      sessionsUsed: toInt(latestMonth.sessionsUsed, usedSessions),
      utilizationRate: toInt(latestMonth.utilizationRate, utilizationRate),
      absenteeismReductionPct: 35,
      wellbeingScore: 78,
      averageSessionRating: 4.6,
      recommendationRatePct: 92,
      costPerSession,
    },
    burnoutRisk,
    stressTrend: monthly.map((row) => ({ month: row.month, score: row.stressScore })),
    utilizationTrend: monthly,
    therapyDemand,
    departmentBreakdown: departmentRows.map((row) => ({
      department: row.department,
      enrolled: toInt(row.enrolled || 0),
      active: toInt(row.active || 0),
      utilizationPct: toInt(row.utilization || 0),
      sessionsUsed: toInt(row.sessionsUsed || 0),
      riskIndicator: String(row.riskIndicator || 'MODERATE'),
    })),
    sessionAllocation: departmentRows.map((row) => ({
      department: row.department,
      allocated: allocationMap.get(row.department)?.allocated || 0,
      used: allocationMap.get(row.department)?.used || toInt(row.sessionsUsed || 0),
    })),
    programs: programRows.map((row) => ({
      id: row.id,
      title: row.title,
      durationWeeks: toInt(row.durationWeeks, 0),
      employeesEnrolled: toInt(row.employeesEnrolled, 0),
      completionRate: toInt(row.completionRate, 0),
      status: row.status,
    })),
    workshops: workshopRows.map((row) => ({
      id: row.id,
      title: row.title,
      provider: row.provider,
      department: row.department,
      date: row.workshopDate,
      attendees: toInt(row.attendees, 0),
      status: row.status,
    })),
    campaigns: campaignRows.map((row) => ({
      id: row.id,
      title: row.title,
      audience: row.audience,
      startDate: row.startDate,
      endDate: row.endDate,
      reachCount: toInt(row.reachCount, 0),
      engagementRate: toInt(row.engagementRate, 0),
      status: row.status,
    })),
    reports: reportRows.map((row) => ({
      id: row.id,
      type: row.reportType,
      quarter: row.quarter,
      format: row.format,
      downloadUrl: row.downloadUrl,
      generatedAt: row.generatedAt,
    })),
    roi: {
      programCost,
      productivityGain,
      retentionGain: 560000,
      healthcareSavings: 280000,
      roiMultiple,
    },
    privacy: {
      aggregateOnly: true,
      allowed: ['utilization', 'department usage', 'session counts', 'wellbeing score'],
      restricted: ['patient name', 'therapy notes', 'diagnosis', 'medication', 'therapist name'],
      note: settings.privacyPolicy,
    },
    engagement: {
      activeUsers,
      engagementRate: toPct(activeUsers, totalEmployees),
      programParticipation: totalEnrolledPrograms,
      workshopAttendance: workshopRows.reduce((sum, row) => sum + toInt(row.attendees, 0), 0),
      moodTrackingUsage: Math.max(0, Math.round(activeUsers * 0.68)),
    },
    aiInsights: [
      'Engineering stress rising 12% month-over-month. Recommend resilience workshop.',
      'Sales & Marketing has moderate stress with lower utilization. Recommend campaign nudges.',
      'High-risk cohort has stabilized after burnout recovery enrollments.',
    ],
    programsMeta: {
      totalPrograms: programRows.length,
      averageCompletionRate: avgProgramCompletion,
    },
  };
};

export const getCorporateCompanies = async () => {
  await seedCorporateDemoData('techcorp-india');
  await seedCorporateDemoData('global-fintech-labs');
  await seedCorporateDemoData('zen-retail-group');

  const rows = await queryRaw<Array<{ id: string; companyKey: string; name: string }>>(
    `SELECT "id", "companyKey", "name"
     FROM "companies"
     ORDER BY "name" ASC`,
  );

  return rows;
};

export const getCorporateSettings = async (companyKey?: string) => {
  const { companyId, companyName, companyKey: resolvedCompanyKey } = await resolveCompany(companyKey);
  const rows = await queryRaw<Array<{
    employeeLimit: number;
    sessionQuota: number;
    ssoProvider: string;
    privacyPolicy: string;
    supportEmail: string;
    supportPhone: string;
    supportSla: string;
  }>>(
    `SELECT "employeeLimit", "sessionQuota", "ssoProvider", "privacyPolicy", "supportEmail", "supportPhone", "supportSla"
     FROM "companies"
     WHERE "id" = $1
     LIMIT 1`,
    companyId,
  );

  const row = rows[0] || {
    employeeLimit: 300,
    sessionQuota: 200,
    ssoProvider: 'Google Workspace',
    privacyPolicy: '',
    supportEmail: 'enterprise-support@manas360.com',
    supportPhone: '+91-80-4000-3600',
    supportSla: 'Priority support within 4 business hours.',
  };
  return {
    companyId,
    companyKey: resolvedCompanyKey,
    companyName,
    employeeLimit: toInt(row.employeeLimit, 300),
    sessionQuota: toInt(row.sessionQuota, 200),
    ssoProvider: row.ssoProvider,
    privacyPolicy: row.privacyPolicy,
    supportEmail: row.supportEmail,
    supportPhone: row.supportPhone,
    supportSla: row.supportSla,
  };
};

export const updateCorporateSettings = async (payload: CorporateSettingsUpdate, companyKey?: string) => {
  const { companyId } = await resolveCompany(companyKey);
  const current = await getCorporateSettings(companyKey);

  const next = {
    companyName: String(payload.companyName || current.companyName).trim() || current.companyName,
    employeeLimit: Math.max(1, toInt(payload.employeeLimit ?? current.employeeLimit, current.employeeLimit)),
    sessionQuota: Math.max(1, toInt(payload.sessionQuota ?? current.sessionQuota, current.sessionQuota)),
    ssoProvider: String(payload.ssoProvider || current.ssoProvider).trim() || current.ssoProvider,
    privacyPolicy: String(payload.privacyPolicy || current.privacyPolicy).trim() || current.privacyPolicy,
    supportEmail: String(payload.supportEmail || current.supportEmail).trim() || current.supportEmail,
    supportPhone: String(payload.supportPhone || current.supportPhone).trim() || current.supportPhone,
    supportSla: String(payload.supportSla || current.supportSla).trim() || current.supportSla,
  };

  await prisma.$executeRawUnsafe(
    `UPDATE "companies"
     SET "name" = $2,
         "employeeLimit" = $3,
         "sessionQuota" = $4,
         "ssoProvider" = $5,
         "privacyPolicy" = $6,
         "supportEmail" = $7,
         "supportPhone" = $8,
         "supportSla" = $9,
         "updatedAt" = NOW()
     WHERE "id" = $1`,
    companyId,
    next.companyName,
    next.employeeLimit,
    next.sessionQuota,
    next.ssoProvider,
    next.privacyPolicy,
    next.supportEmail,
    next.supportPhone,
    next.supportSla,
  );

  return getCorporateSettings(companyKey);
};

const resolveDepartmentId = async (companyId: string, departmentName: string): Promise<string> => {
  const normalizedName = departmentName.trim();
  const rows = await queryRaw<Array<{ id: string }>>(
    `SELECT "id" FROM "company_departments" WHERE "companyId" = $1 AND "name" = $2 LIMIT 1`,
    companyId,
    normalizedName,
  );

  if (rows[0]?.id) return rows[0].id;

  const id = randomUUID();
  await prisma.$executeRawUnsafe(
    `INSERT INTO "company_departments" ("id","companyId","name","riskIndicator","createdAt","updatedAt")
     VALUES ($1,$2,$3,'MODERATE',NOW(),NOW())
     ON CONFLICT ("companyId","name") DO NOTHING;`,
    id,
    companyId,
    normalizedName,
  );

  const after = await queryRaw<Array<{ id: string }>>(
    `SELECT "id" FROM "company_departments" WHERE "companyId" = $1 AND "name" = $2 LIMIT 1`,
    companyId,
    normalizedName,
  );

  return after[0]?.id || id;
};

export const bulkUploadCorporateEmployees = async (rows: BulkEmployeeRow[], companyKey?: string) => {
  const { companyId } = await resolveCompany(companyKey);

  let created = 0;
  let updated = 0;
  const errors: Array<{ index: number; reason: string }> = [];

  for (let i = 0; i < rows.length; i += 1) {
    const row = rows[i];
    const name = String(row.name || '').trim();
    const email = String(row.email || '').trim().toLowerCase();
    const department = String(row.department || 'General').trim();

    if (!name || !email || !email.includes('@')) {
      errors.push({ index: i, reason: 'Invalid name or email' });
      continue;
    }

    const departmentId = await resolveDepartmentId(companyId, department);
    const existing = await queryRaw<Array<{ id: string }>>(
      `SELECT "id" FROM "company_employees" WHERE "companyId" = $1 AND "email" = $2 LIMIT 1`,
      companyId,
      email,
    );

    const id = existing[0]?.id || randomUUID();
    await prisma.$executeRawUnsafe(
      `INSERT INTO "company_employees" (
          "id","companyId","departmentId","employeeCode","name","email","location","managerName",
          "riskBand","phq9Score","gad7Score","sessionsUsed","engagementScore","preferredService","isActive","createdAt","updatedAt"
       ) VALUES (
          $1,$2,$3,$4,$5,$6,$7,$8,'LOW',4,4,0,45,'Stress therapy',true,NOW(),NOW()
       )
       ON CONFLICT ("companyId","email") DO UPDATE SET
          "departmentId"=EXCLUDED."departmentId",
          "employeeCode"=EXCLUDED."employeeCode",
          "name"=EXCLUDED."name",
          "location"=EXCLUDED."location",
          "managerName"=EXCLUDED."managerName",
          "updatedAt"=NOW();`,
      id,
      companyId,
      departmentId,
      String(row.employeeId || ''),
      name,
      email,
      String(row.location || 'Bengaluru'),
      String(row.manager || 'Unassigned'),
    );

    if (existing[0]?.id) {
      updated += 1;
    } else {
      created += 1;
    }
  }

  return {
    requested: rows.length,
    imported: created,
    updated,
    skipped: errors.length,
    errors,
    message: `${created} employees imported successfully${updated ? `, ${updated} updated` : ''}`,
  };
};

export const getCorporateReports = async (companyKey?: string) => {
  const { companyId } = await resolveCompany(companyKey);
  const rows = await queryRaw<Array<{ id: string; reportType: string; quarter: string; format: string; downloadUrl: string; generatedAt: Date }>>(
    `SELECT "id", "reportType", "quarter", "format", "downloadUrl", "generatedAt"
     FROM "corporate_reports"
     WHERE "companyId" = $1
     ORDER BY "generatedAt" DESC`,
    companyId,
  );

  return rows.map((row) => ({
    id: row.id,
    type: row.reportType,
    quarter: row.quarter,
    format: row.format,
    downloadUrl: row.downloadUrl,
    generatedAt: row.generatedAt,
  }));
};

export const getCorporatePrograms = async (companyKey?: string) => {
  const { companyId } = await resolveCompany(companyKey);
  const rows = await queryRaw<Array<{ id: string; title: string; durationWeeks: number; employeesEnrolled: number; completionRate: number; status: string }>>(
    `SELECT "id", "title", "durationWeeks", "employeesEnrolled", "completionRate", "status"
     FROM "corporate_programs"
     WHERE "companyId" = $1
     ORDER BY "createdAt" DESC`,
    companyId,
  );

  return rows;
};

export const getCorporateWorkshops = async (companyKey?: string) => {
  const { companyId } = await resolveCompany(companyKey);
  const rows = await queryRaw<Array<{ id: string; title: string; provider: string; department: string; workshopDate: Date; attendees: number; status: string }>>(
    `SELECT "id", "title", "provider", "department", "workshopDate", "attendees", "status"
     FROM "corporate_workshops"
     WHERE "companyId" = $1
     ORDER BY "workshopDate" ASC`,
    companyId,
  );

  return rows.map((row) => ({
    ...row,
    date: row.workshopDate,
  }));
};

export const getCorporateCampaigns = async (companyKey?: string) => {
  const { companyId } = await resolveCompany(companyKey);
  const rows = await queryRaw<Array<{ id: string; title: string; audience: string; startDate: Date; endDate: Date; reachCount: number; engagementRate: number; status: string }>>(
    `SELECT "id", "title", "audience", "startDate", "endDate", "reachCount", "engagementRate", "status"
     FROM "corporate_campaigns"
     WHERE "companyId" = $1
     ORDER BY "startDate" DESC`,
    companyId,
  );

  return rows;
};

export const getCorporateEmployees = async (
  companyKey?: string,
  filters?: { department?: string; query?: string; limit?: number; offset?: number },
) => {
  const { companyId } = await resolveCompany(companyKey);
  const limit = Math.min(200, Math.max(1, toInt(filters?.limit, 100)));
  const offset = Math.max(0, toInt(filters?.offset, 0));
  const query = String(filters?.query || '').trim();
  const department = String(filters?.department || '').trim();

  const rows = await queryRaw<Array<{
    id: string;
    employeeCode: string | null;
    name: string;
    email: string;
    department: string | null;
    location: string | null;
    managerName: string | null;
    riskBand: string;
    phq9Score: number;
    gad7Score: number;
    sessionsUsed: number;
    engagementScore: number;
    preferredService: string;
    isActive: boolean;
  }>>(
    `SELECT
       e."id",
       e."employeeCode",
       e."name",
       e."email",
       d."name" as department,
       e."location",
       e."managerName",
       e."riskBand",
       e."phq9Score",
       e."gad7Score",
       e."sessionsUsed",
       e."engagementScore",
       e."preferredService",
       e."isActive"
     FROM "company_employees" e
     LEFT JOIN "company_departments" d ON d."id" = e."departmentId"
     WHERE e."companyId" = $1
       AND ($2::text = '' OR LOWER(e."name") LIKE LOWER($2) OR LOWER(e."email") LIKE LOWER($2) OR LOWER(COALESCE(e."employeeCode", '')) LIKE LOWER($2))
       AND ($3::text = '' OR d."name" = $3)
     ORDER BY e."name" ASC
     LIMIT $4 OFFSET $5`,
    companyId,
    query ? `%${query}%` : '',
    department,
    limit,
    offset,
  );

  const totalRows = await queryRaw<Array<{ total: bigint }>>(
    `SELECT COUNT(*)::bigint as total
     FROM "company_employees" e
     LEFT JOIN "company_departments" d ON d."id" = e."departmentId"
     WHERE e."companyId" = $1
       AND ($2::text = '' OR LOWER(e."name") LIKE LOWER($2) OR LOWER(e."email") LIKE LOWER($2) OR LOWER(COALESCE(e."employeeCode", '')) LIKE LOWER($2))
       AND ($3::text = '' OR d."name" = $3)`,
    companyId,
    query ? `%${query}%` : '',
    department,
  );

  return {
    total: toInt(totalRows[0]?.total, 0),
    limit,
    offset,
    rows,
  };
};

export const getCorporateSessionAllocations = async (companyKey?: string) => {
  const { companyId } = await resolveCompany(companyKey);
  const rows = await queryRaw<Array<{ department: string; allocatedSessions: number; usedSessions: number }>>(
    `SELECT d."name" as department, a."allocatedSessions", a."usedSessions"
     FROM "company_session_allocations" a
     INNER JOIN "company_departments" d ON d."id" = a."departmentId"
     WHERE a."companyId" = $1
     ORDER BY d."name" ASC`,
    companyId,
  );

  const totals = rows.reduce(
    (acc, row) => {
      acc.allocated += toInt(row.allocatedSessions, 0);
      acc.used += toInt(row.usedSessions, 0);
      return acc;
    },
    { allocated: 0, used: 0 },
  );

  return {
    totals,
    utilizationRate: toPct(totals.used, totals.allocated),
    rows,
  };
};

export const updateCorporateSessionAllocations = async (allocations: SessionAllocationUpdate[], companyKey?: string) => {
  const { companyId } = await resolveCompany(companyKey);

  for (const item of allocations) {
    const department = String(item.department || '').trim();
    if (!department) continue;
    const departmentId = await resolveDepartmentId(companyId, department);
    const allocatedSessions = Math.max(0, toInt(item.allocatedSessions, 0));

    await prisma.$executeRawUnsafe(
      `INSERT INTO "company_session_allocations" (
        "id", "companyId", "departmentId", "allocatedSessions", "usedSessions", "createdAt", "updatedAt"
      ) VALUES (
        $1, $2, $3, $4, COALESCE((SELECT "usedSessions" FROM "company_session_allocations" WHERE "companyId" = $2 AND "departmentId" = $3), 0), NOW(), NOW()
      ) ON CONFLICT ("companyId","departmentId") DO UPDATE SET
        "allocatedSessions" = EXCLUDED."allocatedSessions",
        "updatedAt" = NOW();`,
      randomUUID(),
      companyId,
      departmentId,
      allocatedSessions,
    );
  }

  return getCorporateSessionAllocations(companyKey);
};

export const createCorporateProgram = async (payload: ProgramCreateInput, companyKey?: string) => {
  const { companyId } = await resolveCompany(companyKey);
  const title = String(payload.title || '').trim();
  if (!title) {
    throw new Error('Program title is required');
  }

  await prisma.$executeRawUnsafe(
    `INSERT INTO "corporate_programs" ("id","companyId","title","durationWeeks","employeesEnrolled","completionRate","status","createdAt","updatedAt")
     VALUES ($1,$2,$3,$4,$5,$6,$7,NOW(),NOW())`,
    randomUUID(),
    companyId,
    title,
    Math.max(1, toInt(payload.durationWeeks, 4)),
    Math.max(0, toInt(payload.employeesEnrolled, 0)),
    Math.max(0, Math.min(100, toInt(payload.completionRate, 0))),
    String(payload.status || 'ACTIVE').trim().toUpperCase() || 'ACTIVE',
  );

  return getCorporatePrograms(companyKey);
};

export const createCorporateWorkshop = async (payload: WorkshopCreateInput, companyKey?: string) => {
  const { companyId } = await resolveCompany(companyKey);
  const title = String(payload.title || '').trim();
  if (!title) {
    throw new Error('Workshop title is required');
  }

  await prisma.$executeRawUnsafe(
    `INSERT INTO "corporate_workshops" ("id","companyId","title","provider","department","workshopDate","attendees","status","createdAt","updatedAt")
     VALUES ($1,$2,$3,$4,$5,$6::date,$7,$8,NOW(),NOW())`,
    randomUUID(),
    companyId,
    title,
    String(payload.provider || 'Internal Wellness Team').trim(),
    String(payload.department || 'General').trim(),
    String(payload.date || new Date().toISOString().slice(0, 10)),
    Math.max(0, toInt(payload.attendees, 0)),
    String(payload.status || 'SCHEDULED').trim().toUpperCase() || 'SCHEDULED',
  );

  return getCorporateWorkshops(companyKey);
};

export const createCorporateCampaign = async (payload: CampaignCreateInput, companyKey?: string) => {
  const { companyId } = await resolveCompany(companyKey);
  const title = String(payload.title || '').trim();
  if (!title) {
    throw new Error('Campaign title is required');
  }

  await prisma.$executeRawUnsafe(
    `INSERT INTO "corporate_campaigns" ("id","companyId","title","audience","startDate","endDate","reachCount","engagementRate","status","createdAt","updatedAt")
     VALUES ($1,$2,$3,$4,$5::date,$6::date,$7,$8,$9,NOW(),NOW())`,
    randomUUID(),
    companyId,
    title,
    String(payload.audience || 'All Employees').trim(),
    String(payload.startDate || new Date().toISOString().slice(0, 10)),
    String(payload.endDate || new Date().toISOString().slice(0, 10)),
    Math.max(0, toInt(payload.reachCount, 0)),
    Math.max(0, Math.min(100, toInt(payload.engagementRate, 0))),
    String(payload.status || 'ACTIVE').trim().toUpperCase() || 'ACTIVE',
  );

  return getCorporateCampaigns(companyKey);
};

export const getCorporateRoi = async (companyKey?: string) => {
  await resolveCompany(companyKey);
  const programCost = 890000;
  const productivityGain = 2140000;
  const retentionGain = 560000;
  const healthcareSavings = 280000;

  return {
    programCost,
    productivityGain,
    retentionGain,
    healthcareSavings,
    roiMultiple: Number(((productivityGain + retentionGain + healthcareSavings) / Math.max(programCost, 1)).toFixed(1)),
  };
};

export const getCorporateInvoices = async (companyKey?: string) => {
  const { companyId } = await resolveCompany(companyKey);
  const rows = await queryRaw<Array<{
    id: string;
    invoiceCode: string;
    title: string;
    billingPeriod: string;
    amountPaise: number;
    currency: string;
    status: string;
    dueDate: Date | null;
    paidDate: Date | null;
  }>>(
    `SELECT "id", "invoiceCode", "title", "billingPeriod", "amountPaise", "currency", "status", "dueDate", "paidDate"
     FROM "corporate_invoices"
     WHERE "companyId" = $1
     ORDER BY "dueDate" DESC NULLS LAST, "createdAt" DESC`,
    companyId,
  );

  const summary = rows.reduce(
    (acc, row) => {
      if (String(row.status || '').toUpperCase() === 'PAID') {
        acc.paidAmountPaise += toInt(row.amountPaise, 0);
      } else {
        acc.pendingAmountPaise += toInt(row.amountPaise, 0);
      }
      return acc;
    },
    { paidAmountPaise: 0, pendingAmountPaise: 0 },
  );

  return {
    summary,
    rows: rows.map((row) => ({
      ...row,
      status: String(row.status || 'DUE').toUpperCase(),
    })),
  };
};

export const getCorporatePaymentMethods = async (companyKey?: string) => {
  const { companyId } = await resolveCompany(companyKey);
  const rows = await queryRaw<Array<{
    id: string;
    methodType: string;
    label: string;
    details: string;
    isPrimary: boolean;
    isActive: boolean;
    updatedAt: Date;
  }>>(
    `SELECT DISTINCT ON ("methodType", "details")
       "id", "methodType", "label", "details", "isPrimary", "isActive", "updatedAt"
     FROM "corporate_payment_methods"
     WHERE "companyId" = $1
     ORDER BY "methodType", "details", "updatedAt" DESC`,
    companyId,
  );

  return {
    rows: rows.sort((a, b) => {
      if (a.isPrimary && !b.isPrimary) return -1;
      if (!a.isPrimary && b.isPrimary) return 1;
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    }),
    primaryMethodId: rows.find((row) => row.isPrimary)?.id || null,
  };
};

export const createCorporatePaymentMethod = async (payload: PaymentMethodCreateInput, companyKey?: string) => {
  const { companyId } = await resolveCompany(companyKey);
  const methodType = String(payload.methodType || 'OTHER').trim().toUpperCase() || 'OTHER';
  const label = String(payload.label || '').trim();
  const details = String(payload.details || '').trim();
  const isPrimary = Boolean(payload.isPrimary);

  if (!label || !details) {
    throw new Error('label and details are required');
  }

  if (isPrimary) {
    await prisma.$executeRawUnsafe(
      `UPDATE "corporate_payment_methods"
       SET "isPrimary" = false, "updatedAt" = NOW()
       WHERE "companyId" = $1`,
      companyId,
    );
  }

  await prisma.$executeRawUnsafe(
    `INSERT INTO "corporate_payment_methods" (
      "id","companyId","methodType","label","details","isPrimary","isActive","createdAt","updatedAt"
    ) VALUES ($1,$2,$3,$4,$5,$6,true,NOW(),NOW())`,
    randomUUID(),
    companyId,
    methodType,
    label,
    details,
    isPrimary,
  );

  return getCorporatePaymentMethods(companyKey);
};

export const updateCorporatePaymentMethod = async (
  paymentMethodId: string,
  payload: PaymentMethodUpdateInput,
  companyKey?: string,
) => {
  const { companyId } = await resolveCompany(companyKey);
  const methodId = String(paymentMethodId || '').trim();
  if (!methodId) {
    throw new Error('paymentMethodId is required');
  }

  const rows = await queryRaw<Array<{ id: string; label: string; details: string; isPrimary: boolean; isActive: boolean }>>(
    `SELECT "id", "label", "details", "isPrimary", "isActive"
     FROM "corporate_payment_methods"
     WHERE "id" = $1 AND "companyId" = $2
     LIMIT 1`,
    methodId,
    companyId,
  );

  const current = rows[0];
  if (!current) {
    throw new Error('Payment method not found');
  }

  const isPrimary = payload.isPrimary === undefined ? current.isPrimary : Boolean(payload.isPrimary);
  if (isPrimary) {
    await prisma.$executeRawUnsafe(
      `UPDATE "corporate_payment_methods"
       SET "isPrimary" = false, "updatedAt" = NOW()
       WHERE "companyId" = $1`,
      companyId,
    );
  }

  await prisma.$executeRawUnsafe(
    `UPDATE "corporate_payment_methods"
     SET "label" = $3,
         "details" = $4,
         "isPrimary" = $5,
         "isActive" = $6,
         "updatedAt" = NOW()
     WHERE "id" = $1 AND "companyId" = $2`,
    methodId,
    companyId,
    String(payload.label ?? current.label).trim() || current.label,
    String(payload.details ?? current.details).trim() || current.details,
    isPrimary,
    payload.isActive === undefined ? current.isActive : Boolean(payload.isActive),
  );

  return getCorporatePaymentMethods(companyKey);
};

export const submitCorporateDemoRequest = async (payload: CorporateDemoRequestInput) => {
  await ensureCorporateTables();

  const companyName = String(payload.companyName || '').trim();
  const workEmail = normalizeEmail(payload.workEmail);

  if (!companyName) {
    throw new AppError('companyName is required', 400);
  }

  if (!workEmail || !workEmail.includes('@')) {
    throw new AppError('A valid workEmail is required', 400);
  }

  const companyKey = sanitizeKeyPart(companyName);
  const requestId = randomUUID();

  await prisma.$executeRawUnsafe(
    `INSERT INTO "corporate_demo_requests" (
      "id","companyName","companyKey","workEmail","companySize","industry","country","contactName","phone","status","createdAt","updatedAt"
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,'NEW',NOW(),NOW())`,
    requestId,
    companyName,
    companyKey || null,
    workEmail,
    String(payload.companySize || '').trim() || null,
    String(payload.industry || '').trim() || null,
    String(payload.country || '').trim() || null,
    String(payload.contactName || '').trim() || null,
    String(payload.phone || '').trim() || null,
  );

  return {
    requestId,
    companyName,
    workEmail,
    status: 'NEW',
  };
};

export const createCorporateAccount = async (payload: CorporateAccountCreateInput) => {
  await ensureCorporateTables();

  const companyName = String(payload.companyName || '').trim();
  const workEmail = normalizeEmail(payload.workEmail);
  const password = String(payload.password || '');
  const contactName = String(payload.contactName || '').trim();

  if (!companyName) {
    throw new AppError('companyName is required', 400);
  }

  if (!workEmail || !workEmail.includes('@')) {
    throw new AppError('A valid workEmail is required', 400);
  }

  if (password.length < 8) {
    throw new AppError('Password must be at least 8 characters long', 400);
  }

  const existingUser = await prisma.user.findUnique({ where: { email: workEmail } });
  if (existingUser && !existingUser.isDeleted) {
    throw new AppError('Work email is already registered', 409);
  }

  const companyKey = await resolveUniqueCompanyKey(companyName);
  const companyDomain = getDomainFromEmail(workEmail);
  const companyId = randomUUID();
  const defaultEmployeeLimit = Math.max(50, toInt(payload.companySize, 300));
  const defaultSessionQuota = Math.max(25, Math.round(defaultEmployeeLimit * 0.65));

  await prisma.$executeRawUnsafe(
    `INSERT INTO "companies" (
      "id","companyKey","domain","name","employeeLimit","sessionQuota","ssoProvider","privacyPolicy","supportEmail","supportPhone","supportSla","createdAt","updatedAt"
    ) VALUES ($1,$2,$3,$4,$5,$6,'Google Workspace',$7,$8,$9,$10,NOW(),NOW())`,
    companyId,
    companyKey,
    companyDomain,
    companyName,
    defaultEmployeeLimit,
    defaultSessionQuota,
    'Only aggregate analytics are visible to HR. Individual therapy notes, diagnosis, medications, and provider details are never shown.',
    'enterprise-support@manas360.com',
    '+91-80-4000-3600',
    'Priority support within 4 business hours.',
  );

  const passwordHash = await hashPassword(password);
  const nameParts = contactName ? contactName.split(/\s+/).filter(Boolean) : [];
  const firstName = nameParts[0] || companyName;
  const lastName = nameParts.slice(1).join(' ');

  const corporateMember = await prisma.user.create({
    data: {
      email: workEmail,
      passwordHash,
      provider: 'LOCAL',
      role: 'PATIENT',
      firstName,
      lastName,
      name: contactName || companyName,
      emailVerified: true,
    },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
    },
  });

  await prisma.$executeRawUnsafe(
    `UPDATE "users"
     SET company_key = $2,
         is_company_admin = false,
         "updatedAt" = NOW()
     WHERE id = $1`,
    corporateMember.id,
    companyKey,
  );

  const corporateMemberPayload = {
    id: corporateMember.id,
    email: corporateMember.email,
    firstName: corporateMember.firstName,
    lastName: corporateMember.lastName,
    isCompanyAdmin: false,
  };

  return {
    company: {
      id: companyId,
      companyKey,
      name: companyName,
      employeeLimit: defaultEmployeeLimit,
      sessionQuota: defaultSessionQuota,
      industry: String(payload.industry || '').trim() || null,
      country: String(payload.country || '').trim() || null,
    },
    corporateMember: corporateMemberPayload,
    // Backward compatibility for older consumers still reading `corporateAdmin`.
    corporateAdmin: corporateMemberPayload,
  };
};
