import { useEffect, useMemo, useState } from 'react';
import './HowItWorksPage.css';

type JourneyId =
  | 'home'
  | 'discover'
  | 'group'
  | 'patient'
  | 'provider'
  | 'corporate'
  | 'retreat'
  | 'training'
  | 'admin'
  | 'onboarding'
  | 'executive'
  | 'nri';

interface StatItem {
  icon: string;
  text: string;
}

interface StepItem {
  title: string;
  description: string;
  action: string;
}

interface JourneyContent {
  heading: string;
  description: string;
  stats: StatItem[];
  steps: StepItem[];
  swapTitle: string;
  swapDescription?: string;
  swapButtons: Array<{ id: JourneyId; label: string; active?: boolean }>;
  tipTitle: string;
  tipText: string;
  next: { id: JourneyId; label: string };
}

const labels: Record<JourneyId, string> = {
  home: 'Home',
  discover: 'Not Sure-Discover Myself',
  group: 'Group Therapies-My Topic-Pay Less',
  patient: 'Mental Wellness Seeker',
  provider: 'Provider Journey',
  corporate: 'IT HR Head / Corp CSR / Hospital Admin / College Admin',
  retreat: 'Detox-Slow-Tranquility-Find a Spark Again',
  training: 'Certify-Earn More Journey',
  admin: 'MANAS360-Admin',
  onboarding: 'Anyone Onboarding-Jiffy',
  executive: 'Executive-One on One Goals-Manifest',
  nri: 'NRI-Janmabhoomi Connection-Heal',
};

const roleCards: Array<{ id: JourneyId; icon: string; title: string; description: string }> = [
  {
    id: 'discover',
    icon: '🔍',
    title: 'Not Sure-Discover Myself',
    description:
      'Free screening, AnytimeBUDDY, digital pet, sound therapy, Dr. Meera chat. Try free. No commitment.',
  },
  {
    id: 'group',
    icon: '👥',
    title: 'Group Therapies-My Topic-Pay Less',
    description: 'Join group therapy sessions with 4-8 people. Same clinical depth, fraction of the cost.',
  },
  {
    id: 'patient',
    icon: '🌟',
    title: 'Mental Wellness Seeker',
    description:
      'Experience MANS360 as someone seeking transformational mental health support. From discovery to lasting change.',
  },
  {
    id: 'provider',
    icon: '👨‍⚕️',
    title: 'Provider Journey',
    description: 'See how therapists onboard, manage clients, and grow their practice on MANS360.',
  },
  {
    id: 'corporate',
    icon: '💼',
    title: 'IT HR Head / Corp CSR / Hospital Admin / College Admin Mental Wellness Journey',
    description:
      'Implement team/institutional wellness, measure outcomes, and support mental health at scale.',
  },
  {
    id: 'retreat',
    icon: '🌿',
    title: 'Detox-Slow-Tranquility-Find a Spark Again Retreats',
    description: '7-14 day intensive retreat. Digital detox. Nature. Therapy + naturo-therapy. Rediscover joy.',
  },
  {
    id: 'training',
    icon: '💰',
    title: 'Certify-Earn More Journey',
    description:
      'Get trained, earn certification, unlock income. Build a sustainable livelihood through MANS360.',
  },
  {
    id: 'admin',
    icon: '⚙️',
    title: 'MANAS360-Admin',
    description:
      'Manage therapists, track outcomes, handle incidents, and keep the platform running smoothly.',
  },
  {
    id: 'onboarding',
    icon: '⚡',
    title: 'Anyone Onboarding-Jiffy',
    description: 'Quick, seamless onboarding for everyone. Registration to first interaction in minutes.',
  },
  {
    id: 'executive',
    icon: '🎯',
    title: 'Executive-One on One Focused Goals-Manifest',
    description:
      'High-touch therapy for busy leaders. 1-on-1 sessions focused on performance, clarity, purpose.',
  },
  {
    id: 'nri',
    icon: '🌏',
    title: 'NRI-Find a Janmabhoomi Connection-Heal',
    description:
      'For Indians abroad. Therapy + cultural reconnection. Find your roots, heal your heart.',
  },
];

