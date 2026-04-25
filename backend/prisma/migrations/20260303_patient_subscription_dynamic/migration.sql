-- Patient subscription management dynamic data tables

CREATE TABLE IF NOT EXISTS "patient_subscriptions" (
  "id" TEXT PRIMARY KEY,
  "userId" TEXT NOT NULL UNIQUE,
  "planName" TEXT NOT NULL,
  "price" INTEGER NOT NULL,
  "billingCycle" TEXT NOT NULL,
  "status" TEXT NOT NULL,
  "autoRenew" BOOLEAN NOT NULL DEFAULT true,
  "renewalDate" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "patient_subscriptions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "patient_subscriptions_status_idx" ON "patient_subscriptions"("status");

CREATE TABLE IF NOT EXISTS "patient_payment_methods" (
  "id" TEXT PRIMARY KEY,
  "userId" TEXT NOT NULL UNIQUE,
  "cardLast4" TEXT NOT NULL,
  "cardBrand" TEXT NOT NULL,
  "expiryMonth" INTEGER NOT NULL,
  "expiryYear" INTEGER NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "patient_payment_methods_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "patient_invoices" (
  "id" TEXT PRIMARY KEY,
  "userId" TEXT NOT NULL,
  "amount" INTEGER NOT NULL,
  "status" TEXT NOT NULL,
  "invoiceUrl" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "patient_invoices_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "patient_invoices_userId_createdAt_idx" ON "patient_invoices"("userId", "createdAt");

CREATE TABLE IF NOT EXISTS "patient_exercises" (
  "id" TEXT PRIMARY KEY,
  "patientId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "assignedBy" TEXT NOT NULL,
  "duration" INTEGER NOT NULL,
  "status" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "patient_exercises_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "patient_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "patient_exercises_patientId_status_idx" ON "patient_exercises"("patientId", "status");

CREATE TABLE IF NOT EXISTS "patient_progress" (
  "id" TEXT PRIMARY KEY,
  "patientId" TEXT NOT NULL UNIQUE,
  "sessionsCompleted" INTEGER NOT NULL DEFAULT 0,
  "totalSessions" INTEGER NOT NULL DEFAULT 0,
  "exercisesCompleted" INTEGER NOT NULL DEFAULT 0,
  "totalExercises" INTEGER NOT NULL DEFAULT 0,
  "phqStart" INTEGER,
  "phqCurrent" INTEGER,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "patient_progress_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "patient_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
