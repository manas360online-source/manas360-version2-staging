const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function hardenCorpAdmin() {
  const phone = '+919000000001';
  const companyKey = 'CORP-TEST';

  console.log('Hardening Corporate Admin:', phone);

  // 1. Upsert User
  const user = await prisma.user.upsert({
    where: { phone },
    update: {
      phoneVerified: true,
      emailVerified: true,
      isCompanyAdmin: true,
      companyKey: companyKey,
      role: 'PATIENT',
      name: 'Corporate Admin',
      firstName: 'Corporate',
      lastName: 'Admin',
      status: 'ACTIVE'
    },
    create: {
      phone,
      phoneVerified: true,
      emailVerified: true,
      isCompanyAdmin: true,
      companyKey: companyKey,
      role: 'PATIENT',
      name: 'Corporate Admin',
      firstName: 'Corporate',
      lastName: 'Admin',
      status: 'ACTIVE',
      email: `corp-admin-${Date.now()}@test.local`,
      provider: 'PHONE'
    }
  });

  console.log('User fixed:', user.id);

  // 2. Accept Legal Documents
  const docs = await prisma.legalDocument.findMany({ where: { isActive: true } });
  for (const doc of docs) {
    await prisma.userAcceptance.upsert({
      where: { userId_documentId: { userId: user.id, documentId: doc.id } },
      create: {
        userId: user.id,
        documentId: doc.id,
        documentVer: doc.version,
        acceptedAt: new Date(),
        source: 'harden_script'
      },
      update: {
        documentVer: doc.version,
        acceptedAt: new Date()
      }
    });
    
    // Mirror to consent table
    await prisma.consent.create({
      data: {
        userId: user.id,
        consentType: doc.type,
        status: 'GRANTED',
        grantedAt: new Date(),
        purpose: 'LEGAL_ACCEPTANCE'
      }
    }).catch(() => {}); // Ignore duplicate
  }

  // 3. Accept NRI Terms
  await prisma.consent.create({
    data: {
      userId: user.id,
      consentType: 'NRI_TERMS_OF_SERVICE',
      status: 'GRANTED',
      grantedAt: new Date(),
      purpose: 'NRI_ACCESS'
    }
  }).catch(() => {});

  // 4. Ensure Patient Profile
  const profile = await prisma.patientProfile.upsert({
    where: { userId: user.id },
    create: {
      user: { connect: { id: user.id } },
      age: 30,
      gender: 'OTHER',
      emergencyContact: {}
    },
    update: {}
  });

  console.log('Harden complete!');
  await prisma.$disconnect();
}

hardenCorpAdmin().catch(console.error);
