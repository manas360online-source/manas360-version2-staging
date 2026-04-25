import 'dotenv/config';
import { prisma, connectDatabase } from './src/config/db';
import { publishInstitutionalEngagementLeads } from './src/services/b2b-institutional-lead.service';
import { randomUUID } from 'crypto';

async function cleanup() {
  await connectDatabase();
  console.log('Cleaning up old test data...');
  // Delete leads created for our test therapists
  await prisma.lead.deleteMany({
    where: {
      patientId: 'test-requester-id'
    }
  });

  // Delete test therapists and their profiles
  const testEmails = ['therapist_a@test.com', 'therapist_b@test.com', 'therapist_c@test.com'];
  const testUsers = await prisma.user.findMany({
    where: { email: { in: testEmails } }
  });
  
  for (const user of testUsers) {
    await prisma.therapistProfile.deleteMany({ where: { userId: user.id } });
    await prisma.user.delete({ where: { id: user.id } });
  }

  // Ensure test requester exists
  await prisma.user.upsert({
    where: { id: 'test-requester-id' },
    update: {},
    create: {
      id: 'test-requester-id',
      email: 'requester@test.com',
      firstName: 'Test',
      lastName: 'Requester',
      role: 'PATIENT',
      status: 'ACTIVE'
    }
  });
}

async function createTestTherapists() {
  console.log('Creating test therapists...');
  
  const availability = [
    { dayOfWeek: 1, startMinute: 540, endMinute: 1020, isAvailable: true } // Mon 9am-5pm
  ];

  // Therapist A: Strong Match (Bangalore based, English/Hindi, CBT Cert)
  const userA = await prisma.user.create({
    data: {
      email: 'therapist_a@test.com',
      firstName: 'Therapist',
      lastName: 'A',
      role: 'THERAPIST',
      status: 'ACTIVE',
      therapistProfile: {
        create: {
          displayName: 'Therapist A (Strong)',
          languages: ['English', 'Hindi'],
          certifications: ['CBT Advanced'],
          averageRating: 4.8,
          baseLatitude: 12.9716,
          baseLongitude: 77.5946,
          isVerified: true,
          availability: availability
        }
      }
    }
  });

  // Therapist B: Partial Match (Bangalore based, English/Hindi, No Cert, Perfect Rating + Availability)
  const userB = await prisma.user.create({
    data: {
      email: 'therapist_b@test.com',
      firstName: 'Therapist',
      lastName: 'B',
      role: 'THERAPIST',
      status: 'ACTIVE',
      therapistProfile: {
        create: {
          displayName: 'Therapist B (Partial)',
          languages: ['English', 'Hindi'],
          certifications: [],
          averageRating: 5.0,
          baseLatitude: 12.9716,
          baseLongitude: 77.5946,
          isVerified: true,
          availability: availability
        }
      }
    }
  });

  // Therapist C: No Match (Far away, French only)
  const userC = await prisma.user.create({
    data: {
      email: 'therapist_c@test.com',
      firstName: 'Therapist',
      lastName: 'C',
      role: 'THERAPIST',
      status: 'ACTIVE',
      therapistProfile: {
        create: {
          displayName: 'Therapist C (None)',
          languages: ['French'],
          certifications: [],
          averageRating: 3.0,
          baseLatitude: 19.0760, // Mumbai
          baseLongitude: 72.8777,
          isVerified: true
        }
      }
    }
  });

  return { userA, userB, userC };
}

async function runLeadMatchingTest() {
  try {
    await cleanup();
    const { userA, userB, userC } = await createTestTherapists();

    console.log('\n🚀 Triggering Lead Matching for Institutional Engagement...');
    
    const result = await publishInstitutionalEngagementLeads({
      engagementId: `ENG-${Date.now()}`,
      requestorUserId: 'test-requester-id',
      requiredCert: 'CBT Advanced',
      languages: ['English', 'Hindi'],
      location: { latitude: 12.9716, longitude: 77.5946 }, // Bangalore
      deliveryMode: 'offline',
      title: 'Test Corporate Wellness Event',
      institutionName: 'Test Corp',
      amountMinor: 500000, // 5000 units
      currency: 'INR',
      requiredLeadCount: 1,
      availabilityPrefs: {
        daysOfWeek: [1],
        timeSlots: [{ startMinute: 600, endMinute: 660 }] // Mon 10am-11am
      }
    });

    console.log('\n--- Match Results ---');
    console.log(`Therapists Evaluated: ${result.totalTherapistsEvaluated}`);
    console.log(`Leads Created: ${result.totalLeadsCreated}`);
    console.log('Created per Tier:', result.createdByTier);

    // Verify Leads in DB
    const leads = await prisma.lead.findMany({
      where: { patientId: 'test-requester-id' },
      orderBy: { matchScore: 'desc' }
    });

    console.log('\n--- Detailed Lead Audit ---');
    for (const lead of leads) {
      const therapist = lead.providerId === userA.id ? 'A' : lead.providerId === userB.id ? 'B' : lead.providerId === userC.id ? 'C' : 'Unknown';
      console.log(`Lead for Therapist ${therapist}: Score=${lead.matchScore}, Tier=${lead.tier}, Status=${lead.status}`);
    }

    // Assertions
    const leadA = leads.find(l => l.providerId === userA.id);
    const leadB = leads.find(l => l.providerId === userB.id);
    const leadC = leads.find(l => l.providerId === userC.id);

    if (leadA && leadA.matchScore && leadA.matchScore >= 80) {
      console.log('✅ PASS: Therapist A matched correctly with high score.');
    } else {
      console.log('❌ FAIL: Therapist A matching issue.');
    }

    if (leadB && leadB.matchScore && leadB.matchScore < 80 && leadB.matchScore > 50) {
      console.log('✅ PASS: Therapist B matched correctly with medium score.');
    } else {
      console.log('❌ FAIL: Therapist B matching issue.');
    }

    if (!leadC) {
      console.log('✅ PASS: Therapist C correctly NOT matched.');
    } else {
      console.log('❌ FAIL: Therapist C should not have matched.');
    }

  } catch (error) {
    console.error('❌ Test Errored:', error);
  } finally {
    await prisma.$disconnect();
  }
}

runLeadMatchingTest();
