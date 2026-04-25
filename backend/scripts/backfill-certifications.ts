import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Starting backfill for legacy TherapistProfile certifications...');
  
  const profiles = await prisma.therapistProfile.findMany({
    where: {
      NOT: {
        certifications: { equals: [] }
      }
    }
  });
  
  let migrated = 0;
  
  for (const profile of profiles) {
    const certs = profile.certifications as string[];
    if (!Array.isArray(certs)) continue;
    
    for (const certSlug of certs) {
      if (!certSlug || typeof certSlug !== 'string') continue;
      
      // Attempt to resolve certification details
      const certData = await prisma.certification.findFirst({
        where: { slug: certSlug }
      });
      
      const existingEnrollment = await prisma.certificationEnrollment.findFirst({
        where: { userId: profile.userId, certificationSlug: certSlug }
      });
      
      if (!existingEnrollment) {
        await prisma.certificationEnrollment.create({
          data: {
            userId: profile.userId,
            certificationSlug: certSlug,
            status: profile.certificationStatus === 'VERIFIED' ? 'VERIFIED' : 
                    profile.certificationStatus === 'COMPLETED' ? 'COMPLETED' : 'ENROLLED',
            certId: profile.certificationPaymentId || null,
            progress: ['VERIFIED', 'COMPLETED'].includes(profile.certificationStatus || '') ? 100 : 0,
            amountPaid: 0,
            totalAmount: certData?.metadata ? Number((certData.metadata as any).priceMinor || 0) : 0,
            paymentPlan: 'FULL'
          }
        });
        migrated++;
        console.log(`Migrated cert ${certSlug} for user ${profile.userId}`);
      }
    }
  }
  
  console.log(`Backfill completed. Created ${migrated} enrollment records.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
