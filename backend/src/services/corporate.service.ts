import { randomUUID } from 'crypto';
import { Prisma } from '@prisma/client';
import { prisma } from '../config/db';
import { redis } from '../config/redis';
import { AppError } from '../middleware/error.middleware';
import { hashPassword, generateNumericOtp, hashOtp, verifyOtp } from '../utils/hash';
import { send2FactorOtp } from './otp.service';
import { env } from '../config/env';
import { createQrCode } from './admin-qr.service';

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
  companySize?: string;
  industry?: string;
  country?: string;
  contactName?: string;
  phone?: string;
  email?: string;
};

type CorporateOtpRequestInput = {
  companyName?: string;
  phone?: string;
  companySize?: string;
  industry?: string;
  country?: string;
  contactName?: string;
  email?: string;
};

type CorporateAccountCreateInput = {
  companyName?: string;
  phone?: string;
  otp?: string;
  companySize?: string;
  industry?: string;
  country?: string;
  contactName?: string;
  email?: string;
};

type CorporateEapQrCreateInput = {
  companyKey?: string;
  location?: string;
  destinationUrl?: string;
  isActive?: boolean;
};

const DEFAULT_COMPANY_KEY = 'techcorp-india';
const CORPORATE_CACHE_VERSION_TTL_SECONDS = 60 * 60 * 24 * 30;
const CORPORATE_CACHE_TTL = {
  dashboard: 45,
  settings: 120,
  reports: 90,
  programs: 90,
  workshops: 60,
  campaigns: 90,
  employees: 45,
  sessionAllocations: 60,
  roi: 300,
} as const;
// See note in psychiatrist.service.ts — use typeof prisma for compatibility
type DbClient = typeof prisma;

const corporateDashboardVersionKey = (companyKey: string) => `corporate:dashboard:version:${companyKey}`;

const getCorporateDashboardVersion = async (companyKey: string): Promise<number> => {
  try {
    const raw = await redis.get(corporateDashboardVersionKey(companyKey));
    const parsed = Number(raw);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
  } catch {
    return 1;
  }
};

const getCorporateDashboardCacheKey = async (scope: string, companyKey: string, query: unknown = ''): Promise<string> => {
  const version = await getCorporateDashboardVersion(companyKey);
  return `corporate:dashboard:v${version}:${scope}:${companyKey}:${JSON.stringify(query)}`;
};

