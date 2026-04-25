import { Certification } from './CertificationTypes';

export const CERTIFICATIONS: Certification[] = [
  {
    id: 'cert-practitioner',
    slug: 'certified-practitioner',
    name: 'Certified Practitioner',
    description: 'Start with foundational psychoeducation and empathetic listening skills. Perfect for community champions and peer supporters.',
    badgeColor: 'blue',
    tier: 'Entry',
    duration_weeks: 12,
    price_inr: 0,
    monthly_income_min_inr: 0,
    monthly_income_max_inr: 0,
    requirements: [
      'Any graduate or 12th pass',
      'Self-paced online modules',
      'Community peer support practice',
      'Personal wellness growth',
    ],
    modulesCount: 5,
    prerequisites: ["None"],
    syllabusPdfUrl: "/syllabus/practitioner.pdf",
    modules: [
      { id: 'm1', title: 'Foundations of Peer Support', duration_minutes: 45, topics: ['What is Peer Support', 'Core Values'] },
      { id: 'm2', title: 'Empathetic Listening', duration_minutes: 60, topics: ['Active Listening', 'Building Trust'] }
    ],
    faqs: [
      { question: "Is this course free?", answer: "Yes, this course is completely free for everyone." }
    ],
    testimonials: [
      { id: 't1', name: 'Rahul', role: 'Student', avatar: 'https://i.pravatar.cc/150?u=rahul', text: 'Great starting point!', rating: 5 }
    ]
  },
  {
    id: 'cert-asha',
    slug: 'certified-asha-mental-wellness-champion',
    name: 'Certified ASHA Mental Wellness Champion',
    description: 'Specialized certification for ASHA workers and community health volunteers to integrate mental health awareness into primary care.',
    badgeColor: 'green',
    tier: 'Entry',
    duration_weeks: 5,
    price_inr: 0,
    monthly_income_min_inr: 1500,
    monthly_income_max_inr: 5000,
    requirements: [
      'Active ASHA / ANM / CHW',
      'Hybrid delivery (Online + Field)',
      'Grassroots mental health integration',
      'Community wellness leadership',
    ],
    modulesCount: 4,
    prerequisites: ["Active ASHA worker"],
    syllabusPdfUrl: "/syllabus/asha.pdf",
    modules: [
        { id: 'm1', title: 'Community Health Awareness', duration_minutes: 30, topics: ['Identifying Symptoms', 'Community Outreach'] }
    ],
    faqs: [],
    testimonials: []
  },
  {
    id: 'cert-nlp',
    slug: 'certified-nlp-therapist',
    name: 'Certified NLP Therapist',
    description: 'Advanced NLP-based therapeutic techniques for behavioral change, habit formation, and performance coaching.',
    badgeColor: 'yellow',
    tier: 'Professional',
    duration_weeks: 6,
    price_inr: 15000,
    monthly_income_min_inr: 16000,
    monthly_income_max_inr: 45000,
    requirements: [
      'No prerequisites required',
      'Online live sessions + practicum',
      'NLP & behavioral activation techniques',
      'Patient matching after certification',
    ],
    modulesCount: 12,
    prerequisites: ["None"],
    syllabusPdfUrl: "/syllabus/nlp.pdf",
    modules: [
        { id: 'm1', title: 'Introduction to NLP', duration_minutes: 60, topics: ['History of NLP', 'Core Principles'] }
    ],
    faqs: [],
    testimonials: []
  },
  {
    id: 'cert-psychologist',
    slug: 'certified-psychologist',
    name: 'Certified Psychologist',
    description: 'Comprehensive clinical psychology certification covering CBT, DBT, and evidence-based therapeutic modalities.',
    badgeColor: 'orange',
    tier: 'Professional',
    duration_weeks: 10,
    price_inr: 20000,
    monthly_income_min_inr: 50000,
    monthly_income_max_inr: 120000,
    requirements: [
      'M.Phil / Ph.D Psychology + RCI registration',
      'Supervised clinical practice',
      'Evidence-based therapy models',
      'Premium patient referral pipeline',
    ],
    modulesCount: 15,
    prerequisites: ["M.Phil / Ph.D in Psychology"],
    syllabusPdfUrl: "/syllabus/psychologist.pdf",
    modules: [
        { id: 'm1', title: 'Advanced CBT Techniques', duration_minutes: 120, topics: ['Cognitive Restructuring', 'Exposure Therapy'] }
    ],
    faqs: [],
    testimonials: []
  },
  {
    id: 'cert-psychiatrist',
    slug: 'certified-psychiatrist',
    name: 'Certified Psychiatrist',
    description: 'Advanced psychiatric credentialing for medical professionals with prescriptive authority and integrated care expertise.',
    badgeColor: 'red',
    tier: 'Professional',
    duration_weeks: 8,
    price_inr: 25000,
    monthly_income_min_inr: 75000,
    monthly_income_max_inr: 250000,
    requirements: [
      'MD Psychiatry + NMC registration',
      'Prescriptive authority integration',
      'Clinical rotation & case review',
      'Highest platform earning tier',
    ],
    modulesCount: 10,
    prerequisites: ["MD Psychiatry"],
    syllabusPdfUrl: "/syllabus/psychiatrist.pdf",
    modules: [
        { id: 'm1', title: 'Psychopharmacology', duration_minutes: 90, topics: ['Medication Management', 'Side Effects'] }
    ],
    faqs: [],
    testimonials: []
  },
  {
    id: 'cert-executive',
    slug: 'certified-executive-therapist',
    name: 'Certified Executive Therapist',
    description: 'Platinum-tier certification integrating consciousness work, somatic therapy, and executive coaching for high-impact transformation.',
    badgeColor: 'purple',
    tier: 'Mastery',
    duration_weeks: 24,
    price_inr: 40000,
    monthly_income_min_inr: 70000,
    monthly_income_max_inr: 500000,
    requirements: [
      'One of the 3 professional certifications',
      'Blended delivery (Online + Retreat)',
      'Western psychology + Eastern wisdom integration',
      'Master Faculty pathway available',
    ],
    modulesCount: 20,
    prerequisites: ["Professional Certification"],
    syllabusPdfUrl: "/syllabus/executive.pdf",
    modules: [
        { id: 'm1', title: 'Executive Coaching Lab', duration_minutes: 180, topics: ['Leadership Psychology', 'Somatic Coaching'] }
    ],
    faqs: [],
    testimonials: []
  },
];