const journeyData: Record<Exclude<JourneyId, 'home'>, JourneyContent> = {
  discover: {
    heading: '🔍 Not Sure-Discover Myself: The Free Explorer',
    description:
      'No commitment. No risk. Just explore MANS360 with free tools. Perfect for people curious but not ready to book.',
    stats: [
      { icon: '💰', text: '100% Free to start' },
      { icon: '⏱️', text: '15-30 min to experience' },
      { icon: '📱', text: 'All features on mobile' },
    ],
    steps: [
      {
        title: 'Free Screening: "Am I okay?"',
        description: 'Take a free 2-minute mental health screening. PHQ-9 or GAD-7 assessment. Instant results (no email required).',
        action: 'Take free screening',
      },
      {
        title: 'AnytimeBUDDY Meet Chintu: "Your free companion"',
        description: 'Meet Chintu, your dopamine buddy. Tap for encouragement, get motivational messages, celebrate small wins. No login needed.',
        action: 'Play with Chintu',
      },
      {
        title: 'Digital Pet: "Your healing buddy"',
        description: 'Adopt a free digital pet. Care for it, watch it grow. Gamified wellness: feeding = hydration, playing = movement.',
        action: 'Adopt your pet',
      },
      {
        title: 'Sound Therapy: "Calm your mind"',
        description: 'Access 10 free soundscapes: forest rain, ocean waves, meditation bells. 5-30 minutes each. Pure relaxation.',
        action: 'Browse soundtracks',
      },
      {
        title: 'Dr. Meera Chat: "2 min with a doctor"',
        description: 'Text or audio chat with Dr. Meera (AI companion). 2 minutes free per day. Ask about symptoms, get gentle guidance.',
        action: 'Chat with Dr. Meera',
      },
      {
        title: 'Free Certification Module: "Learn basics"',
        description: 'Access Module 1 free: "Understanding Mental Health Basics." Video + quiz. See what full training includes.',
        action: 'Start module 1',
      },
      {
        title: 'Gentle Upgrade Path: "Ready for more?"',
        description: 'Based on screening results, see personalized recommendations: Group therapy (₹500/session), 1-on-1 (₹1000/session), Retreat (₹25K+). All optional.',
        action: 'View recommendations',
      },
    ],
    swapTitle: '🔄 Want a different experience?',
    swapButtons: [
      { id: 'group', label: 'Group Therapies' },
      { id: 'patient', label: 'Mental Wellness Seeker' },
      { id: 'discover', label: '← Back to Free', active: true },
    ],
    tipTitle: '💡 Why Free Tools?',
    tipText:
      'MANS360 believes exploration should be free. These tools help you understand where you stand, introduce our approach, and build trust. No gates. No pressure. Just genuine tools that work.',
    next: { id: 'group', label: 'See Group Therapy Journey →' },
  },
  group: {
    heading: '👥 Group Therapies-My Topic-Pay Less: Heal Together',
    description:
      'Same clinical depth as 1-on-1, but in a group of 4-8 people on YOUR topic. Build community. Share stories. Pay less. Heal more.',
    stats: [
      { icon: '💵', text: '₹500-2K per session' },
      { icon: '👥', text: 'Groups of 4-8 people' },
      { icon: '🎯', text: 'Weekly or bi-weekly' },
    ],
    steps: [
      { title: 'Browse Group Options: "Find your fit"', description: 'See available groups by topic: Anxiety Circle, Burnout Recovery, Life Transitions, Relationship Healing, Grief & Loss, Career Clarity, Parenting Stress, Identity Questions. Each has therapist profile, schedule, cost.', action: 'Browse group options' },
      { title: 'Group Interview: "Meet the therapist & group"', description: 'Attend a free 15-min group intro call. Meet the therapist. Hear what others are working on. Ask questions. Make sure it\'s right for you.', action: 'Schedule group intro' },
      { title: 'First Group Session: "You belong here"', description: 'Join your first 60-90 min session. Therapist creates safe space. People share their stories. You realize: You\'re not alone. Others get it.', action: 'Join first session' },
      { title: 'Weekly Participation: "The work"', description: 'Commit to 8-week or 12-week group. Show up weekly. Share. Listen. Learn. Your story becomes part of someone else\'s healing.', action: 'Commit to 8-week cycle' },
      { title: 'Community Bonds: "Find your people"', description: 'Exchange WhatsApp contacts (optional). Support each other between sessions. Text a group member when you\'re struggling. Real friendships form.', action: 'Join WhatsApp circle' },
      { title: 'Cycle Completion: "You have grown"', description: 'After 8-12 weeks, reflect on what changed. Measure progress (PHQ-9 before/after). Decide: Continue with group, try 1-on-1, take a break, graduate.', action: 'Take completion survey' },
      { title: 'Alumni Community: "Forever connected"', description: 'Join MANS360 alumni community. Monthly meetups (virtual or in-person). Guest speakers. Wellness workshops. Your group becomes lifelong connection.', action: 'Join alumni circle' },
    ],
    swapTitle: '🔄 Compare other pathways',
    swapButtons: [
      { id: 'discover', label: 'Free Explorer' },
      { id: 'patient', label: 'Mental Wellness Seeker' },
      { id: 'group', label: '← Back to Groups', active: true },
    ],
    tipTitle: '💡 Why Groups?',
    tipText:
      'Healing is social. Group therapy is 40% cheaper than 1-on-1, but research shows equal or better outcomes. Why? Because hearing others\' stories normalizes yours. Because helping someone else heal, heals you. Because you make friends who truly get it.',
    next: { id: 'patient', label: 'See Mental Wellness Seeker →' },
  },
  patient: {
    heading: '🌟 Mental Wellness Seeker: From Struggle to Transformation',
    description:
      'Experience MANS360 as someone seeking transformational mental health support. This journey shows how someone discovers, books, and participates in a retreat.',
    stats: [
      { icon: '⏱️', text: '5 min to explore' },
      { icon: '🎯', text: 'Discovery → Qualification → Booking → Retreat' },
      { icon: '📱', text: 'Mobile-optimized' },
    ],
    steps: [
      { title: 'Discovery: "I\'m struggling"', description: 'You land on MANS360 via LinkedIn or search. See relatable messaging about burnout, anxiety, or depression. No login required to browse.', action: 'Click to explore landing page' },
      { title: 'Exploration: "What is this?"', description: 'Explore the "HOW IT WORKS" section. See retreat options (Solo Detox, Couple\'s Healing, Corporate), pricing, and therapist profiles. Watch 2-min video explaining the model.', action: 'Browse retreat options' },
      { title: 'Qualification: "Is this right for me?"', description: 'Book a free 15-min consultation call. Quick health screening confirms you\'re safe for group retreat. Discuss preferences (location, language, dates).', action: 'Schedule consultation' },
      { title: 'Booking: "Let\'s do this"', description: 'Select retreat date/location, make payment via PhonePe. Receive confirmation email with onboarding sequence.', action: 'Complete booking' },
      { title: 'Pre-Retreat: "Getting ready"', description: 'Receive daily emails: Day 1 = Welcome + therapist bio, Day 3 = Retreat schedule, Day 5 = Packing list + travel logistics, Day 7 = Final check-in call.', action: 'Download pre-retreat materials' },
      { title: 'Retreat: "The transformation"', description: '7-day intensive: therapy + naturo-therapy + nature. Use AnytimeBUDDY app for dopamine hits between sessions.', action: 'Explore retreat schedule' },
      { title: 'Post-Retreat: "Sustaining the change"', description: 'Attend 4 virtual follow-up sessions (bi-weekly). Take PHQ-9 assessment. Join alumni community.', action: 'View 6-month support plan' },
    ],
    swapTitle: '🔄 Want to see a different perspective?',
    swapDescription: 'Try exploring the journey from a therapist\'s or HR manager\'s view. See how the same events look from different roles.',
    swapButtons: [
      { id: 'provider', label: 'Provider View' },
      { id: 'corporate', label: 'Corporate View' },
      { id: 'patient', label: '← Back to Wellness Seeker', active: true },
    ],
    tipTitle: '💡 Key Insights',
    tipText:
      'MANS360 minimizes friction: no login until ready, free consultation removes commitment anxiety, and post-retreat support ensures transformation lasts.',
    next: { id: 'provider', label: 'See Provider View →' },
  },
  provider: {
    heading: '👨‍⚕️ Provider Journey: Build Your Practice',
    description:
      'Experience MANS360 as a therapist or mental health professional. See how providers register, manage clients, and grow their practice.',
    stats: [
      { icon: '⏱️', text: '5-7 min to explore' },
      { icon: '🎯', text: 'Registration → Onboarding → Client Management → Retreats' },
      { icon: '📊', text: 'Real-time analytics & earnings' },
    ],
    steps: [
      { title: 'Registration: "Join our network"', description: 'Therapist creates account with email, NMC/RCI credentials uploaded. No approval delay — credentials verified within 48 hours in background.', action: 'Start registration' },
      { title: 'Profile Setup: "Tell your story"', description: 'Complete profile: bio, specializations, languages offered, availability, hourly rate. Photo & verified badge displayed. Profile visible to patients immediately.', action: 'Build provider profile' },
      { title: 'Onboarding Training: "Get trained"', description: '4-week onboarding: MANS360 clinical protocols, naturo-therapy basics, crisis management, patient matching algorithm. Weekly sync with Clinical Lead (Dr. Sindhuja).', action: 'Explore onboarding modules' },
      { title: 'Client Onboarding: "First patient"', description: 'Receive patient match from platform. Initial consultation (free 15-min) scheduled. Build therapeutic alliance, assess fit.', action: 'View client intake form' },
      { title: 'Therapy Sessions: "The work"', description: 'Conduct video or in-person sessions. Track progress, assign homework, monitor PHQ-9 scores.', action: 'Access session templates' },
      { title: 'Retreat Leadership: "Go deep"', description: 'Lead 7-14 day intensive retreat. Facilitate group therapy, individual check-ins, integrate naturo-therapy.', action: 'Review retreat protocols' },
      { title: 'Earnings & Growth: "Scale your impact"', description: 'Earn 60% of session fees, 60% of retreat revenue. Real-time earnings dashboard. Referral bonuses for patient acquisition. Access to supervision/training for growth.', action: 'View earnings model' },
    ],
    swapTitle: '🔄 How does this compare to other platforms?',
    swapDescription: 'See how patients experience this same provider\'s work — understand the full ecosystem from both sides.',
    swapButtons: [
      { id: 'patient', label: 'Mental Wellness Seeker View' },
      { id: 'training', label: 'Certify-Earn More View' },
      { id: 'provider', label: '← Back to Provider', active: true },
    ],
    tipTitle: '💡 Key Insights for Providers',
    tipText:
      'MANS360 is built for therapists: 60% revenue share, specialized protocols, built-in patient base, and real-time clinical support.',
    next: { id: 'corporate', label: 'See Corporate View →' },
  },
  corporate: {
    heading: '💼 IT HR Head / Corp CSR / Hospital Admin / College Admin Mental Wellness Journey',
    description:
      'Experience MANS360 as an HR leader, CSR manager, hospital administrator, or college wellness coordinator.',
    stats: [
      { icon: '👥', text: '25-1000 person groups' },
      { icon: '📊', text: 'ROI: -40% burnout, +12% retention' },
      { icon: '💰', text: '₹35-60K per person' },
    ],
    steps: [
      { title: 'Discovery: "We need a solution"', description: 'HR leader sees MANS360 LinkedIn post about wellness solutions. Recognizes burnout in team. Books 20-min discovery call with MANS360 corporate specialist.', action: 'Schedule discovery call' },
      { title: 'Proposal & Budget: "Business case"', description: 'MANS360 sends proposal: 40-person team, 5-7 day retreat, 2 groups. Cost: ₹16L total (₹40K per person). ROI: 12% retention improvement = ₹40L+ savings. Budget approved.', action: 'View sample proposal' },
      { title: 'Baseline Assessment: "Measure before"', description: 'HR sends anonymous survey to team: PHQ-9, GAD-7, Team Dynamics Assessment, engagement. Baseline metrics captured. Data completely anonymized.', action: 'View baseline questionnaire' },
      { title: 'Team Registration: "Enrollment"', description: 'HR shares enrollment link with team. Employees select retreat dates. Confidential health screening completed by MANS360 clinician.', action: 'Enroll team members' },
      { title: 'Retreat Delivery: "Transformation week"', description: '5-7 day intensive at resort. Group therapy + trust-building activities + individual check-ins + nature immersion. MANS360 therapists run groups, managers trust the process.', action: 'Explore daily itinerary' },
      { title: 'Post-Retreat: "Sustain the gains"', description: 'Monthly virtual group sessions (6 months). Quarterly micro-retreats. HR dashboard shows real-time engagement metrics. Employee wellness scores tracked.', action: 'View 6-month support plan' },
      { title: 'Impact Measurement: "Prove the ROI"', description: '6-month post-retreat: Repeat baseline assessment. Results: 40% avg burnout drop, 12% retention improvement, 35% team trust increase. Case study published with permission.', action: 'View impact report' },
    ],
    swapTitle: '🔄 Understand the team experience',
    swapDescription: 'Your team members go through the Mental Wellness Seeker journey. See what they experience.',
    swapButtons: [
      { id: 'patient', label: 'Employee/Seeker View' },
      { id: 'admin', label: 'Operations View' },
      { id: 'corporate', label: '← Back to Corp HR', active: true },
    ],
    tipTitle: '💡 Key Insights for Corporate Leaders',
    tipText:
      'This is a measured intervention with clinical depth, ongoing support, and proven ROI.',
    next: { id: 'retreat', label: 'See Retreat Journey →' },
  },
  retreat: {
    heading: '🌿 Detox-Slow-Tranquility-Find a Spark Again Retreats',
    description:
      '7-14 day intensive retreat. Leave burnout behind. Rediscover joy, purpose, yourself. Digital detox and nature immersion.',
    stats: [
      { icon: '📍', text: 'Goa, Kerala, Himalayas, Coorg' },
      { icon: '💵', text: '₹25K-75K' },
      { icon: '🌍', text: '6-month post-retreat support' },
    ],
    steps: [
      { title: 'Discovery: "I need to get away"', description: 'You land on MANS360. See retreat options: Solo Detox (₹25-75K), Couple\'s Healing (₹80K), Corporate Group (₹35-60K/person). Each promises transformation.', action: 'Explore retreat options' },
      { title: 'Pre-Retreat Preparation: "Getting ready"', description: 'Email sequence: Day 1 = Welcome + therapist bio, Day 3 = Retreat schedule, Day 5 = Packing list + travel info, Day 7 = Final check-in call with therapist.', action: 'Download pre-retreat kit' },
      { title: 'Arrival: "You\'re here. Finally."', description: 'Land at resort. Leave your phone (digital detox protocol). Room key, retreat schedule, welcome dinner. Meet your group. Nerves + hope.', action: 'Check in' },
      { title: 'Daily Rhythm: "The transformation"', description: '6:30 AM Yoga → 8:30 AM Therapy group → 1:30 PM Naturo-therapy (Shirodhara/Abhyanga) → 5 PM Activity (forest bath, gardening) → 7 PM Circle (sharing). Repeat 7-14 days.', action: 'View daily schedule' },
      { title: 'Breakthroughs: "Things shift"', description: 'Around day 3-4, something clicks. Walls come down. You cry. You laugh. You realize what you\'ve been carrying. Therapist is there. Your group holds you.', action: 'Read breakthrough stories' },
      { title: 'Closure & Commitment: "The last night"', description: 'Final circle. People share transformations. Therapist gives you "home protocols" (herbal remedies, daily practices). You get video testimonial (optional).', action: 'Plan home practices' },
      { title: 'Post-Retreat: "Sustaining the change"', description: 'Bi-weekly follow-up sessions, reassessment, alumni support, and ongoing options.', action: 'View 6-month support' },
    ],
    swapTitle: '🔄 Different retreat pathways',
    swapButtons: [
      { id: 'group', label: 'Group Therapy (cheaper start)' },
      { id: 'executive', label: 'Executive 1-on-1' },
      { id: 'retreat', label: '← Back to Retreat', active: true },
    ],
    tipTitle: '💡 Why Intensive?',
    tipText:
      'Transformation requires depth. Immersive therapy + nature + community can accelerate healing significantly.',
    next: { id: 'training', label: 'See Certify-Earn More →' },
  },
  training: {
    heading: '💰 Certify-Earn More Journey: Build Your Income',
    description:
      'See how community health workers get trained, certified, and unlock sustainable income through MANS360.',
    stats: [
      { icon: '⏱️', text: '6-8 weeks to certification' },
      { icon: '💵', text: 'Earn ₹5-15K/month post-certification' },
      { icon: '📍', text: 'On-site and online hybrid training' },
    ],
    steps: [
      { title: 'Recruitment: "Join the mission"', description: 'ASHA/CHW in a village hears about MANS360 mental health training. Minimal qualifications: class 8+ education, interest in mental health, willingness to learn.', action: 'View recruitment flyer' },
      { title: 'Induction: "Welcome aboard"', description: '1-day workshop in nearby district center. Introduction to MANS360 model, mobile app demo, community health context. Receive training kit (manual, flashcards, certificate template).', action: 'Explore training materials' },
      { title: 'Module Learning: "The 5Why + ECI Framework"', description: 'Weeks 1-4: Learn 5 core modules via blended approach (videos + group sessions + WhatsApp support). Topics: NLP fundamentals, empathy, 5Why framework, crisis identification.', action: 'Access module 1: NLP Basics' },
      { title: 'Practical Sessions: "Learn by doing"', description: 'Weeks 5-6: Role-play exercises with facilitators. Practice IVR conversations, PHQ-9 screening, community outreach. Video recorded for feedback.', action: 'Practice role-plays' },
      { title: 'Certification Exam: "Prove mastery"', description: 'Weeks 7: Written + practical exam. 60% pass threshold. Covers NLP concepts, crisis protocols, IVR system, ethical guidelines.', action: 'Take practice exam' },
      { title: 'Deployment: "Go to your village"', description: 'Certified CHW returns to village with MANS360 app + IVR system. Starts identifying people in mental health crisis via community conversations. Routes them to platform for professional help.', action: 'View deployment checklist' },
      { title: 'Ongoing Support & Growth: "Build your income"', description: 'Monthly group video calls with trainer. WhatsApp support channel. Quarterly refresher modules. Escalation path for complex cases. Incentive payments for successful referrals (₹500-2K per referral). Participate in group therapy sessions for additional income. Some CHWs earn ₹8-15K/month with consistent effort.', action: 'View income opportunity details' },
    ],
    swapTitle: '🔄 How does this income fit into the ecosystem?',
    swapDescription: 'CHWs are the backbone of rural reach. Your referrals create care access and impact.',
    swapButtons: [
      { id: 'patient', label: 'Mental Wellness Seeker View' },
      { id: 'provider', label: 'Provider View' },
      { id: 'training', label: '← Back to Certify-Earn', active: true },
    ],
    tipTitle: '💡 Key Insights for CHWs',
    tipText:
      'This is not just training. It is an income pathway that also helps communities access mental health support.',
    next: { id: 'admin', label: 'See Admin View →' },
  },
  admin: {
    heading: '⚙️ MANAS360-Admin: Keeping the Platform Running',
    description:
      'Experience MANS360 from operations perspective: quality, safety, compliance, and platform growth.',
    stats: [
      { icon: '📊', text: 'Real-time dashboards and alerts' },
      { icon: '🔍', text: 'Therapist management and compliance' },
      { icon: '🚨', text: 'Incident and crisis tracking' },
    ],
    steps: [
      { title: 'Daily Dashboard: "The pulse"', description: 'Every morning, Admin checks platform health: active users, therapist workload, incident log, revenue metrics. Automated alerts flag issues (therapist overload, safety concerns).', action: 'View admin dashboard' },
      { title: 'Therapist Onboarding: "Add to network"', description: 'New therapist applies. Admin verifies NMC/RCI credentials, reviews background check, confirms training completion. Profile goes live with "Verified" badge.', action: 'Process therapist application' },
      { title: 'Quality Monitoring: "Ensure excellence"', description: 'Weekly spot-checks: review 2-3 therapy session recordings (consent obtained). Patient NPS scores monitored. If issues detected, coaching conversation with therapist + supervisor.', action: 'View QA checklist' },
      { title: 'Incident Management: "Safety first"', description: 'Incident reported (e.g., suicidal ideation, crisis). Admin logs it, triggers escalation to Clinical Lead. Follow-up protocol initiated. Data tracked for patterns & improvement.', action: 'Review incident protocols' },
      { title: 'Retreat Operations: "Execute flawlessly"', description: 'Month before retreat: venue booked, therapists assigned, naturo-doctors confirmed, transportation arranged. Daily check-ins during retreat. Post-retreat debrief & learnings documented.', action: 'View retreat checklist' },
      { title: 'Outcomes Tracking: "Measure impact"', description: 'All participants take PHQ-9/GAD-7 pre/post/3-month/6-month. Admin tracks aggregated metrics: avg improvement %, retention rate, case study opportunities.', action: 'View outcomes dashboard' },
      { title: 'Business Intelligence: "Make decisions"', description: 'Monthly reports: revenue by pathway, therapist performance ranking, patient lifetime value, churn risk analysis. Data informs hiring, location expansion, pricing adjustments.', action: 'View BI reports' },
    ],
    swapTitle: '🔄 The full ecosystem',
    swapDescription: 'Admins ensure excellence across all user journeys and the full care network.',
    swapButtons: [
      { id: 'patient', label: 'Mental Wellness Seeker View' },
      { id: 'provider', label: 'Provider View' },
      { id: 'admin', label: '← Back to Admin', active: true },
    ],
    tipTitle: '💡 Key Insights for Operations',
    tipText:
      'One view across clinical quality, business performance, and safety enables sustainable growth.',
    next: { id: 'onboarding', label: 'See Onboarding Journey →' },
  },
  onboarding: {
    heading: '⚡ Anyone Onboarding-Jiffy: Registration to Access in Minutes',
    description:
      'Quick and seamless onboarding for everyone. Signup to first interaction in minutes.',
    stats: [
      { icon: '🚀', text: 'Minutes from signup to access' },
      { icon: '✅', text: 'All roles supported' },
      { icon: '📱', text: 'Mobile-first design' },
    ],
    steps: [
      { title: 'Quick Registration: "Just email & password"', description: 'Enter email, create password. Choose role (Patient, Therapist, CHW, Corporate, Admin). No 20-page forms. No verification delays.', action: 'Start registration' },
      { title: 'Profile Completion: "Tell us just enough"', description: 'Name, location, phone (optional). For therapists: NMC/RCI credential upload (optional now, required before accepting patients). Minimal friction.', action: 'Complete profile' },
      { title: 'Email Verification: "Instant"', description: 'Click verification link in email (2 seconds). Account activated. Ready to explore.', action: 'Verify email' },
      { title: 'Access Granted: "You\'re in"', description: 'Immediate access to role-specific dashboard. Patients see retreat options. Therapists see patient queue. CHWs see IVR system. Corporate see enrollment tools.', action: 'View dashboard' },
      { title: 'First Action: "Start immediately"', description: 'Patient: Browse & book. Therapist: View first patient. CHW: Download app. Corporate: Enroll team. No "welcome email delays" or "pending approval" messages.', action: 'Take first action' },
      { title: 'Optional Enrichment: "As you go"', description: 'Complete additional details as needed: Therapist can add bio/specializations later. Corporate can upload team roster later. Patient can add health history later. Nothing blocks access.', action: 'Add details' },
      { title: 'Ongoing Support: "We\'re here"', description: 'In-app help, chat support, email. But most people don\'t need it — the experience is intuitive. Less onboarding friction = higher adoption.', action: 'Get support' },
    ],
    swapTitle: '🔄 See role-specific experiences',
    swapDescription: 'After Jiffy onboarding, each role has their own journey. Explore what they do next.',
    swapButtons: [
      { id: 'patient', label: 'Mental Wellness Seeker Next' },
      { id: 'provider', label: 'Provider Next' },
      { id: 'onboarding', label: '← Back to Jiffy', active: true },
    ],
    tipTitle: '💡 Why Jiffy?',
    tipText:
      'Friction kills adoption. Faster onboarding means more people experience care and convert based on value.',
    next: { id: 'executive', label: 'See Executive Journey →' },
  },
  executive: {
    heading: '🎯 Executive-One on One Focused Goals-Manifest',
    description:
      'For busy leaders. High-touch 1-on-1 therapy focused on performance, clarity, and purpose.',
    stats: [
      { icon: '⏱️', text: 'Flexible scheduling (early mornings, weekends)' },
      { icon: '💵', text: '₹2000-5000 per session' },
      { icon: '📱', text: 'Video or in-person' },
    ],
    steps: [
      { title: 'Initial Consultation: "Let\'s understand you"', description: '60-min deep dive with senior therapist. What are you struggling with? Performance anxiety? Imposter syndrome? Decision fatigue? Leadership isolation? Set clear goals for therapy.', action: 'Schedule consultation' },
      { title: 'Therapist Match: "Your dedicated therapist"', description: 'Assigned a senior therapist experienced with C-suite executives. They understand pressure, stakes, confidentiality. You\'re not just a case number. You\'re their focus.', action: 'Meet your therapist' },
      { title: 'Weekly Sessions: "The work"', description: '60-90 min weekly sessions. Flexible timing (7 AM, 6 PM, weekends). Focus on: decision-making clarity, stress management, relationship challenges, purpose/legacy questions.', action: 'Schedule recurring sessions' },
      { title: 'Performance Coaching: "Clarity in action"', description: 'Therapy + executive coaching hybrid. Between sessions, your therapist tracks your progress on stated goals. Practical strategies tailored to your role.', action: 'Track progress' },
      { title: 'Leadership Resilience: "You\'re stronger"', description: 'After 12 weeks: Clearer decisions, better boundaries, less imposter syndrome. Better presence with team. More authentic leadership. People notice you\'re different.', action: 'Measure progress' },
      { title: 'Ongoing Optimization: "Continue or graduate"', description: 'After initial goals achieved: Continue monthly check-ins, pause during slower seasons, or graduate. Therapist remains available for future crises or transitions.', action: 'Plan next phase' },
      { title: 'Executive Alumni Network: "Peer community"', description: 'Join exclusive alumni circle of other executives who\'ve done deep work. Quarterly confidential mastermind sessions. Support network of peers who understand.', action: 'Join mastermind' },
    ],
    swapTitle: '🔄 How does this compare?',
    swapButtons: [
      { id: 'retreat', label: 'Retreat (intensive immersion)' },
      { id: 'group', label: 'Group (community healing)' },
      { id: 'executive', label: '← Back to 1-on-1', active: true },
    ],
    tipTitle: '💡 Why Executives Choose This',
    tipText:
      'Privacy, scheduling flexibility, and therapist expertise aligned to leadership realities.',
    next: { id: 'nri', label: 'See NRI Journey →' },
  },
  nri: {
    heading: '🌏 NRI-Find a Janmabhoomi Connection-Heal',
    description:
      'For Indians abroad seeking cultural roots and emotional reconnection. Therapy plus Janmabhoomi connection.',
    stats: [
      { icon: '🌍', text: 'Global time zones (match any timezone)' },
      { icon: '💵', text: '₹1500-4000 per session' },
      { icon: '🗣️', text: 'Hindi, English, regional languages' },
    ],
    steps: [
      { title: 'Recognition: "I\'m homesick but can\'t go home"', description: 'You\'re in London, US, Singapore, Australia. Successful career. Good life. But something\'s missing. The sounds. The smells. The people who \"get you\" without explaining.', action: 'Share your story' },
      { title: 'Therapist Match: "Someone who knows Janmabhoomi"', description: 'Matched with therapist (Indian-origin, based in India or abroad) who specializes in NRI displacement. They understand the unique pain: success far from home, cultural dissonance, identity questions.', action: 'Connect with therapist' },
      { title: 'Emotional Excavation: "What you\'re really grieving"', description: 'Weekly sessions (scheduled for your timezone) exploring: What does \"home\" mean to you? Who do you miss most? What would reconnecting look like? Permission to feel the loss.', action: 'Begin therapy journey' },
      { title: 'Cultural Reconnection Sessions: "Heal through roots"', description: 'Specialized sessions combining therapy + cultural work: listening to grandmother\'s stories (recorded sessions), exploring regional poetry/songs, connecting with diaspora community online.', action: 'Explore cultural practices' },
      { title: 'Integration: "You can be both"', description: 'Realization: You don\'t have to choose. You can be successful abroad AND have roots. You can miss India AND love your new home. You can honor both identities.', action: 'Integration work' },
      { title: 'Action Plan: "Bridge the distance"', description: 'With therapist: Plan reconnection (visit timing, call family more, learn regional language, join diaspora community, start projects that honor your roots).', action: 'Create action plan' },
      { title: 'Ongoing Connection: "The threads hold"', description: 'Monthly sessions (ongoing). Join MANS360 NRI community (WhatsApp, Slack). Share stories with others doing the same work. Longing transforms into belonging.', action: 'Join NRI community' },
    ],
    swapTitle: '🔄 Other journeys for you',
    swapButtons: [
      { id: 'executive', label: 'Executive 1-on-1 (high-touch)' },
      { id: 'discover', label: 'Free Explorer (try first)' },
      { id: 'nri', label: '← Back to NRI', active: true },
    ],
    tipTitle: '💡 Why NRI-Specific?',
    tipText:
      'Homesickness is real grief. It\'s not weakness. It\'s displacement. You\'ve sacrificed proximity to home for opportunity. That\'s a real loss. This therapy honors that loss while helping you build new roots without abandoning old ones. You\'re not broken. You\'re just healing displacement.',
    next: { id: 'discover', label: 'Start Your Journey →' },
  },
};

