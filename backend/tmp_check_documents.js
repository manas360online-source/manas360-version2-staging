const { PrismaClient } = require('@prisma/client');

(async function(){
  const prisma = new PrismaClient();
  const userId = '82ab775a-1bda-41b3-9853-22caad63c8bc';
  try{
    const notes = await prisma.therapistSessionNote.findMany({
      where: { session: { patientProfile: { userId } } },
      orderBy: { createdAt: 'desc' },
      take: 20,
      select: {
        id: true,
        sessionType: true,
        status: true,
        createdAt: true,
        session: {
          select: {
            dateTime: true,
            therapistProfile: { select: { user: { select: { firstName: true, lastName: true } } } },
          },
        },
      },
    });
    console.log('notes OK', notes.length);

    const prescriptions = await prisma.prescription.findMany({ where: { patientId: userId }, orderBy: { prescribedDate: 'desc' }, take: 20 });
    console.log('prescriptions OK', prescriptions.length);

    const assessments = await prisma.patientAssessment.findMany({ where: { patient: { userId } }, orderBy: { createdAt: 'desc' }, take: 20 });
    console.log('assessments OK', assessments.length);

  } catch (e) {
    console.error('ERROR', e);
  } finally {
    await prisma.$disconnect();
  }
})();