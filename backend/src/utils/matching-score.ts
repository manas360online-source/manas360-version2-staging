/**
 * Therapist Matching Score Calculator
 * 
 * Ranks therapists WITHIN a tier based on:
 * - Expertise match (30%)
 * - Response rate / conversion rate (20%)
 * - Rating (15%)
 * - Response speed (15%)
 * - Language match (20%)
 * 
 * Result: 0-100 scale for ranking
 */

/**
 * Calculate therapist-to-lead match score
 * Used for ranking therapists WITHIN a tier (after quota filtering)
 */
export const calculateTherapistMatchScore = (
  therapist: any,
  lead: any
): number => {
  let score = 0;

  // Component 1: Expertise Match (30%)
  if (therapist.therapistProfile && lead.issue && lead.issue.length > 0) {
    const profileExpertise = therapist.therapistProfile.expertise as string[] | null;
    const expertise = profileExpertise || [];
    
    const matchingExpertise = lead.issue.filter((issue: string) =>
      expertise.includes(issue)
    ).length;
    
    const expertiseScore = expertise.length > 0
      ? (matchingExpertise / expertise.length) * 0.3
      : 0.15; // Partial credit if no expertise defined
    
    score += expertiseScore;
  } else {
    score += 0.15; // Partial credit if no profile or issue data
  }

  // Component 2: Conversion Rate (20%)
  const conversionRate = therapist.therapistProfile?.conversionRate ?? 0.3; // Default 30%
  const conversionScore = Math.min(conversionRate, 1.0) * 0.2;
  score += conversionScore;

  // Component 3: Rating/Reviews (15%)
  const rating = therapist.therapistProfile?.rating ?? 3.5; // Out of 5
  const ratingScore = (rating / 5.0) * 0.15;
  score += ratingScore;

  // Component 4: Response Speed (15%)
  const avgResponseMinutes = therapist.therapistProfile?.avgResponseTimeMinutes ?? 120;
  // Faster responses = higher score (cap at 2 hours = great response time)
  const responseScore = Math.max(0, (120 - avgResponseMinutes) / 120) * 0.15;
  score += responseScore;

  // Component 5: Language Match (20%)
  if (therapist.therapistProfile?.languages) {
    const languages = therapist.therapistProfile.languages as string[];
    // Simplified: if they match any language, give credit
    const hasLanguageMatch = languages.length > 1 ? 0.2 : 0.1;
    score += hasLanguageMatch;
  } else {
    score += 0.1; // Partial credit
  }

  return Math.round(Math.min(100, score * 100));
};

/**
 * Get therapist readiness score (for internal analytics)
 * Predicts likelihood of successful conversion with this lead
 */
export const getTherapistReadinessScore = (therapist: any): number => {
  let score = 0.5; // Base 50%

  // Availability
  if (therapist.isActive) score += 0.1;

  // Response speed history
  const avgResponse = therapist.therapistProfile?.avgResponseTimeMinutes ?? 120;
  if (avgResponse < 30) score += 0.1;
  else if (avgResponse < 60) score += 0.08;

  // Conversion history
  const conversionRate = therapist.therapistProfile?.conversionRate ?? 0;
  score += conversionRate * 0.2;

  // Rating
  const rating = therapist.therapistProfile?.rating ?? 3.0;
  score += (rating / 5.0) * 0.1;

  return Math.round(Math.min(100, score * 100));
};

export default {
  calculateTherapistMatchScore,
  getTherapistReadinessScore,
};
