/**
 * Lead Quality Score Calculator
 * 
 * LOCKED FORMULA (per user requirement):
 * score = (verification score) + (profile completeness * 30) + (urgency * 30)
 * 
 * Verification Score:
 * - complete (email + phone + profile): 40
 * - phone (email + phone): 25
 * - email only: 10
 * 
 * Result: 0-100 scale
 */

import { LEAD_QUALITY_CONFIG } from '../config/plans';

/**
 * Calculate lead quality score (0-100)
 * 
 * Input: Lead object with verificationLevel and profile data
 * Output: Quality score 0-100
 */
export const calculateLeadQualityScore = (lead: any): number => {
  let score = 0;

  // Component 1: Verification Level (base 10-40)
  const verificationScores = LEAD_QUALITY_CONFIG.verificationWeights;
  const verificationScore = verificationScores[lead.verificationLevel as keyof typeof verificationScores] || 10;
  score += verificationScore;

  // Component 2: Profile Completeness (0-30)
  // Estimate based on available fields in lead/patient profile
  const profileCompleteScore = calculateProfileCompleteness(lead) * LEAD_QUALITY_CONFIG.profileCompletenessWeight;
  score += profileCompleteScore;

  // Component 3: Urgency/Intent (0-30)
  // Estimate based on previewData detail level, issue description, etc.
  const urgencyScore = calculateUrgencyScore(lead) * LEAD_QUALITY_CONFIG.urgencyWeight;
  score += urgencyScore;

  // Cap at 100
  return Math.min(100, Math.round(score));
};

/**
 * Calculate profile completeness ratio (0-1.0)
 * Based on how many profile fields are filled in
 */
const calculateProfileCompleteness = (lead: any): number => {
  let completedFields = 0;
  let totalFields = 0;

  // Check common fields
  const fieldsToCheck = [
    'previewData',
    'issue',
    'verificationLevel',
  ];

  for (const field of fieldsToCheck) {
    totalFields++;
    const value = lead[field];
    
    // Mark as complete if field exists and is non-empty
    if (value) {
      if (Array.isArray(value) && value.length > 0) {
        completedFields++;
      } else if (typeof value === 'object' && Object.keys(value).length > 0) {
        completedFields++;
      } else if (typeof value === 'string' && value.trim().length > 0) {
        completedFields++;
      }
    }
  }

  // Patient info depth
  if (lead.patient) {
    totalFields++;
    const patient = lead.patient;
    const patientFieldsComplete = [
      patient.firstName,
      patient.lastName,
      patient.email,
      patient.phone,
    ].filter(Boolean).length;
    
    if (patientFieldsComplete >= 2) {
      completedFields++;
    }
  }

  return totalFields > 0 ? completedFields / totalFields : 0;
};

/**
 * Calculate urgency score (0-1.0)
 * Based on how detailed the issue description is
 */
const calculateUrgencyScore = (lead: any): number => {
  let score = 0.2; // Base score

  // Check if issue array has multiple items (more detailed)
  if (Array.isArray(lead.issue) && lead.issue.length > 1) {
    score += 0.3;
  } else if (Array.isArray(lead.issue) && lead.issue.length === 1) {
    score += 0.2;
  }

  // Check previewData for rich information
  if (lead.previewData) {
    const preview = lead.previewData;
    const previewKeyCount = Object.keys(preview).length;
    
    if (previewKeyCount > 5) {
      score += 0.3;
    } else if (previewKeyCount > 2) {
      score += 0.2;
    } else if (previewKeyCount > 0) {
      score += 0.1;
    }
  }

  // Check if verification is high level (indicates more intent)
  if (lead.verificationLevel === 'complete') {
    score += 0.1;
  }

  return Math.min(1.0, score);
};

/**
 * Categorize lead quality tier based on score
 */
export const getLeadQualityTier = (score: number): 'high' | 'medium' | 'low' => {
  if (score >= 70) return 'high';
  if (score >= 40) return 'medium';
  return 'low';
};

export default {
  calculateLeadQualityScore,
  getLeadQualityTier,
};
