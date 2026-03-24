import { calculateLeadQualityScore, getLeadQualityTier } from '../src/utils/lead-quality-score';
import { sortTherapistsByFairness } from '../src/services/lead-distribution-b2b.service';

describe('Phase 5 - E2E Validation: B2B Lead Generation & Ranking Algorithms', () => {
        describe('Lead Quality Scoring Algorithm', () => {
                it('should calculate the maximum score for a highly verified, perfectly detailed lead', () => {
                        const mockMaxLead = {
                                verificationLevel: 'complete',
                                issue: ['Anxiety', 'Depression'],
                                previewData: {
                                        age: 30,
                                        state: 'NY',
                                        previousTherapy: true,
                                        severity: 'High',
                                        preferences: 'In-person',
                                        insurance: 'Aetna',
                                },
                                patient: {
                                        firstName: 'John',
                                        lastName: 'Doe',
                                        email: 'john@example.com',
                                        phone: '+1234567890',
                                }
                        };

                        const score = calculateLeadQualityScore(mockMaxLead);
                        const tier = getLeadQualityTier(score);

                        expect(score).toBe(97);
                        expect(tier).toBe('high');
                });

                it('should correctly weight phone verification vs complete verification', () => {
                        const mockModerateLead = {
                                verificationLevel: 'phone',
                                issue: ['Stress'], // Array length 1 -> +0.2 urgency base
                                previewData: { age: 30 }, // keys = 1 -> +0.1 urgency base
                                // no patient info
                        };
                        // Profile Completeness:
                        // fieldsToCheck = ['previewData', 'issue', 'verificationLevel']
                        // 3 total fields, all 3 present = 3/3 = 100% complete
                        // profileScore = 1.0 * 30 = 30
                        
                        // Urgency:
                        // base(0.2) + issue(0.2) + preview(0.1) = 0.5
                        // urgencyScore = 0.5 * 30 = 15

                        // Phone Verification: 25
                        // Total = 25 + 30 + 15 = 70

                        const score = calculateLeadQualityScore(mockModerateLead);
                        const tier = getLeadQualityTier(score);

                        expect(score).toBe(70);
                        expect(tier).toBe('high');
                });

                it('should apply low tier for low verification and sparse profiles', () => {
                        const mockLowLead = {
                                verificationLevel: 'email', // +10
                                issue: [], // empty
                                previewData: {}, // empty
                        };
                        
                        // completeness = 1 / 3 = 0.333
                        // 0.333 * 30 = 10
                        
                        // urgency = base 0.2
                        // 0.2 * 30 = 6
                        
                        // total = 10 + 10 + 6 = 26

                        const score = calculateLeadQualityScore(mockLowLead);
                        const tier = getLeadQualityTier(score);

                        expect(score).toBeLessThan(40);
                        expect(tier).toBe('low');
                });
        });

        describe('Therapist Ranking & Fairness Algorithm (B2B Distribution)', () => {
                it('should prioritize the therapist with the lowest leadsUsedThisWeek', () => {
                        const therapists = [
                                { id: 'T1', subscription: { leadsUsedThisWeek: 5, lastAssignedAt: new Date('2026-03-20T10:00:00Z') } },
                                { id: 'T2', subscription: { leadsUsedThisWeek: 1, lastAssignedAt: new Date('2026-03-24T10:00:00Z') } },
                                { id: 'T3', subscription: { leadsUsedThisWeek: 10, lastAssignedAt: new Date('2026-03-10T10:00:00Z') } },
                        ];

                        const sorted = sortTherapistsByFairness(therapists);
                        
                        expect(sorted[0].id).toBe('T2'); // Used least leads
                        expect(sorted[1].id).toBe('T1');
                        expect(sorted[2].id).toBe('T3'); // Used most leads
                });

                it('should break ties using lastAssignedAt (oldest assignment wins)', () => {
                        const timeEarly = new Date('2026-03-20T10:00:00Z');
                        const timeLate = new Date('2026-03-24T10:00:00Z');
                        
                        const therapists = [
                                { id: 'T1', subscription: { leadsUsedThisWeek: 2, lastAssignedAt: timeLate } },
                                { id: 'T2', subscription: { leadsUsedThisWeek: 2, lastAssignedAt: timeEarly } },
                                { id: 'T3', subscription: { leadsUsedThisWeek: 2, lastAssignedAt: null } }, // Never assigned, treated as 0 ms
                        ];

                        const sorted = sortTherapistsByFairness(therapists);
                        
                        expect(sorted[0].id).toBe('T3'); // Never assigned (time 0)
                        expect(sorted[1].id).toBe('T2'); // Earlier assignment
                        expect(sorted[2].id).toBe('T1'); // Latest assignment
                });

                it('should gracefully handle missing subscription objects safely', () => {
                        // Edge case scenario if partial object is sent
                        const therapists = [
                                { id: 'T1', subscription: {} },
                                { id: 'T2', subscription: { leadsUsedThisWeek: 1 } },
                        ];
                        
                        const sorted = sortTherapistsByFairness(therapists);
                        
                        expect(sorted[0].id).toBe('T1'); // Treated as 0
                        expect(sorted[1].id).toBe('T2');
                });
        });
});
