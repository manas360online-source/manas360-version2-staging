// src/pages/clinic/data.ts

export type Feature = {
  name: string;
  description: string;
  slug: string;
  solo: number;
  small: number;
  large: number;
};

export const FEATURES: Feature[] = [
  {
    name: "Patient Database",
    description: "Secure vault",
    slug: "patient-database",
    solo: 499,
    small: 699,
    large: 999,
  },
  {
    name: "Session Notes",
    description: "Templates",
    slug: "session-notes",
    solo: 249,
    small: 349,
    large: 449,
  },
  {
    name: "Scheduling",
    description: "Reminders",
    slug: "scheduling",
    solo: 199,
    small: 249,
    large: 299,
  },
  {
    name: "Auto Purge",
    description: "24h delete",
    slug: "auto-purge",
    solo: 99,
    small: 99,
    large: 99,
  },
  {
    name: "Bulk Import",
    description: "CSV upload",
    slug: "bulk-import",
    solo: 299,
    small: 399,
    large: 599,
  },
  {
    name: "Progress Tracking",
    description: "PHQ-9",
    slug: "progress-tracking",
    solo: 199,
    small: 299,
    large: 399,
  },
  {
    name: "Prescriptions",
    description: "Templates",
    slug: "prescriptions",
    solo: 249,
    small: 349,
    large: 449,
  },
  {
    name: "Adherence",
    description: "Tracking",
    slug: "adherence",
    solo: 149,
    small: 199,
    large: 299,
  },
  {
    name: "Multi Therapist",
    description: "Team access",
    slug: "multi-therapist",
    solo: 199,
    small: 199,
    large: 199,
  },
  {
    name: "API Access",
    description: "Integrations",
    slug: "api-access",
    solo: 499,
    small: 599,
    large: 799,
  },
  {
    name: "Compliance Pack",
    description: "Audit logs",
    slug: "compliance-pack",
    solo: 149,
    small: 199,
    large: 249,
  },
  {
    name: "Analytics",
    description: "Insights",
    slug: "analytics",
    solo: 299,
    small: 399,
    large: 599,
  },
];

// ✅ ADD THIS (IMPORTANT)
export const TIER_OPTIONS = {
  solo: { label: "Solo", range: "1-50" },
  small: { label: "Small", range: "51-200" },
  large: { label: "Large", range: "200+" },
} as const;

// ✅ ADD THIS ALSO
export const BILLING_OPTIONS = {
  monthly: "Monthly",
  quarterly: "Quarterly (Save 10%)",
} as const;