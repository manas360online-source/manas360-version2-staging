const { PrismaClient } = require('@prisma/client');
(async () => {
  const p = new PrismaClient();
  try {
    const therapists = await p.user.findMany({ where: { role: 'THERAPIST' }, select: { id: true, email: true, firstName: true, lastName: true } });
    if (!therapists || therapists.length === 0) {
      console.log('no therapists found');
      process.exit(0);
    }
    const results = [];
    for (const t of therapists) {
      const profile = await p.therapistProfile.findUnique({ where: { userId: t.id } });
      results.push({ user: t, profile });
    }
    console.log(JSON.stringify(results, null, 2));
  } catch (e) {
    console.error(e);
    process.exit(1);
  } finally {
    await p.$disconnect();
  }
})();
