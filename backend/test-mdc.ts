import { prisma } from './src/config/db';
import * as mdcClinicService from './src/services/mdc-clinic.service';

async function test() {
  console.log('Testing clinic creation...');
  try {
    const clinic = await mdcClinicService.createClinic({
      name: "Test Clinic Script",
      ownerName: "Script Owner",
      phone: "+919999999999",
      email: "script@test.com",
      tier: "trial",
      billingCycle: "monthly",
      selectedFeatures: []
    });
    console.log('Clinic created:', clinic.clinicCode);
    
    const admin = await prisma.clinicUser.findFirst({ where: { clinicId: clinic.id } });
    console.log('Admin user created:', admin?.loginCode);
    
    // Clean up
    await prisma.clinic.delete({ where: { id: clinic.id } });
    console.log('Cleanup successful');
  } catch(e) {
    console.error('Error:', e);
  } finally {
    await prisma.$disconnect();
  }
}
test();