const HowItWorksPage = () => {
  const [activeSection, setActiveSection] = useState<JourneyId>('home');

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [activeSection]);

  useEffect(() => {
    document.title = 'MANS360 Interactive Demo — Explore All Journeys';
  }, []);

  const currentLabel = useMemo(() => labels[activeSection], [activeSection]);

  const renderJourneySection = (journeyId: Exclude<JourneyId, 'home'>) => {
    const journey = journeyData[journeyId];

    return (
      <section className="journey-section">
        <div className="journey-header">
          <h2>{journey.heading}</h2>
          <p>{journey.description}</p>
          <div className="journey-stats">
            {journey.stats.map((stat) => (
              <div className="stat" key={`${journeyId}-${stat.icon}-${stat.text}`}>
                <span className="stat-icon">{stat.icon}</span>
                <span className="stat-text">{stat.text}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="journey-flow">
          {journey.steps.map((step, index) => (
            <div className="flow-step" key={`${journeyId}-${step.title}`}>
              <div className="step-number">{index + 1}</div>
              <div className="step-title">{step.title}</div>
              <div className="step-description">{step.description}</div>
              <span className="step-action">✓ {step.action}</span>
            </div>
          ))}
        </div>

        <div className="role-swap">
          <h4>{journey.swapTitle}</h4>
          {journey.swapDescription ? <p>{journey.swapDescription}</p> : null}
          <div className="role-buttons">
            {journey.swapButtons.map((button) => (
              <button
                key={`${journeyId}-${button.id}-${button.label}`}
                className={`role-btn ${button.active ? 'active' : ''}`}
                onClick={() => setActiveSection(button.id)}
                type="button"
              >
                {button.label}
              </button>
            ))}
          </div>
        </div>

        <div className="tips-box">
          <h4>{journey.tipTitle}</h4>
          <p>{journey.tipText}</p>
        </div>

        <div className="nav-buttons">
          <button className="btn btn-secondary" onClick={() => setActiveSection('home')} type="button">
            ← Back to Home
          </button>
          <button className="btn btn-outline" onClick={() => setActiveSection(journey.next.id)} type="button">
            {journey.next.label}
          </button>
        </div>
      </section>
    );
  };

  return (
    <div className="how-it-works-page">
      <header className="header">
        <div className="header-inner">
          <div className="logo">MANS<em>360</em></div>
          <div className="nav-right">
            <div className="breadcrumb">
              <span>Home</span>
              {activeSection !== 'home' ? <span> / {currentLabel}</span> : null}
            </div>
          </div>
        </div>
      </header>

      <div className="container">
        {activeSection === 'home' ? (
          <section className="journey-section">
            <div className="hero">
              <span className="hero-sub">Interactive Demo</span>
              <h1>
                Explore MANS360
                <br />
                <span className="accent">All User Journeys</span>
              </h1>
              <p>
                No login required. Click any journey below to experience the complete user pathway. Navigate freely, swap roles anytime, and discover how MANS360 works from different perspectives.
              </p>
              <p className="hero-tip">
                💡 Tip: Each journey takes 3-5 minutes to explore. Discover your perfect entry point.
              </p>
            </div>

            <div className="role-grid">
              {roleCards.map((card) => (
                <div className="role-card" key={card.id} onClick={() => setActiveSection(card.id)} role="button" tabIndex={0} onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    setActiveSection(card.id);
                  }
                }}>
                  <span className="role-icon">{card.icon}</span>
                  <h3>{card.title}</h3>
                  <p>{card.description}</p>
                  <button className="cta" type="button">Start Journey</button>
                </div>
              ))}
            </div>
          </section>
        ) : (
          renderJourneySection(activeSection)
        )}
      </div>

      <footer className="footer">
        <p>
          <strong>MANS360 Interactive Demo Platform</strong>
        </p>
        <p>No login required. 9+ journeys to explore. Find your perfect entry point.</p>
        <div className="footer-links">
          <a
            href="#"
            onClick={(event) => {
              event.preventDefault();
              setActiveSection('home');
            }}
          >
            Back to Home
          </a>
          <span>|</span>
          <a href="https://mans360.com" target="_blank" rel="noreferrer">Visit MANS360</a>
          <span>|</span>
          <a href="https://mans360.com/contact" target="_blank" rel="noreferrer">Contact Us</a>
        </div>
        <p className="footer-copy">© 2026 MANS360. From Episodic to Transformational.</p>
      </footer>
    </div>
  );
};

export default HowItWorksPage;
