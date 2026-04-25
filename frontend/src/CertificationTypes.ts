export type BadgeColor = 'blue' | 'green' | 'yellow' | 'orange' | 'red' | 'purple';

export type CertificationTier = 'Entry' | 'Professional' | 'Mastery';

export interface Certification {
  id: string;
  slug: string;
  name: string;
  description: string;
  badgeColor: BadgeColor;
  tier: CertificationTier;
  duration_weeks: number;
  price_inr: number;
  monthly_income_min_inr: number;
  requirements: string[];
  modulesCount?: number;
  monthly_income_max_inr: number;
  prerequisites: string[];
  syllabusPdfUrl: string;
  modules: {
    id: string;
    title: string;
    duration_minutes: number;
    topics: string[];
  }[];
  faqs: {
    question: string;
    answer: string;
  }[];
  testimonials: {
    id: string;
    name: string;
    role: string;
    avatar: string;
    text: string;
    rating: number;
  }[];
}

export interface Enrollment {
  id: string;
  certificationId: string;
  certificationName: string;
  slug: string;
  badgeColor: BadgeColor;
  enrollmentDate: string;
  paymentStatus: 'Paid' | 'Partial' | 'Pending';
  paymentPlan: 'full' | 'installment';
  amountPaid: number;
  totalAmount: number;
  installmentsPaidCount: number;
  completionPercentage: number;
  modulesCompleted: number;
  nextInstallmentDue?: string;
  userName?: string;
  certId?: string;
}

export interface Lead {
  id: number;
  name: string;
  age: number;
  concern: string;
  severity: 'High' | 'Medium' | 'Low';
  exclusiveUntil: string;
  isContacted: boolean;
}
