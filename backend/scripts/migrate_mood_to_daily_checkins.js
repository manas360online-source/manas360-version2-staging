#!/usr/bin/env node
/*
Idempotent migration script: migrate legacy mood rows from
`patient_mood_entries` and `mood_logs` into `daily_checkins`.

Usage: from repo root run:
  node backend/scripts/migrate_mood_to_daily_checkins.js

This script is safe to re-run. It marks migrated rows by embedding
`[migrated:<source>:<id>]` into the `reflectionGood` field of the
created `daily_checkins` row and avoids overwriting existing non-legacy check-ins.
*/
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const BATCH = Number(process.env.MIGRATION_BATCH_SIZE || 250);

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function migratePatientMoodEntries() {
  console.log('Migrating patient_mood_entries -> daily_checkins');
  let cursor = null;
  while (true) {
    const rows = await prisma.patientMoodEntry.findMany({
      where: cursor ? { id: { gt: cursor } } : {},
      orderBy: { id: 'asc' },
      take: BATCH,
    });
    if (!rows.length) break;

    for (const r of rows) {
      try {
        const srcTag = `[migrated:patientMoodEntry:${r.id}]`;
        // Skip if already migrated
        const already = await prisma.dailyCheckIn.findFirst({
          where: { patientId: r.patientId, reflectionGood: { contains: srcTag } },
        });
        if (already) {
          cursor = r.id;
          continue;
        }

        // If a non-legacy daily checkin exists for same patient+date, skip to avoid overwrite
        const dayStart = new Date(r.date);
        dayStart.setHours(0, 0, 0, 0);
        const existsAny = await prisma.dailyCheckIn.findFirst({
          where: { patientId: r.patientId, date: dayStart, NOT: { reflectionGood: { contains: srcTag } } },
        });
        if (existsAny) {
          cursor = r.id;
          continue;
        }

        const payload = {
          patientId: r.patientId,
          date: dayStart,
          type: 'legacy_migrated',
          mood: Number(r.moodScore || 0),
          reflectionGood: `${r.note || ''}${r.note ? '\n\n' : ''}${srcTag}`,
          createdAt: r.createdAt || new Date(),
          updatedAt: r.updatedAt || new Date(),
        };

        await prisma.dailyCheckIn.create({ data: payload });
        cursor = r.id;
      } catch (err) {
        console.error('Failed migrating patientMoodEntry', r.id, err);
      }
    }
    // be nice to the DB
    await sleep(200);
  }
}

async function migrateMoodLogs() {
  console.log('Migrating mood_logs -> daily_checkins');
  let cursor = null;
  while (true) {
    const rows = await prisma.moodLog.findMany({
      where: cursor ? { id: { gt: cursor } } : {},
      orderBy: { id: 'asc' },
      take: BATCH,
    });
    if (!rows.length) break;

    for (const r of rows) {
      try {
        const srcTag = `[migrated:moodLog:${r.id}]`;
        // Skip if already migrated
        const already = await prisma.dailyCheckIn.findFirst({ where: { reflectionGood: { contains: srcTag } } });
        if (already) {
          cursor = r.id;
          continue;
        }

        // Map userId -> patientProfile.id
        const patientProfile = await prisma.patientProfile.findUnique({ where: { userId: r.userId }, select: { id: true } });
        if (!patientProfile) {
          cursor = r.id;
          continue; // user not a patient
        }

        const dayStart = new Date(r.loggedAt || r.createdAt || new Date());
        dayStart.setHours(0, 0, 0, 0);

        // If a non-legacy daily checkin exists for same patient+date, skip
        const existsAny = await prisma.dailyCheckIn.findFirst({ where: { patientId: patientProfile.id, date: dayStart } });
        if (existsAny) {
          cursor = r.id;
          continue;
        }

        const payload = {
          patientId: patientProfile.id,
          date: dayStart,
          type: 'legacy_migrated',
          mood: Number(r.moodValue || 0),
          reflectionGood: `${r.note || ''}${r.note ? '\n\n' : ''}${srcTag}`,
          createdAt: r.createdAt || new Date(),
          updatedAt: r.updatedAt || new Date(),
        };

        await prisma.dailyCheckIn.create({ data: payload });
        cursor = r.id;
      } catch (err) {
        console.error('Failed migrating moodLog', r.id, err);
      }
    }
    await sleep(200);
  }
}

async function main() {
  try {
    console.log('Starting migration with batch size', BATCH);
    await prisma.$connect();
    await migratePatientMoodEntries();
    await migrateMoodLogs();
    console.log('Migration complete');
  } catch (err) {
    console.error('Migration failed', err);
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  void main();
}
