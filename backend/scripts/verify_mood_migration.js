#!/usr/bin/env node
/*
Verification script to compare counts and averages before/after migration.

Usage:
  node backend/scripts/verify_mood_migration.js [--sample N]

Outputs per-patient counts for `patient_mood_entries`, `mood_logs` (mapped to patient if possible),
and `daily_checkins` and prints simple average mood comparisons for quick validation.
*/
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const argv = process.argv.slice(2);
const sampleArgIndex = argv.indexOf('--sample');
const SAMPLE = sampleArgIndex >= 0 ? Number(argv[sampleArgIndex + 1] || 25) : 25;

async function gatherStats(limit = SAMPLE) {
  await prisma.$connect();

  const patients = await prisma.patientProfile.findMany({ take: limit, select: { id: true, userId: true } });

  const report = [];
  for (const p of patients) {
    const pmCount = await prisma.patientMoodEntry.count({ where: { patientId: p.id } }).catch(() => 0);
    const mlCountRaw = await prisma.moodLog.count({ where: { userId: p.userId } }).catch(() => 0);
    const dcCount = await prisma.dailyCheckIn.count({ where: { patientId: p.id } }).catch(() => 0);

    // averages
    const pmAvgRow = await prisma.patientMoodEntry.aggregate({ where: { patientId: p.id }, _avg: { moodScore: true } }).catch(() => ({ _avg: { moodScore: null } }));
    const mlAvgRow = await prisma.moodLog.aggregate({ where: { userId: p.userId }, _avg: { moodValue: true } }).catch(() => ({ _avg: { moodValue: null } }));
    const dcAvgRow = await prisma.dailyCheckIn.aggregate({ where: { patientId: p.id }, _avg: { mood: true } }).catch(() => ({ _avg: { mood: null } }));

    report.push({
      patientId: p.id,
      userId: p.userId,
      patientMoodEntries: pmCount,
      moodLogs: mlCountRaw,
      dailyCheckIns: dcCount,
      avg_patientMoodEntry: pmAvgRow._avg.moodScore,
      avg_moodLog: mlAvgRow._avg.moodValue,
      avg_dailyCheckIn: dcAvgRow._avg.mood,
    });
  }

  console.table(report.map((r) => ({
    patientId: r.patientId,
    pmCount: r.patientMoodEntries,
    mlCount: r.moodLogs,
    dcCount: r.dailyCheckIns,
    pmAvg: r.avg_patientMoodEntry ? Number(r.avg_patientMoodEntry.toFixed(2)) : null,
    mlAvg: r.avg_moodLog ? Number(r.avg_moodLog.toFixed(2)) : null,
    dcAvg: r.avg_dailyCheckIn ? Number(r.avg_dailyCheckIn.toFixed(2)) : null,
  })));

  await prisma.$disconnect();
}

if (require.main === module) {
  void gatherStats(SAMPLE).catch((e) => { console.error(e); process.exit(1); });
}
