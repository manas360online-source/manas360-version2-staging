import { resolveBand } from '../src/services/free-screening.service';
import {
        getDefaultScreeningTemplateDefinition,
        FREE_SCREENING_TEMPLATE_KEY,
        PHQ9_SCREENING_TEMPLATE_KEY,
        GAD7_SCREENING_TEMPLATE_KEY,
} from '../src/services/screening-template-defaults.service';

describe('Phase 5 - End-to-End Validation: Quick Screening Decision Matrix & Recommendations', () => {
        
        describe('resolveBand Validation Model', () => {
                it('should map score exactly to a matching band inclusive of bounds (min/max)', () => {
                        const mockBands = [
                                { minScore: 0, maxScore: 4, severity: 'Minimal' },
                                { minScore: 5, maxScore: 9, severity: 'Mild' },
                                { minScore: 10, maxScore: 14, severity: 'Moderate' },
                        ];

                        expect(resolveBand(mockBands, 0).severity).toBe('Minimal');
                        expect(resolveBand(mockBands, 4).severity).toBe('Minimal');
                        expect(resolveBand(mockBands, 5).severity).toBe('Mild');
                        expect(resolveBand(mockBands, 12).severity).toBe('Moderate');
                });

                it('should fallback to default thresholds if bands are empty', () => {
                        const result = resolveBand([], 9);
                        expect(result.severity).toBe('Moderate'); // >= 8 is Moderate
                });

                it('should return highest band if totalScore exceeds defined mappings (safety net fallback)', () => {
                        const mockBands = [
                                { minScore: 0, maxScore: 4, severity: 'Minimal' },
                                { minScore: 5, maxScore: 9, severity: 'Mild' },
                        ];
                        // If it goes beyond max mapping
                        expect(resolveBand(mockBands, 20)).toEqual(mockBands[1]);
                });
        });

        describe('PHQ-9 Recommendation Mapping Validation', () => {
                const phq9Template = getDefaultScreeningTemplateDefinition(PHQ9_SCREENING_TEMPLATE_KEY);

                it('PHQ-9 template should exist and have exactly 9 questions', () => {
                        expect(phq9Template).toBeDefined();
                        expect(phq9Template?.questions.length).toBe(9);
                });

                it('PHQ-9 mapping bands should perfectly cover scores 0 through 27 without gaps', () => {
                        const bands = phq9Template?.scoringBands || [];
                        expect(bands.length).toBeGreaterThan(0);

                        // Ensure bands cover 0 to 27
                        let expectedMin = 0;
                        bands.forEach((band) => {
                                expect(band.minScore).toBe(expectedMin);
                                expectedMin = band.maxScore + 1;
                                
                                // Assert interpretations and recommendations are populated
                                expect(band.interpretation).toBeDefined();
                                expect(band.recommendation).toBeDefined();
                        });
                        
                        // Maximum score for PHQ-9 (9 items x 3 points freq = 27)
                        expect(bands[bands.length - 1].maxScore).toBe(27);
                });

                it('PHQ-9 resolving logic should map the score of 20 to Severe Depression', () => {
                        const bands = phq9Template?.scoringBands || [];
                        const band = resolveBand(bands, 20);
                        expect(band.severity.toLowerCase()).toContain('severe');
                });
        });

        describe('GAD-7 Recommendation Mapping Validation', () => {
                const gad7Template = getDefaultScreeningTemplateDefinition(GAD7_SCREENING_TEMPLATE_KEY);

                it('GAD-7 template should exist and have exactly 7 questions', () => {
                        expect(gad7Template).toBeDefined();
                        expect(gad7Template?.questions.length).toBe(7);
                });

                it('GAD-7 mapping bands should cover scores 0 through 21 (7 items * 3 pts = 21)', () => {
                        const bands = gad7Template?.scoringBands || [];
                        expect(bands.length).toBeGreaterThan(0);
                        expect(bands[0].minScore).toBe(0);
                        expect(bands[bands.length - 1].maxScore).toBe(21);
                });
        });
        
        describe('Free Assessment Verification', () => {
                const freeTemplate = getDefaultScreeningTemplateDefinition(FREE_SCREENING_TEMPLATE_KEY);

                it('Free template should have functional fallback recommendations', () => {
                        expect(freeTemplate).toBeDefined();
                        const bands = freeTemplate?.scoringBands || [];
                        expect(bands.length).toBeGreaterThan(0);
                        // Ensures the free tracker has a mapping
                        expect(bands[0].recommendation).toBeTruthy();
                });
        });
});
