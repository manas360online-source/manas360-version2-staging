UPDATE "certifications"
SET
  "durationLabel" = '3 Months',
  "investmentLabel" = 'Free',
  "monthlyIncomeLabel" = NULL,
  "modulesCount" = 16,
  "deliveryMode" = NULL,
  "sessionRateLabel" = NULL,
  "outcomeLabel" = 'Personal Wellness',
  "prerequisitesLabel" = 'None',
  "primaryCtaLabel" = 'Start Free',
  "secondaryCtaLabel" = 'Learn More',
  "metadata" = jsonb_build_object(
    'journeyBadge', '🟦',
    'comparisonDuration', '3 months',
    'detailTitle', 'Certified Practitioner',
    'detailFields', jsonb_build_array(
      jsonb_build_object('label', 'Duration', 'value', '3 Months'),
      jsonb_build_object('label', 'Investment', 'value', 'Free'),
      jsonb_build_object('label', 'Modules', 'value', '16'),
      jsonb_build_object('label', 'Outcome', 'value', 'Personal Wellness')
    ),
    'future', jsonb_build_object(
      'enrollment', jsonb_build_object('enabled', true),
      'eligibilityTracking', jsonb_build_object('enabled', true),
      'certificateGeneration', jsonb_build_object('templateKey', 'CERT-PRACTITIONER-V1', 'status', 'planned')
    )
  ),
  "updatedAt" = NOW()
WHERE "code" = 'CERT-PRACTITIONER';

UPDATE "certifications"
SET
  "durationLabel" = '5 Weeks',
  "investmentLabel" = 'Free',
  "monthlyIncomeLabel" = '₹1,500+',
  "modulesCount" = 5,
  "deliveryMode" = 'WhatsApp',
  "sessionRateLabel" = NULL,
  "outcomeLabel" = NULL,
  "prerequisitesLabel" = 'ASHA/community worker',
  "primaryCtaLabel" = 'Enroll Free',
  "secondaryCtaLabel" = 'Learn More',
  "metadata" = jsonb_build_object(
    'journeyBadge', '🟩',
    'comparisonDuration', '5 weeks',
    'detailTitle', 'Certified ASHA Mental Wellness Champion',
    'detailFields', jsonb_build_array(
      jsonb_build_object('label', 'Duration', 'value', '5 Weeks'),
      jsonb_build_object('label', 'Monthly Income', 'value', '₹1,500+'),
      jsonb_build_object('label', 'Modules', 'value', '5'),
      jsonb_build_object('label', 'Delivery', 'value', 'WhatsApp')
    ),
    'future', jsonb_build_object(
      'enrollment', jsonb_build_object('enabled', true),
      'eligibilityTracking', jsonb_build_object('enabled', true),
      'certificateGeneration', jsonb_build_object('templateKey', 'CERT-ASHA-CHAMPION-V1', 'status', 'planned')
    )
  ),
  "updatedAt" = NOW()
WHERE "code" = 'CERT-ASHA-CHAMPION';

UPDATE "certifications"
SET
  "durationLabel" = '6 Weeks',
  "investmentLabel" = '₹15,000',
  "monthlyIncomeLabel" = '₹16K-60K',
  "modulesCount" = NULL,
  "deliveryMode" = NULL,
  "sessionRateLabel" = '₹800-2K',
  "outcomeLabel" = NULL,
  "prerequisitesLabel" = 'None',
  "primaryCtaLabel" = 'Enroll Now',
  "secondaryCtaLabel" = 'Learn More',
  "metadata" = jsonb_build_object(
    'journeyBadge', '🟨',
    'comparisonDuration', '6 weeks',
    'detailTitle', 'Certified NLP Therapist',
    'detailFields', jsonb_build_array(
      jsonb_build_object('label', 'Duration', 'value', '6 Weeks'),
      jsonb_build_object('label', 'Monthly Income', 'value', '₹16K-60K'),
      jsonb_build_object('label', 'Investment', 'value', '₹15,000'),
      jsonb_build_object('label', 'Session Rate', 'value', '₹800-2K')
    ),
    'future', jsonb_build_object(
      'enrollment', jsonb_build_object('enabled', true),
      'eligibilityTracking', jsonb_build_object('enabled', true),
      'certificateGeneration', jsonb_build_object('templateKey', 'CERT-NLP-THERAPIST-V1', 'status', 'planned')
    )
  ),
  "updatedAt" = NOW()
WHERE "code" = 'CERT-NLP-THERAPIST';