const readCache = async <T>(key: string): Promise<T | null> => {
  try {
    const raw = await redis.get(key);
    if (!raw) return null;
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
};

const writeCache = async (key: string, value: unknown, ttl: number): Promise<void> => {
  try {
    await redis.set(key, JSON.stringify(value), ttl);
  } catch {
    // Best-effort cache write.
  }
};

const invalidateCorporateDashboardCache = async (companyKey?: string): Promise<void> => {
  const resolvedCompanyKey = String(companyKey || DEFAULT_COMPANY_KEY).trim() || DEFAULT_COMPANY_KEY;
  try {
    const version = await getCorporateDashboardVersion(resolvedCompanyKey);
    await redis.set(corporateDashboardVersionKey(resolvedCompanyKey), String(version + 1), CORPORATE_CACHE_VERSION_TTL_SECONDS);
  } catch {
    // Best-effort invalidation.
  }
};

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

const resolveUniqueCompanyKey = async (companyName: string, db: DbClient = prisma): Promise<string> => {
  const base = sanitizeKeyPart(companyName) || `company-${randomUUID().slice(0, 8)}`;

  const existing = await db.$queryRaw<Array<{ companyKey: string }>>`SELECT "companyKey" FROM "companies" WHERE "companyKey" LIKE ${`${base}%`}`;

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

const normalizeQrSegment = (value: string, fallback = 'standee'): string => {
  const normalized = String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

  return normalized || fallback;
};

const isMissingQrInfraError = (error: unknown): boolean => {
  const message = String((error as any)?.message || '').toLowerCase();
  const code = String((error as any)?.code || '').toUpperCase();

  return (
    code === 'P2021'
    || code === 'P2022'
    || code === 'P2010'
    || message.includes('qr_scans')
    || message.includes('qr_conversions')
  );
};

export const ensureCorporateTables = async (): Promise<void> => {
  await prisma.$executeRaw`ALTER TABLE "users" ADD COLUMN IF NOT EXISTS company_key text;`;
  await prisma.$executeRaw`ALTER TABLE "users" ADD COLUMN IF NOT EXISTS is_company_admin boolean DEFAULT false;`;

  await prisma.$executeRaw`
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
  `;

  await prisma.$executeRaw`
    ALTER TABLE "companies" ADD COLUMN IF NOT EXISTS "domain" TEXT;
  `;

  await prisma.$executeRaw`
    ALTER TABLE "companies" ADD COLUMN IF NOT EXISTS "supportEmail" TEXT NOT NULL DEFAULT 'enterprise-support@manas360.com';
  `;

  await prisma.$executeRaw`
    ALTER TABLE "companies" ADD COLUMN IF NOT EXISTS "supportPhone" TEXT NOT NULL DEFAULT '+91-80-4000-3600';
  `;

  await prisma.$executeRaw`
    ALTER TABLE "companies" ADD COLUMN IF NOT EXISTS "supportSla" TEXT NOT NULL DEFAULT 'Priority support within 4 business hours.';
  `;

  await prisma.$executeRaw`
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
  `;

  await prisma.$executeRaw`
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
  `;

  await prisma.$executeRaw`
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
  `;

  await prisma.$executeRaw`
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
  `;

  await prisma.$executeRaw`
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
  `;

  await prisma.$executeRaw`
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
  `;

  await prisma.$executeRaw`
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
  `;

  await prisma.$executeRaw`
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
  `;

  await prisma.$executeRaw`
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
  `;

  await prisma.$executeRaw`
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
  `;

  await prisma.$executeRaw`
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
  `;

  await prisma.$executeRaw`
    CREATE INDEX IF NOT EXISTS "corporate_demo_requests_workEmail_idx" ON "corporate_demo_requests"("workEmail");
  `;

  await prisma.$executeRaw`
    CREATE TABLE IF NOT EXISTS "corporate_otp_requests" (
      "id" TEXT PRIMARY KEY,
      "phone" TEXT NOT NULL,
      "otpHash" TEXT NOT NULL,
      "companyName" TEXT NOT NULL,
      "companySize" TEXT,
      "industry" TEXT,
      "country" TEXT,
      "contactName" TEXT,
      "email" TEXT,
      "status" TEXT NOT NULL DEFAULT 'PENDING',
      "expiresAt" TIMESTAMP(3) NOT NULL,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `;

  await prisma.$executeRaw`
    CREATE INDEX IF NOT EXISTS "corporate_otp_requests_phone_status_idx" ON "corporate_otp_requests"("phone", "status");
  `;

  await prisma.$executeRaw`
    CREATE INDEX IF NOT EXISTS "corporate_otp_requests_phone_status_created_idx" ON "corporate_otp_requests"("phone", "status", "createdAt" DESC);
  `;

  await prisma.$executeRaw`
    CREATE INDEX IF NOT EXISTS "corporate_otp_requests_status_expiresAt_idx" ON "corporate_otp_requests"("status", "expiresAt");
  `;
};

let corporateSchemaInitPromise: Promise<void> | null = null;

const ensureCorporateSchemaReady = async (): Promise<void> => {
  if (!corporateSchemaInitPromise) {
    corporateSchemaInitPromise = ensureCorporateTables().catch((error) => {
      corporateSchemaInitPromise = null;
      throw error;
    });
  }

  await corporateSchemaInitPromise;
};

const getCompanyByKey = async (companyKey = DEFAULT_COMPANY_KEY, db: DbClient = prisma): Promise<{ id: string; name: string } | null> => {
  const rows = await db.$queryRaw<Array<{ id: string; name: string }>>`SELECT "id", "name" FROM "companies" WHERE "companyKey" = ${companyKey} LIMIT 1`;
  return rows[0] || null;
};

const resolveCompany = async (companyKey?: string, db: DbClient = prisma): Promise<{ companyId: string; companyName: string; companyKey: string }> => {
  await ensureCorporateSchemaReady();

  const key = String(companyKey || DEFAULT_COMPANY_KEY).trim() || DEFAULT_COMPANY_KEY;
  const company = await getCompanyByKey(key, db);
  return { companyId: company?.id || '', companyName: company?.name || 'TechCorp India', companyKey: key };
};

export const getCorporateDashboard = async (companyKey?: string) => {
  const cacheCompanyKey = String(companyKey || DEFAULT_COMPANY_KEY).trim() || DEFAULT_COMPANY_KEY;
  const cacheKey = await getCorporateDashboardCacheKey('overview', cacheCompanyKey);
  const cached = await readCache<any>(cacheKey);
  if (cached) return cached;

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
    prisma.$queryRaw<Array<{ employeeLimit: number; sessionQuota: number; ssoProvider: string; privacyPolicy: string }>>`SELECT "employeeLimit", "sessionQuota", "ssoProvider", "privacyPolicy" FROM "companies" WHERE "id" = ${companyId} LIMIT 1`,
    prisma.$queryRaw<Array<{ total: bigint }>>`SELECT COUNT(*)::bigint as total FROM "company_employees" WHERE "companyId" = ${companyId}`,
    prisma.$queryRaw<Array<{ active: bigint }>>`SELECT COUNT(*)::bigint as active FROM "company_employees" WHERE "companyId" = ${companyId} AND "sessionsUsed" > 0`,
    prisma.$queryRaw<Array<{ allocated: bigint; used: bigint }>>`SELECT COALESCE(SUM("allocatedSessions"),0)::bigint as allocated, COALESCE(SUM("usedSessions"),0)::bigint as used FROM "company_session_allocations" WHERE "companyId" = ${companyId}`,
    prisma.$queryRaw<Array<{ department: string; allocated: number; used: number }>>`SELECT d."name" as department, a."allocatedSessions" as allocated, a."usedSessions" as used
       FROM "company_session_allocations" a
       INNER JOIN "company_departments" d ON d."id" = a."departmentId"
       WHERE a."companyId" = ${companyId}
       ORDER BY d."name" ASC`,
    prisma.$queryRaw<Array<{ department: string; enrolled: bigint; active: bigint; utilization: number; sessionsUsed: bigint; riskIndicator: string }>>`SELECT
         d."name" as department,
         COUNT(e."id")::bigint as enrolled,
         COUNT(CASE WHEN e."sessionsUsed" > 0 THEN 1 END)::bigint as active,
         COALESCE(ROUND((COUNT(CASE WHEN e."sessionsUsed" > 0 THEN 1 END)::numeric / NULLIF(COUNT(e."id"),0)::numeric) * 100), 0)::int as utilization,
         COALESCE(SUM(e."sessionsUsed"),0)::bigint as "sessionsUsed",
         d."riskIndicator" as "riskIndicator"
       FROM "company_departments" d
       LEFT JOIN "company_employees" e ON e."departmentId" = d."id"
       WHERE d."companyId" = ${companyId}
       GROUP BY d."name", d."riskIndicator"
       ORDER BY enrolled DESC`,
    prisma.$queryRaw<Array<{ riskBand: string; total: bigint }>>`SELECT "riskBand", COUNT(*)::bigint as total FROM "company_employees" WHERE "companyId" = ${companyId} GROUP BY "riskBand"`,
    prisma.$queryRaw<Array<{ service: string; total: bigint }>>`SELECT "preferredService" as service, COUNT(*)::bigint as total
       FROM "company_employees"
       WHERE "companyId" = ${companyId}
       GROUP BY "preferredService"
       ORDER BY total DESC`,
    prisma.$queryRaw<Array<{ month: string; used: number; allocated: number; activeUsers: number; stressScore: number; utilizationRate: number }>>`SELECT "monthLabel" as month, "sessionsUsed" as used, "sessionsAllocated" as allocated, "activeUsers", "stressScore", "utilizationRate"
       FROM "corporate_monthly_metrics"
       WHERE "companyId" = ${companyId}
       ORDER BY "createdAt" ASC`,
    prisma.$queryRaw<Array<{ id: string; title: string; durationWeeks: number; employeesEnrolled: number; completionRate: number; status: string }>>`SELECT "id", "title", "durationWeeks", "employeesEnrolled", "completionRate", "status"
       FROM "corporate_programs"
       WHERE "companyId" = ${companyId}
       ORDER BY "createdAt" DESC`,
    prisma.$queryRaw<Array<{ id: string; title: string; provider: string; department: string; workshopDate: Date; attendees: number; status: string }>>`SELECT "id", "title", "provider", "department", "workshopDate", "attendees", "status"
       FROM "corporate_workshops"
       WHERE "companyId" = ${companyId}
       ORDER BY "workshopDate" ASC`,
    prisma.$queryRaw<Array<{ id: string; title: string; audience: string; startDate: Date; endDate: Date; reachCount: number; engagementRate: number; status: string }>>`SELECT "id", "title", "audience", "startDate", "endDate", "reachCount", "engagementRate", "status"
       FROM "corporate_campaigns"
       WHERE "companyId" = ${companyId}
       ORDER BY "startDate" DESC`,
    prisma.$queryRaw<Array<{ id: string; reportType: string; quarter: string; format: string; downloadUrl: string; generatedAt: Date }>>`SELECT "id", "reportType", "quarter", "format", "downloadUrl", "generatedAt"
       FROM "corporate_reports"
       WHERE "companyId" = ${companyId}
       ORDER BY "generatedAt" DESC`,
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

  const payload = {
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

  await writeCache(cacheKey, payload, CORPORATE_CACHE_TTL.dashboard);
  return payload;
};

export const getCorporateCompanies = async () => {
  const rows = await prisma.$queryRaw<Array<{ id: string; companyKey: string; name: string }>>`SELECT "id", "companyKey", "name"
     FROM "companies"
     ORDER BY "name" ASC`;

  return rows;
};

export const getCorporateSettings = async (companyKey?: string) => {
  const cacheCompanyKey = String(companyKey || DEFAULT_COMPANY_KEY).trim() || DEFAULT_COMPANY_KEY;
  const cacheKey = await getCorporateDashboardCacheKey('settings', cacheCompanyKey);
  const cached = await readCache<any>(cacheKey);
  if (cached) return cached;

  const { companyId, companyName, companyKey: resolvedCompanyKey } = await resolveCompany(companyKey);
  const rows = await prisma.$queryRaw<Array<{
    employeeLimit: number;
    sessionQuota: number;
    ssoProvider: string;
    privacyPolicy: string;
    supportEmail: string;
    supportPhone: string;
    supportSla: string;
  }>>`SELECT "employeeLimit", "sessionQuota", "ssoProvider", "privacyPolicy", "supportEmail", "supportPhone", "supportSla"
     FROM "companies"
     WHERE "id" = ${companyId}
     LIMIT 1`;

  const row = rows[0] || {
    employeeLimit: 300,
    sessionQuota: 200,
    ssoProvider: 'Google Workspace',
    privacyPolicy: '',
    supportEmail: 'enterprise-support@manas360.com',
    supportPhone: '+91-80-4000-3600',
    supportSla: 'Priority support within 4 business hours.',
  };
  const payload = {
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

  await writeCache(cacheKey, payload, CORPORATE_CACHE_TTL.settings);
  return payload;
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

  await prisma.$executeRaw`UPDATE "companies"
     SET "name" = ${next.companyName},
         "employeeLimit" = ${next.employeeLimit},
         "sessionQuota" = ${next.sessionQuota},
         "ssoProvider" = ${next.ssoProvider},
         "privacyPolicy" = ${next.privacyPolicy},
         "supportEmail" = ${next.supportEmail},
         "supportPhone" = ${next.supportPhone},
         "supportSla" = ${next.supportSla},
         "updatedAt" = NOW()
     WHERE "id" = ${companyId}`;

  await invalidateCorporateDashboardCache(companyKey);

  return getCorporateSettings(companyKey);
};

const resolveDepartmentId = async (companyId: string, departmentName: string, db: DbClient = prisma): Promise<string> => {
  const normalizedName = departmentName.trim();
  const rows = await db.$queryRaw<Array<{ id: string }>>`SELECT "id" FROM "company_departments" WHERE "companyId" = ${companyId} AND "name" = ${normalizedName} LIMIT 1`;

  if (rows[0]?.id) return rows[0].id;

  const id = randomUUID();
    await db.$executeRaw`INSERT INTO "company_departments" ("id","companyId","name","riskIndicator","createdAt","updatedAt")
     VALUES (${id},${companyId},${normalizedName},'MODERATE',NOW(),NOW())
     ON CONFLICT ("companyId","name") DO NOTHING;`;

    const after = await db.$queryRaw<Array<{ id: string }>>`SELECT "id" FROM "company_departments" WHERE "companyId" = ${companyId} AND "name" = ${normalizedName} LIMIT 1`;

  return after[0]?.id || id;
};

export const bulkUploadCorporateEmployees = async (rows: BulkEmployeeRow[], companyKey?: string) => {
  const { companyId } = await resolveCompany(companyKey);

  let created = 0;
  let updated = 0;
  const errors: Array<{ index: number; reason: string }> = [];

  await prisma.$transaction(async (tx) => {
    for (let i = 0; i < rows.length; i += 1) {
      const row = rows[i];
      const name = String(row.name || '').trim();
      const email = String(row.email || '').trim().toLowerCase();
      const department = String(row.department || 'General').trim();

      if (!name || !email || !email.includes('@')) {
        errors.push({ index: i, reason: 'Invalid name or email' });
        continue;
      }

      const departmentId = await resolveDepartmentId(companyId, department, tx);
      const existing = await tx.$queryRaw<Array<{ id: string }>>`SELECT "id" FROM "company_employees" WHERE "companyId" = ${companyId} AND "email" = ${email} LIMIT 1`;

      const id = existing[0]?.id || randomUUID();
      await tx.$executeRaw`INSERT INTO "company_employees" (
          "id","companyId","departmentId","employeeCode","name","email","location","managerName",
          "riskBand","phq9Score","gad7Score","sessionsUsed","engagementScore","preferredService","isActive","createdAt","updatedAt"
       ) VALUES (
          ${id},${companyId},${departmentId},${String(row.employeeId || '')},${name},${email},${String(row.location || 'Bengaluru')},${String(row.manager || 'Unassigned')},'LOW',4,4,0,45,'Stress therapy',true,NOW(),NOW()
       )
       ON CONFLICT ("companyId","email") DO UPDATE SET
          "departmentId"=EXCLUDED."departmentId",
          "employeeCode"=EXCLUDED."employeeCode",
          "name"=EXCLUDED."name",
          "location"=EXCLUDED."location",
          "managerName"=EXCLUDED."managerName",
          "updatedAt"=NOW();`;

      if (existing[0]?.id) {
        updated += 1;
      } else {
        created += 1;
      }
    }
  });

  const payload = {
    requested: rows.length,
    imported: created,
    updated,
    skipped: errors.length,
    errors,
    message: `${created} employees imported successfully${updated ? `, ${updated} updated` : ''}`,
  };

  await invalidateCorporateDashboardCache(companyKey);
  return payload;
};

export const getCorporateReports = async (companyKey?: string) => {
  const cacheCompanyKey = String(companyKey || DEFAULT_COMPANY_KEY).trim() || DEFAULT_COMPANY_KEY;
  const cacheKey = await getCorporateDashboardCacheKey('reports', cacheCompanyKey);
  const cached = await readCache<any>(cacheKey);
  if (cached) return cached;

  const { companyId } = await resolveCompany(companyKey);
  const rows = await prisma.$queryRaw<Array<{ id: string; reportType: string; quarter: string; format: string; downloadUrl: string; generatedAt: Date }>>`SELECT "id", "reportType", "quarter", "format", "downloadUrl", "generatedAt"
     FROM "corporate_reports"
     WHERE "companyId" = ${companyId}
     ORDER BY "generatedAt" DESC`;

  const payload = rows.map((row) => ({
    id: row.id,
    type: row.reportType,
    quarter: row.quarter,
    format: row.format,
    downloadUrl: row.downloadUrl,
    generatedAt: row.generatedAt,
  }));

  await writeCache(cacheKey, payload, CORPORATE_CACHE_TTL.reports);
  return payload;
};

export const getCorporatePrograms = async (companyKey?: string) => {
  const cacheCompanyKey = String(companyKey || DEFAULT_COMPANY_KEY).trim() || DEFAULT_COMPANY_KEY;
  const cacheKey = await getCorporateDashboardCacheKey('programs', cacheCompanyKey);
  const cached = await readCache<any>(cacheKey);
  if (cached) return cached;

  const { companyId } = await resolveCompany(companyKey);
  const rows = await prisma.$queryRaw<Array<{ id: string; title: string; durationWeeks: number; employeesEnrolled: number; completionRate: number; status: string }>>`SELECT "id", "title", "durationWeeks", "employeesEnrolled", "completionRate", "status"
     FROM "corporate_programs"
     WHERE "companyId" = ${companyId}
     ORDER BY "createdAt" DESC`;

  await writeCache(cacheKey, rows, CORPORATE_CACHE_TTL.programs);
  return rows;
};

export const getCorporateWorkshops = async (companyKey?: string) => {
  const cacheCompanyKey = String(companyKey || DEFAULT_COMPANY_KEY).trim() || DEFAULT_COMPANY_KEY;
  const cacheKey = await getCorporateDashboardCacheKey('workshops', cacheCompanyKey);
  const cached = await readCache<any>(cacheKey);
  if (cached) return cached;

  const { companyId } = await resolveCompany(companyKey);
  const rows = await prisma.$queryRaw<Array<{ id: string; title: string; provider: string; department: string; workshopDate: Date; attendees: number; status: string }>>`SELECT "id", "title", "provider", "department", "workshopDate", "attendees", "status"
     FROM "corporate_workshops"
     WHERE "companyId" = ${companyId}
     ORDER BY "workshopDate" ASC`;

  const payload = rows.map((row) => ({
    ...row,
    date: row.workshopDate,
  }));

  await writeCache(cacheKey, payload, CORPORATE_CACHE_TTL.workshops);
  return payload;
};

export const getCorporateCampaigns = async (companyKey?: string) => {
  const cacheCompanyKey = String(companyKey || DEFAULT_COMPANY_KEY).trim() || DEFAULT_COMPANY_KEY;
  const cacheKey = await getCorporateDashboardCacheKey('campaigns', cacheCompanyKey);
  const cached = await readCache<any>(cacheKey);
  if (cached) return cached;

  const { companyId } = await resolveCompany(companyKey);
  const rows = await prisma.$queryRaw<Array<{ id: string; title: string; audience: string; startDate: Date; endDate: Date; reachCount: number; engagementRate: number; status: string }>>`SELECT "id", "title", "audience", "startDate", "endDate", "reachCount", "engagementRate", "status"
     FROM "corporate_campaigns"
     WHERE "companyId" = ${companyId}
     ORDER BY "startDate" DESC`;

  await writeCache(cacheKey, rows, CORPORATE_CACHE_TTL.campaigns);
  return rows;
};

export const getCorporateEmployees = async (
  companyKey?: string,
  filters?: { department?: string; query?: string; limit?: number; offset?: number },
) => {
  const cacheCompanyKey = String(companyKey || DEFAULT_COMPANY_KEY).trim() || DEFAULT_COMPANY_KEY;
  const cacheKey = await getCorporateDashboardCacheKey('employees', cacheCompanyKey, filters || {});
  const cached = await readCache<any>(cacheKey);
  if (cached) return cached;

  const { companyId } = await resolveCompany(companyKey);
  const limit = Math.min(200, Math.max(1, toInt(filters?.limit, 100)));
  const offset = Math.max(0, toInt(filters?.offset, 0));
  const query = String(filters?.query || '').trim();
  const department = String(filters?.department || '').trim();

  const rows = await prisma.$queryRaw<Array<{
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
  }>>`SELECT
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
     WHERE e."companyId" = ${companyId}
       AND (${query ? `%${query}%` : ''}::text = '' OR LOWER(e."name") LIKE LOWER(${query ? `%${query}%` : ''}) OR LOWER(e."email") LIKE LOWER(${query ? `%${query}%` : ''}) OR LOWER(COALESCE(e."employeeCode", '')) LIKE LOWER(${query ? `%${query}%` : ''}))
       AND (${department}::text = '' OR d."name" = ${department})
     ORDER BY e."name" ASC
     LIMIT ${limit} OFFSET ${offset}`;

  const totalRows = await prisma.$queryRaw<Array<{ total: bigint }>>`SELECT COUNT(*)::bigint as total
     FROM "company_employees" e
     LEFT JOIN "company_departments" d ON d."id" = e."departmentId"
     WHERE e."companyId" = ${companyId}
       AND (${query ? `%${query}%` : ''}::text = '' OR LOWER(e."name") LIKE LOWER(${query ? `%${query}%` : ''}) OR LOWER(e."email") LIKE LOWER(${query ? `%${query}%` : ''}) OR LOWER(COALESCE(e."employeeCode", '')) LIKE LOWER(${query ? `%${query}%` : ''}))
       AND (${department}::text = '' OR d."name" = ${department})`;

  const payload = {
    total: toInt(totalRows[0]?.total, 0),
    limit,
    offset,
    rows,
  };

  await writeCache(cacheKey, payload, CORPORATE_CACHE_TTL.employees);
  return payload;
};

export const getCorporateSessionAllocations = async (companyKey?: string) => {
  const cacheCompanyKey = String(companyKey || DEFAULT_COMPANY_KEY).trim() || DEFAULT_COMPANY_KEY;
  const cacheKey = await getCorporateDashboardCacheKey('session-allocations', cacheCompanyKey);
  const cached = await readCache<any>(cacheKey);
  if (cached) return cached;

  const { companyId } = await resolveCompany(companyKey);
  const rows = await prisma.$queryRaw<Array<{ department: string; allocatedSessions: number; usedSessions: number }>>`SELECT d."name" as department, a."allocatedSessions", a."usedSessions"
     FROM "company_session_allocations" a
     INNER JOIN "company_departments" d ON d."id" = a."departmentId"
     WHERE a."companyId" = ${companyId}
     ORDER BY d."name" ASC`;

  const totals = rows.reduce(
    (acc, row) => {
      acc.allocated += toInt(row.allocatedSessions, 0);
      acc.used += toInt(row.usedSessions, 0);
      return acc;
    },
    { allocated: 0, used: 0 },
  );

  const payload = {
    totals,
    utilizationRate: toPct(totals.used, totals.allocated),
    rows,
  };

  await writeCache(cacheKey, payload, CORPORATE_CACHE_TTL.sessionAllocations);
  return payload;
};

export const updateCorporateSessionAllocations = async (allocations: SessionAllocationUpdate[], companyKey?: string) => {
  const { companyId } = await resolveCompany(companyKey);

  await prisma.$transaction(async (tx) => {
    for (const item of allocations) {
      const department = String(item.department || '').trim();
      if (!department) continue;
      const departmentId = await resolveDepartmentId(companyId, department, tx);
      const allocatedSessions = Math.max(0, toInt(item.allocatedSessions, 0));

      await tx.$executeRaw`INSERT INTO "company_session_allocations" (
        "id", "companyId", "departmentId", "allocatedSessions", "usedSessions", "createdAt", "updatedAt"
      ) VALUES (
        ${randomUUID()}, ${companyId}, ${departmentId}, ${allocatedSessions}, COALESCE((SELECT "usedSessions" FROM "company_session_allocations" WHERE "companyId" = ${companyId} AND "departmentId" = ${departmentId}), 0), NOW(), NOW()
      ) ON CONFLICT ("companyId","departmentId") DO UPDATE SET
        "allocatedSessions" = EXCLUDED."allocatedSessions",
        "updatedAt" = NOW();`;
    }
  });

  await invalidateCorporateDashboardCache(companyKey);

  return getCorporateSessionAllocations(companyKey);
};

export const createCorporateProgram = async (payload: ProgramCreateInput, companyKey?: string) => {
  const { companyId } = await resolveCompany(companyKey);
  const title = String(payload.title || '').trim();
  if (!title) {
    throw new Error('Program title is required');
  }

  await prisma.$executeRaw`INSERT INTO "corporate_programs" ("id","companyId","title","durationWeeks","employeesEnrolled","completionRate","status","createdAt","updatedAt")
     VALUES (${randomUUID()},${companyId},${title},${Math.max(1, toInt(payload.durationWeeks, 4))},${Math.max(0, toInt(payload.employeesEnrolled, 0))},${Math.max(0, Math.min(100, toInt(payload.completionRate, 0)))},${String(payload.status || 'ACTIVE').trim().toUpperCase() || 'ACTIVE'},NOW(),NOW())`;

  await invalidateCorporateDashboardCache(companyKey);

  return getCorporatePrograms(companyKey);
};

export const createCorporateWorkshop = async (payload: WorkshopCreateInput, companyKey?: string) => {
  const { companyId } = await resolveCompany(companyKey);
  const title = String(payload.title || '').trim();
  if (!title) {
    throw new Error('Workshop title is required');
  }

  await prisma.$executeRaw`INSERT INTO "corporate_workshops" ("id","companyId","title","provider","department","workshopDate","attendees","status","createdAt","updatedAt")
     VALUES (${randomUUID()},${companyId},${title},${String(payload.provider || 'Internal Wellness Team').trim()},${String(payload.department || 'General').trim()},${String(payload.date || new Date().toISOString().slice(0, 10))}::date,${Math.max(0, toInt(payload.attendees, 0))},${String(payload.status || 'SCHEDULED').trim().toUpperCase() || 'SCHEDULED'},NOW(),NOW())`;

  await invalidateCorporateDashboardCache(companyKey);

  return getCorporateWorkshops(companyKey);
};

export const createCorporateCampaign = async (payload: CampaignCreateInput, companyKey?: string) => {
  const { companyId } = await resolveCompany(companyKey);
  const title = String(payload.title || '').trim();
  if (!title) {
    throw new Error('Campaign title is required');
  }

  await prisma.$executeRaw`INSERT INTO "corporate_campaigns" ("id","companyId","title","audience","startDate","endDate","reachCount","engagementRate","status","createdAt","updatedAt")
     VALUES (${randomUUID()},${companyId},${title},${String(payload.audience || 'All Employees').trim()},${String(payload.startDate || new Date().toISOString().slice(0, 10))}::date,${String(payload.endDate || new Date().toISOString().slice(0, 10))}::date,${Math.max(0, toInt(payload.reachCount, 0))},${Math.max(0, Math.min(100, toInt(payload.engagementRate, 0)))},${String(payload.status || 'ACTIVE').trim().toUpperCase() || 'ACTIVE'},NOW(),NOW())`;

  await invalidateCorporateDashboardCache(companyKey);

  return getCorporateCampaigns(companyKey);
};

export const getCorporateRoi = async (companyKey?: string) => {
  const cacheCompanyKey = String(companyKey || DEFAULT_COMPANY_KEY).trim() || DEFAULT_COMPANY_KEY;
  const cacheKey = await getCorporateDashboardCacheKey('roi', cacheCompanyKey);
  const cached = await readCache<any>(cacheKey);
  if (cached) return cached;

  await resolveCompany(companyKey);
  const programCost = 890000;
  const productivityGain = 2140000;
  const retentionGain = 560000;
  const healthcareSavings = 280000;

  const payload = {
    programCost,
    productivityGain,
    retentionGain,
    healthcareSavings,
    roiMultiple: Number(((productivityGain + retentionGain + healthcareSavings) / Math.max(programCost, 1)).toFixed(1)),
  };

  await writeCache(cacheKey, payload, CORPORATE_CACHE_TTL.roi);
  return payload;
};

export const getCorporateInvoices = async (companyKey?: string) => {
  const { companyId } = await resolveCompany(companyKey);
  const rows = await prisma.$queryRaw<Array<{
    id: string;
    invoiceCode: string;
    title: string;
    billingPeriod: string;
    amountPaise: number;
    currency: string;
    status: string;
    dueDate: Date | null;
    paidDate: Date | null;
  }>>`SELECT "id", "invoiceCode", "title", "billingPeriod", "amountPaise", "currency", "status", "dueDate", "paidDate"
     FROM "corporate_invoices"
     WHERE "companyId" = ${companyId}
     ORDER BY "dueDate" DESC NULLS LAST, "createdAt" DESC`;

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
  const rows = await prisma.$queryRaw<Array<{
    id: string;
    methodType: string;
    label: string;
    details: string;
    isPrimary: boolean;
    isActive: boolean;
    updatedAt: Date;
  }>>`SELECT DISTINCT ON ("methodType", "details")
       "id", "methodType", "label", "details", "isPrimary", "isActive", "updatedAt"
     FROM "corporate_payment_methods"
     WHERE "companyId" = ${companyId}
     ORDER BY "methodType", "details", "updatedAt" DESC`;

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

  await prisma.$transaction(async (tx) => {
    if (isPrimary) {
      await tx.$executeRaw`UPDATE "corporate_payment_methods"
       SET "isPrimary" = false, "updatedAt" = NOW()
       WHERE "companyId" = ${companyId}`;
    }

    await tx.$executeRaw`INSERT INTO "corporate_payment_methods" (
      "id","companyId","methodType","label","details","isPrimary","isActive","createdAt","updatedAt"
    ) VALUES (${randomUUID()},${companyId},${methodType},${label},${details},${isPrimary},true,NOW(),NOW())`;
  });

  await invalidateCorporateDashboardCache(companyKey);

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

  await prisma.$transaction(async (tx) => {
    const rows = await tx.$queryRaw<Array<{ id: string; label: string; details: string; isPrimary: boolean; isActive: boolean }>>`SELECT "id", "label", "details", "isPrimary", "isActive"
       FROM "corporate_payment_methods"
       WHERE "id" = ${methodId} AND "companyId" = ${companyId}
       LIMIT 1`;

    const current = rows[0];
    if (!current) {
      throw new Error('Payment method not found');
    }

    const isPrimary = payload.isPrimary === undefined ? current.isPrimary : Boolean(payload.isPrimary);
    if (isPrimary) {
      await tx.$executeRaw`UPDATE "corporate_payment_methods"
       SET "isPrimary" = false, "updatedAt" = NOW()
       WHERE "companyId" = ${companyId}`;
    }

    await tx.$executeRaw`UPDATE "corporate_payment_methods"
     SET "label" = ${String(payload.label ?? current.label).trim() || current.label},
         "details" = ${String(payload.details ?? current.details).trim() || current.details},
         "isPrimary" = ${isPrimary},
         "isActive" = ${payload.isActive === undefined ? current.isActive : Boolean(payload.isActive)},
         "updatedAt" = NOW()
     WHERE "id" = ${methodId} AND "companyId" = ${companyId}`;
  });

  await invalidateCorporateDashboardCache(companyKey);

  return getCorporatePaymentMethods(companyKey);
};

export const submitCorporateDemoRequest = async (payload: CorporateDemoRequestInput) => {
  await ensureCorporateTables();

  const companyName = String(payload.companyName || '').trim();
  const phone = String(payload.phone || '').trim();
  const email = String(payload.email || '').trim().toLowerCase() || null;

  if (!companyName) {
    throw new AppError('companyName is required', 400);
  }

  if (!phone) {
    throw new AppError('Phone number is required for demo request', 400);
  }

  const companyKey = sanitizeKeyPart(companyName);
  const requestId = randomUUID();

  await prisma.$executeRaw`INSERT INTO "corporate_demo_requests" (
      "id","companyName","companyKey","workEmail","companySize","industry","country","contactName","phone","status","createdAt","updatedAt"
    ) VALUES (${requestId},${companyName},${companyKey || null},${email},${String(payload.companySize || '').trim() || null},${String(payload.industry || '').trim() || null},${String(payload.country || '').trim() || null},${String(payload.contactName || '').trim() || null},${phone},'NEW',NOW(),NOW())`;

  return {
    requestId,
    companyName,
    phone,
    email,
    status: 'NEW',
  };
};

export const requestCorporateOtp = async (payload: CorporateOtpRequestInput) => {
  await ensureCorporateTables();

  const companyName = String(payload.companyName || '').trim();
  const phone = String(payload.phone || '').trim();
  
  if (!companyName) {
    throw new AppError('companyName is required', 400);
  }

  if (!phone) {
    throw new AppError('Phone number is required', 400);
  }

  const otp = generateNumericOtp();
  const otpHash = await hashOtp(otp);

  // Store OTP in database with expiry
  const otpRecordId = randomUUID();
  const expiresAt = new Date(Date.now() + env.otpTtlMinutes * 60 * 1000);

  // Store corporate OTP request
  await prisma.$executeRaw`INSERT INTO "corporate_otp_requests" (
      "id","phone","otpHash","companyName","companySize","industry","country","contactName","email","status","expiresAt","createdAt","updatedAt"
    ) VALUES (${otpRecordId},${phone},${otpHash},${companyName},${String(payload.companySize || '').trim() || null},${String(payload.industry || '').trim() || null},${String(payload.country || '').trim() || null},${String(payload.contactName || '').trim() || null},${String(payload.email || '').trim().toLowerCase() || null},'PENDING',${expiresAt},NOW(),NOW())`;

  // Send OTP via 2factor.in SMS
  send2FactorOtp(phone, otp, 'Registration1').catch((err) => {
    console.error('[Corporate] Failed to send 2Factor SMS:', err.message);
  });

  return {
    otpRecordId,
    phone,
    message: 'Corporate OTP sent',
    devOtp: env.nodeEnv !== 'production' ? otp : undefined,
  };
};

export const createCorporateAccount = async (payload: CorporateAccountCreateInput) => {
  await ensureCorporateTables();

  const companyName = String(payload.companyName || '').trim();
  const phone = String(payload.phone || '').trim();
  const otp = String(payload.otp || '').trim();
  const email = String(payload.email || '').trim().toLowerCase() || null;
  const contactName = String(payload.contactName || '').trim();

  if (!companyName) {
    throw new AppError('companyName is required', 400);
  }

  if (!phone) {
    throw new AppError('Phone number is required', 400);
  }

  if (!otp) {
    throw new AppError('OTP is required', 400);
  }

  const accountCreation = await prisma.$transaction(async (tx) => {
    // Verify OTP
    const otpRecord = (await tx.$queryRaw`SELECT "otpHash", "expiresAt" FROM "corporate_otp_requests" 
     WHERE phone = ${phone} AND status = 'PENDING' ORDER BY "createdAt" DESC LIMIT 1`) as Array<{ otpHash: string; expiresAt: Date }>;

    if (!otpRecord || !otpRecord[0]) {
      throw new AppError('Invalid or expired OTP request', 400);
    }

    if (otpRecord[0].expiresAt < new Date()) {
      throw new AppError('OTP expired', 400);
    }

    const validOtp = await verifyOtp(otp, otpRecord[0].otpHash);
    if (!validOtp) {
      throw new AppError('Invalid OTP', 400);
    }

    // Mark OTP as used
    await tx.$executeRaw`UPDATE "corporate_otp_requests" SET status = 'USED' WHERE phone = ${phone}`;

    const companyKey = await resolveUniqueCompanyKey(companyName, tx);
    const companyDomain = email ? getDomainFromEmail(email) : null;
    const companyId = randomUUID();
    const defaultEmployeeLimit = Math.max(50, toInt(payload.companySize, 300));
    const defaultSessionQuota = Math.max(25, Math.round(defaultEmployeeLimit * 0.65));

    await tx.$executeRaw`INSERT INTO "companies" (
      "id","companyKey","domain","name","employeeLimit","sessionQuota","ssoProvider","privacyPolicy","supportEmail","supportPhone","supportSla","createdAt","updatedAt"
    ) VALUES (${companyId},${companyKey},${companyDomain},${companyName},${defaultEmployeeLimit},${defaultSessionQuota},'Google Workspace',${'Only aggregate analytics are visible to HR. Individual therapy notes, diagnosis, medications, and provider details are never shown.'},${'enterprise-support@manas360.com'},${'+91-80-4000-3600'},${'Priority support within 4 business hours.'},NOW(),NOW())`;

    const nameParts = contactName ? contactName.split(/\s+/).filter(Boolean) : [];
    const firstName = nameParts[0] || companyName;
    const lastName = nameParts.slice(1).join(' ');

    const existingUser = await tx.user.findFirst({
      where: { phone, isDeleted: false },
      select: { id: true, email: true, phone: true, firstName: true, lastName: true, role: true },
    });

    const corporateMember = existingUser
      ? await tx.user.update({
          where: { id: existingUser.id },
          data: {
            email: email || existingUser.email || undefined,
            provider: 'PHONE',
            role: existingUser.role || 'PATIENT',
            firstName: existingUser.firstName || firstName,
            lastName: existingUser.lastName || lastName,
            name: contactName || companyName,
            phoneVerified: true,
            emailVerified: Boolean(email || existingUser.email),
          },
          select: {
            id: true,
            email: true,
            phone: true,
            firstName: true,
            lastName: true,
          },
        })
      : await tx.user.create({
          data: {
            email: email || undefined,
            phone,
            provider: 'PHONE',
            role: 'PATIENT',
            firstName,
            lastName,
            name: contactName || companyName,
            phoneVerified: true,
            emailVerified: Boolean(email),
          },
          select: {
            id: true,
            email: true,
            phone: true,
            firstName: true,
            lastName: true,
          },
        });

    await tx.$executeRaw`UPDATE "users"
       SET company_key = ${companyKey},
           is_company_admin = false,
           "updatedAt" = NOW()
       WHERE id = ${corporateMember.id}`;

    return {
      companyId,
      companyKey,
      defaultEmployeeLimit,
      defaultSessionQuota,
      corporateMember,
    };
  });

  const corporateMemberPayload = {
    id: accountCreation.corporateMember.id,
    email: accountCreation.corporateMember.email,
    firstName: accountCreation.corporateMember.firstName,
    lastName: accountCreation.corporateMember.lastName,
    isCompanyAdmin: false,
  };

  return {
    company: {
      id: accountCreation.companyId,
      companyKey: accountCreation.companyKey,
      name: companyName,
      employeeLimit: accountCreation.defaultEmployeeLimit,
      sessionQuota: accountCreation.defaultSessionQuota,
      industry: String(payload.industry || '').trim() || null,
      country: String(payload.country || '').trim() || null,
    },
    corporateMember: corporateMemberPayload,
    // Backward compatibility for older consumers still reading `corporateAdmin`.
    corporateAdmin: corporateMemberPayload,
  };
};

export const createCorporateEapQr = async (input: CorporateEapQrCreateInput, createdById?: string) => {
  await ensureCorporateTables();

  const companyKey = String(input.companyKey || DEFAULT_COMPANY_KEY).trim() || DEFAULT_COMPANY_KEY;
  const company = await resolveCompany(companyKey);
  const locationSlug = normalizeQrSegment(String(input.location || 'standee'));
  const uniqueId = `${normalizeQrSegment(company.companyKey, 'corporate')}-${locationSlug}`;
  const code = `EAP_${uniqueId}`.toUpperCase();
  const destinationUrl = String(input.destinationUrl || '').trim()
    || `${env.frontendUrl}/eap/${company.companyKey}/screen`;

  const qrCode = await createQrCode(
    {
      code,
      qrType: 'eap',
      redirectUrl: destinationUrl,
      destinationUrl,
      ownerId: company.companyId,
      isDynamic: true,
      isActive: input.isActive ?? true,
    },
    createdById,
  );

  return {
    qrCode,
    companyKey: company.companyKey,
    companyId: company.companyId,
    companyName: company.companyName,
    location: locationSlug,
    uniqueId,
    trackingPath: `/q/eap/${uniqueId}`,
    trackingUrl: `${env.apiUrl}${env.apiPrefix}/q/eap/${uniqueId}`,
    destinationUrl,
  };
};

export const getCorporateEapQrAnalytics = async (companyKey?: string) => {
  await ensureCorporateTables();

  const company = await resolveCompany(companyKey);
  let qrCodes: Array<{
    code: string;
    redirectUrl: string;
    destinationUrl: string | null;
    ownerId: string | null;
    createdAt: Date;
    scanCount: number;
    lastScannedAt: Date | null;
    scans?: Array<{ id: string; sessionId: string | null; scanTimestamp: Date }>;
    conversions?: Array<{ conversionType: string; attributedRevenue: any }>;
  }> = [];

  try {
    qrCodes = await prisma.qrCode.findMany({
      where: {
        qrType: 'eap',
        ownerId: company.companyId,
      },
      select: {
        code: true,
        redirectUrl: true,
        destinationUrl: true,
        ownerId: true,
        createdAt: true,
        scanCount: true,
        lastScannedAt: true,
        scans: {
          select: {
            id: true,
            sessionId: true,
            scanTimestamp: true,
          },
        },
        conversions: {
          select: {
            conversionType: true,
            attributedRevenue: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  } catch (error) {
    if (!isMissingQrInfraError(error)) {
      throw error;
    }

    qrCodes = await prisma.qrCode.findMany({
      where: {
        qrType: 'eap',
        ownerId: company.companyId,
      },
      select: {
        code: true,
        redirectUrl: true,
        destinationUrl: true,
        ownerId: true,
        createdAt: true,
        scanCount: true,
        lastScannedAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  const breakdown = qrCodes.map((qr) => {
    const scans = Array.isArray(qr.scans) ? qr.scans.length : Number(qr.scanCount || 0);
    const screenings = Array.isArray(qr.conversions)
      ? qr.conversions.filter((conversion) => conversion.conversionType === 'assessment_completed').length
      : 0;
    const bookings = Array.isArray(qr.conversions)
      ? qr.conversions.filter((conversion) => conversion.conversionType === 'session_booked').length
      : 0;
    const revenue = Array.isArray(qr.conversions)
      ? qr.conversions.reduce((sum, conversion) => sum + Number(conversion.attributedRevenue || 0), 0)
      : 0;
    const location = String(qr.code || '')
      .replace(/^EAP_/, '')
      .toLowerCase()
      .replace(new RegExp(`^${normalizeQrSegment(company.companyKey, 'corporate')}-`), '')
      .replace(/-/g, ' ');

    return {
      code: qr.code,
      location: location || 'standee',
      scans,
      screenings,
      bookings,
      revenue,
      lastScannedAt: qr.lastScannedAt,
    };
  });

  const totals = breakdown.reduce((acc, item) => {
    acc.scans += item.scans;
    acc.screenings += item.screenings;
    acc.bookings += item.bookings;
    acc.revenue += item.revenue;
    return acc;
  }, { scans: 0, screenings: 0, bookings: 0, revenue: 0 });

  return {
    companyKey: company.companyKey,
    companyId: company.companyId,
    companyName: company.companyName,
    qrCount: qrCodes.length,
    totals: {
      scans: totals.scans,
      screenings: totals.screenings,
      bookings: totals.bookings,
      revenue: Number(totals.revenue.toFixed(2)),
    },
    breakdown,
  };
};

export const listCorporateDemoRequests = async (page = 1, limit = 50) => {
  await ensureCorporateTables();

  const offset = (Math.max(1, page) - 1) * Math.max(1, limit);

  const [rows, countRows] = await Promise.all([
    prisma.$queryRaw<Array<{
      id: string;
      companyName: string;
      companyKey: string | null;
      workEmail: string | null;
      companySize: string | null;
      industry: string | null;
      country: string | null;
      contactName: string | null;
      phone: string;
      status: string;
      createdAt: Date;
    }>>`
      SELECT "id","companyName","companyKey","workEmail","companySize","industry","country","contactName","phone","status","createdAt"
      FROM "corporate_demo_requests"
      ORDER BY "createdAt" DESC
      LIMIT ${limit} OFFSET ${offset}
    `,
    prisma.$queryRaw<Array<{ total: bigint }>>`
      SELECT COUNT(*)::bigint AS total FROM "corporate_demo_requests"
    `,
  ]);

  const total = Number(countRows[0]?.total || 0);

  return {
    requests: rows.map((r) => ({
      id: r.id,
      companyName: r.companyName,
      companyKey: r.companyKey,
      contactEmail: r.workEmail,
      contactName: r.contactName,
      phone: r.phone,
      companySize: r.companySize,
      industry: r.industry,
      country: r.country,
      status: r.status,
      requestedAt: r.createdAt,
    })),
    total,
    page,
    limit,
    pages: Math.ceil(total / limit),
  };
};