export const ANALYTICS_DATA = [
  { name: 'Practitioner', enrollments: 142, revenue: 0 },
  { name: 'ASHA Champion', enrollments: 89, revenue: 0 },
  { name: 'NLP Therapist', enrollments: 65, revenue: 975000 },
  { name: 'Psychologist', enrollments: 42, revenue: 840000 },
  { name: 'Psychiatrist', enrollments: 28, revenue: 700000 },
  { name: 'Executive', enrollments: 15, revenue: 600000 },
];

export const MOCK_ENROLLMENTS = [
  { 
    id: 'ENR-8392', 
    certificationName: 'Certified NLP Therapist', 
    enrollmentDate: 'Oct 12, 2023', 
    amountPaid: 15000, 
    paymentStatus: 'Paid', 
    completionPercentage: 100 
  },
  { 
    id: 'ENR-8395', 
    certificationName: 'Certified Practitioner', 
    enrollmentDate: 'Oct 14, 2023', 
    amountPaid: 0, 
    paymentStatus: 'Paid', 
    completionPercentage: 45 
  },
  { 
    id: 'ENR-8402', 
    certificationName: 'Certified Psychologist', 
    enrollmentDate: 'Oct 15, 2023', 
    amountPaid: 20000, 
    paymentStatus: 'Paid', 
    completionPercentage: 12 
  },
  { 
    id: 'ENR-8410', 
    certificationName: 'Executive Therapist', 
    enrollmentDate: 'Oct 18, 2023', 
    amountPaid: 13333, 
    paymentStatus: 'Partial', 
    completionPercentage: 5 
  },
];

export const MOCK_LEADS = [
  {
    id: 1,
    name: 'Amit Sharma',
    age: 28,
    concern: 'Anxiety & Work Stress',
    severity: 'High',
    exclusiveUntil: new Date(Date.now() + 1000 * 60 * 60 * 5).toISOString(),
    isContacted: false,
  },
  {
    id: 2,
    name: 'Priya Patel',
    age: 34,
    concern: 'Post-partum depression',
    severity: 'Medium',
    exclusiveUntil: new Date(Date.now() + 1000 * 60 * 60 * 2).toISOString(),
    isContacted: true,
  },
  {
    id: 3,
    name: 'Vikram Singh',
    age: 45,
    concern: 'Sleep disorders',
    severity: 'Low',
    exclusiveUntil: new Date(Date.now() - 1000 * 60 * 60 * 1).toISOString(),
    isContacted: false,
  },
] as const;