UPDATE "certifications"
SET
  "durationLabel" = '10 Weeks',
  "investmentLabel" = '₹20,000',
  "monthlyIncomeLabel" = '₹50K-87K',
  "modulesCount" = NULL,
  "deliveryMode" = NULL,
  "sessionRateLabel" = '₹2-3.5K',
  "outcomeLabel" = NULL,
  "prerequisitesLabel" = 'M.Phil/Ph.D + RCI',
  "primaryCtaLabel" = 'Enroll Now',
  "secondaryCtaLabel" = 'Learn More',
  "metadata" = jsonb_build_object(
    'journeyBadge', '🟧',
    'comparisonDuration', '10 weeks',
    'detailTitle', 'Certified Psychologist',
    'detailFields', jsonb_build_array(
      jsonb_build_object('label', 'Duration', 'value', '10 Weeks'),
      jsonb_build_object('label', 'Monthly Income', 'value', '₹50K-87K'),
      jsonb_build_object('label', 'Investment', 'value', '₹20,000'),
      jsonb_build_object('label', 'Session Rate', 'value', '₹2-3.5K')
    ),
    'future', jsonb_build_object(
      'enrollment', jsonb_build_object('enabled', true),
      'eligibilityTracking', jsonb_build_object('enabled', true),
      'certificateGeneration', jsonb_build_object('templateKey', 'CERT-PSYCHOLOGIST-V1', 'status', 'planned')
    )
  ),
  "updatedAt" = NOW()
WHERE "code" = 'CERT-PSYCHOLOGIST';

UPDATE "certifications"
SET
  "durationLabel" = '8 Weeks',
  "investmentLabel" = '₹25,000',
  "monthlyIncomeLabel" = '₹75K-1.5L',
  "modulesCount" = NULL,
  "deliveryMode" = NULL,
  "sessionRateLabel" = '₹2.5-5K',
  "outcomeLabel" = NULL,
  "prerequisitesLabel" = 'MD Psychiatry + NMC',
  "primaryCtaLabel" = 'Enroll Now',
  "secondaryCtaLabel" = 'Learn More',
  "metadata" = jsonb_build_object(
    'journeyBadge', '🟥',
    'comparisonDuration', '8 weeks',
    'detailTitle', 'Certified Psychiatrist',
    'detailFields', jsonb_build_array(
      jsonb_build_object('label', 'Duration', 'value', '8 Weeks'),
      jsonb_build_object('label', 'Monthly Income', 'value', '₹75K-1.5L'),
      jsonb_build_object('label', 'Investment', 'value', '₹25,000'),
      jsonb_build_object('label', 'Session Rate', 'value', '₹2.5-5K')
    ),
    'future', jsonb_build_object(
      'enrollment', jsonb_build_object('enabled', true),
      'eligibilityTracking', jsonb_build_object('enabled', true),
      'certificateGeneration', jsonb_build_object('templateKey', 'CERT-PSYCHIATRIST-V1', 'status', 'planned')
    )
  ),
  "updatedAt" = NOW()
WHERE "code" = 'CERT-PSYCHIATRIST';

UPDATE "certifications"
SET
  "durationLabel" = '6 Months',
  "investmentLabel" = '₹40,000',
  "monthlyIncomeLabel" = '₹70K-1.8L',
  "modulesCount" = NULL,
  "deliveryMode" = NULL,
  "sessionRateLabel" = '₹3.5-6K',
  "outcomeLabel" = NULL,
  "prerequisitesLabel" = 'One of above 3 professional certs',
  "primaryCtaLabel" = 'Enroll Now',
  "secondaryCtaLabel" = 'Learn More',
  "metadata" = jsonb_build_object(
    'journeyBadge', '🟪',
    'comparisonDuration', '6 months',
    'detailTitle', 'Certified Executive Therapist',
    'detailFields', jsonb_build_array(
      jsonb_build_object('label', 'Duration', 'value', '6 Months'),
      jsonb_build_object('label', 'Monthly Income', 'value', '₹70K-1.8L'),
      jsonb_build_object('label', 'Investment', 'value', '₹40,000'),
      jsonb_build_object('label', 'Session Rate', 'value', '₹3.5-6K')
    ),
    'future', jsonb_build_object(
      'enrollment', jsonb_build_object('enabled', true),
      'eligibilityTracking', jsonb_build_object('enabled', true),
      'certificateGeneration', jsonb_build_object('templateKey', 'CERT-EXEC-THERAPIST-V1', 'status', 'planned')
    )
  ),
  "updatedAt" = NOW()
WHERE "code" = 'CERT-EXEC-THERAPIST';
