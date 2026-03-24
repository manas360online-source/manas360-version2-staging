-- Create enum for ProviderSubscriptionTier
CREATE TYPE "ProviderSubscriptionTier" AS ENUM ('STARTER', 'GROWTH', 'SCALE');

-- Add new columns to provider_subscriptions table
ALTER TABLE "provider_subscriptions" ADD COLUMN "tier" "ProviderSubscriptionTier",
ADD COLUMN "bonusLeads" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "billingCycle" TEXT NOT NULL DEFAULT 'monthly',
ADD COLUMN "leadsUsedThisWeek" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "totalLeadsReceived" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "weekStartsAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN "lastAssignedAt" TIMESTAMP(3);

-- Create indexes for provider_subscriptions
CREATE INDEX "provider_subscriptions_tier_idx" ON "provider_subscriptions"("tier");
CREATE INDEX "provider_subscriptions_leadsUsedThisWeek_idx" ON "provider_subscriptions"("leadsUsedThisWeek");

-- Add new columns to leads table
ALTER TABLE "leads" ADD COLUMN "issue" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN "verificationLevel" TEXT NOT NULL DEFAULT 'email',
ADD COLUMN "quality" INTEGER NOT NULL DEFAULT 50,
ADD COLUMN "exclusivity" TEXT NOT NULL DEFAULT 'shared';

-- Create indexes for leads
CREATE INDEX "leads_quality_idx" ON "leads"("quality");
CREATE INDEX "leads_issue_idx" ON "leads" USING GIN("issue");

-- Create lead_assignments table
CREATE TABLE "lead_assignments" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "leadId" TEXT NOT NULL,
    "therapistId" TEXT NOT NULL,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "respondedAt" TIMESTAMP(3),
    "responseTime" INTEGER,
    "convertedAt" TIMESTAMP(3),
    "sessionBooked" BOOLEAN NOT NULL DEFAULT false,
    "status" TEXT NOT NULL DEFAULT 'assigned',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "lead_assignments_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "leads" ("id") ON DELETE CASCADE,
    CONSTRAINT "lead_assignments_therapistId_fkey" FOREIGN KEY ("therapistId") REFERENCES "users" ("id") ON DELETE CASCADE
);

-- Create unique constraint for lead_assignments
CREATE UNIQUE INDEX "lead_assignments_leadId_therapistId_key" ON "lead_assignments"("leadId", "therapistId");

-- Create indexes for lead_assignments
CREATE INDEX "lead_assignments_therapistId_respondedAt_idx" ON "lead_assignments"("therapistId", "respondedAt");
CREATE INDEX "lead_assignments_therapistId_convertedAt_idx" ON "lead_assignments"("therapistId", "convertedAt");
CREATE INDEX "lead_assignments_therapistId_status_idx" ON "lead_assignments"("therapistId", "status");
CREATE INDEX "lead_assignments_assignedAt_idx" ON "lead_assignments"("assignedAt");
