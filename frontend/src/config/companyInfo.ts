/**
 * Centralized MANAS360 Company Information
 * Single source of truth for all company details used across legal pages, footer, and contact sections
 */

export const companyInfo = {
  // Basic Company Info
  name: 'MANAS360',
  legalName: 'Mental Wellness Pvt., Ltd.',
  website: 'MANAS360.com',
  
  // Contact Information
  email: 'Manas360onlinc@gmail.com',
  supportEmail: 'support@manas360.com',
  grievanceEmail: 'grievance@manas360.com',
  phone: '+91-80 6940 9284',
  alternatePhone: '+91-8944 944 2180',
  
  // Registered Address
  address: '6, MI.V, Talaghatpura, Kanakapura Road',
  city: 'BENGALURU',
  postalCode: '560062',
  state: 'Karnataka',
  country: 'India',
  
  // Full formatted address for legal documents
  fullAddress: '6, MI.V, Talaghatpura, Kanakapura Road, BENGALURU 560062, Karnataka, India',
  
  // Legal Registration Numbers
  cin: 'U86900KA2026PTC215013',
  dpiitNo: 'DIPP244635',
  gstin: '29AAUCM4417G1Z1',
  udhyam: 'KR-03-0654344',
  
  // Jurisdiction
  jurisdiction: 'Bengaluru, Karnataka, India',
  
  // Support Response Times (for legal pages)
  supportResponseTime: '24 hours',
  supportResolutionTime: '72 hours',
  grievanceResponseTime: '48 hours',
  grievanceResolutionTime: '30 days',
  
  // Crisis Number
  crisisHelpline: '1800-599-0019',
  
  // External References
  consumerHelpline: '1800-11-4000',
  consumerHelplineWebsite: 'consumerhelpline.gov.in',
  
  // Document Control Numbers
  cancellationRefundPolicyVersion: 'MANAS360-LEGAL-CRP-001',
  termsOfServiceVersion: 'MANAS360-LEGAL-TOS-001',
  privacyPolicyVersion: 'MANAS360-LEGAL-PP-001',
  
  // Copyright
  copyrightYear: new Date().getFullYear(),
} as const;

export type CompanyInfo = typeof companyInfo;
