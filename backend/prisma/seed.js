#!/usr/bin/env node
require('dotenv').config();
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const shouldSeedSample = String(process.env.SEED_GROUP_THERAPY_SAMPLE || '').toLowerCase() === 'true';

async function main() {
  if (!shouldSeedSample) {
    console.log('Skipping group therapy seed data. Set SEED_GROUP_THERAPY_SAMPLE=true to insert an example session.');
    return;
  }

  const requestedById = process.env.GROUP_THERAPY_REQUESTED_BY_ID;
  const hostTherapistId = process.env.GROUP_THERAPY_HOST_THERAPIST_ID;

  if (!requestedById || !hostTherapistId) {
    throw new Error('GROUP_THERAPY_REQUESTED_BY_ID and GROUP_THERAPY_HOST_THERAPIST_ID are required when SEED_GROUP_THERAPY_SAMPLE=true');
  }

  const existing = await prisma.groupTherapySession.findFirst({
    where: {
      title: 'Mindfulness Support Circle',
      scheduledAt: new Date('2026-04-10T10:00:00.000Z'),
    },
    select: { id: true },
  });

  if (existing) {
    console.log('Sample group therapy session already exists; skipping.');
    return;
  }

  const session = await prisma.groupTherapySession.create({
    data: {
      title: 'Mindfulness Support Circle',
      topic: 'Stress Management',
      description: 'Optional sample session for development environments only.',
      sessionMode: 'PUBLIC',
      status: 'PUBLISHED',
      requestedById,
      hostTherapistId,
      groupCategoryId: null,
      scheduledAt: new Date('2026-04-10T10:00:00.000Z'),
      durationMinutes: 60,
      maxMembers: 12,
      priceMinor: BigInt(0),
      allowGuestJoin: true,
      requiresPayment: false,
      requiresAdminGate: true,
      jitsiRoomName: 'MANAS360_GROUP_MINDFULNESS_SUPPORT_CIRCLE_SAMPLE',
      publishAt: new Date('2026-04-10T09:00:00.000Z'),
      publishedAt: new Date('2026-04-10T09:00:00.000Z'),
      approvedAt: new Date('2026-04-09T18:00:00.000Z'),
    },
  });

  console.log(`Seeded group therapy session ${session.id}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
