-- Add specialized admin roles to UserRole enum for strict role-based admin access.
ALTER TYPE "UserRole" ADD VALUE IF NOT EXISTS 'CLINICAL_DIRECTOR';
ALTER TYPE "UserRole" ADD VALUE IF NOT EXISTS 'FINANCE_MANAGER';
ALTER TYPE "UserRole" ADD VALUE IF NOT EXISTS 'COMPLIANCE_OFFICER';
