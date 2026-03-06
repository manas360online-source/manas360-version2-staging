import { randomUUID } from 'crypto';
import { prisma } from '../config/db';
import { AppError } from '../middleware/error.middleware';

const db = prisma as any;
let initialized = false;

const ensurePsychiatristTables = async (): Promise<void> => {
  if (initialized) return;

  await db.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS psychiatric_assessments (
      id TEXT PRIMARY KEY,
      psychiatrist_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      patient_id TEXT NOT NULL REFERENCES patient_profiles(id) ON DELETE CASCADE,
      chief_complaint TEXT NOT NULL,
      symptoms JSONB NOT NULL DEFAULT '[]'::jsonb,
      duration_weeks INTEGER,
      medical_history JSONB NOT NULL DEFAULT '{}'::jsonb,
      lab_results JSONB NOT NULL DEFAULT '{}'::jsonb,
      clinical_impression TEXT,
      severity TEXT,
      status TEXT NOT NULL DEFAULT 'draft',
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP NOT NULL DEFAULT NOW()
    );
  `);

  await db.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS prescriptions (
      id TEXT PRIMARY KEY,
      psychiatrist_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      patient_id TEXT NOT NULL REFERENCES patient_profiles(id) ON DELETE CASCADE,
      drug_name TEXT NOT NULL,
      brand_name TEXT,
      indication TEXT,
      starting_dose TEXT,
      target_dose TEXT,
      max_dose TEXT,
      frequency TEXT,
      duration TEXT,
      instructions TEXT,
      is_active BOOLEAN NOT NULL DEFAULT true,
      review_due_at TIMESTAMP,
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP NOT NULL DEFAULT NOW()
    );
  `);

  await db.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS drug_interactions (
      id TEXT PRIMARY KEY,
      psychiatrist_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      patient_id TEXT REFERENCES patient_profiles(id) ON DELETE SET NULL,
      prescription_id TEXT,
      primary_substance TEXT NOT NULL,
      interacting_substance TEXT NOT NULL,
      severity TEXT NOT NULL,
      risk TEXT,
      recommendation TEXT,
      resolution TEXT,
      override_justification TEXT,
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    );
  `);

  await db.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS medication_history (
      id TEXT PRIMARY KEY,
      psychiatrist_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      patient_id TEXT NOT NULL REFERENCES patient_profiles(id) ON DELETE CASCADE,
      medication TEXT NOT NULL,
      old_dose TEXT,
      new_dose TEXT,
      reason TEXT,
      outcome TEXT,
      changed_at TIMESTAMP NOT NULL DEFAULT NOW(),
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    );
  `);

  await db.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS patient_vitals (
      id TEXT PRIMARY KEY,
      patient_id TEXT NOT NULL REFERENCES patient_profiles(id) ON DELETE CASCADE,
      recorded_by TEXT REFERENCES users(id) ON DELETE SET NULL,
      systolic INTEGER,
      diastolic INTEGER,
      pulse INTEGER,
      weight NUMERIC,
      side_effects JSONB NOT NULL DEFAULT '[]'::jsonb,
      adherence_percent INTEGER,
      recorded_at TIMESTAMP NOT NULL DEFAULT NOW(),
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    );
  `);

  await db.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS psychologist_wellness_plans (
      id TEXT PRIMARY KEY,
      patient_id TEXT NOT NULL REFERENCES patient_profiles(id) ON DELETE CASCADE,
      created_by TEXT REFERENCES users(id) ON DELETE SET NULL,
      plan_items JSONB NOT NULL DEFAULT '[]'::jsonb,
      notes TEXT,
      adherence_score INTEGER NOT NULL DEFAULT 0,
      is_active BOOLEAN NOT NULL DEFAULT true,
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP NOT NULL DEFAULT NOW()
    );
  `);

  await db.$executeRawUnsafe('CREATE INDEX IF NOT EXISTS psychiatric_assessments_psychiatrist_idx ON psychiatric_assessments(psychiatrist_id, created_at DESC);');
  await db.$executeRawUnsafe('CREATE INDEX IF NOT EXISTS psychiatric_assessments_patient_idx ON psychiatric_assessments(patient_id, created_at DESC);');
  await db.$executeRawUnsafe('CREATE INDEX IF NOT EXISTS prescriptions_psychiatrist_idx ON prescriptions(psychiatrist_id, created_at DESC);');
  await db.$executeRawUnsafe('CREATE INDEX IF NOT EXISTS prescriptions_patient_idx ON prescriptions(patient_id, created_at DESC);');
  await db.$executeRawUnsafe('CREATE INDEX IF NOT EXISTS medication_history_patient_idx ON medication_history(patient_id, changed_at DESC);');
  await db.$executeRawUnsafe('CREATE INDEX IF NOT EXISTS patient_vitals_patient_idx ON patient_vitals(patient_id, recorded_at DESC);');
  await db.$executeRawUnsafe('CREATE INDEX IF NOT EXISTS psychologist_wellness_plans_patient_idx ON psychologist_wellness_plans(patient_id, created_at DESC);');

  initialized = true;
};

const assertPsychiatrist = async (userId: string): Promise<void> => {
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { id: true, role: true, isDeleted: true },
  });

  if (!user || user.isDeleted) throw new AppError('Psychiatrist not found', 404);
  if (String(user.role) !== 'PSYCHIATRIST') throw new AppError('Psychiatrist role required', 403);
};

const getPatientBasics = async (patientId: string) => {
  const patient = await db.patientProfile.findUnique({
    where: { id: patientId },
    select: {
      id: true,
      age: true,
      user: {
        select: {
          id: true,
          name: true,
          firstName: true,
          lastName: true,
          showNameToProviders: true,
        },
      },
    },
  });

  if (!patient) throw new AppError('Patient not found', 404);

  const user = patient.user;
  const full = `${String(user.firstName || '').trim()} ${String(user.lastName || '').trim()}`.trim();
  const patientName = user.showNameToProviders === false ? 'Anonymous Patient' : String(user.name || '').trim() || full || 'Patient';

  return {
    patientProfileId: String(patient.id),
    patientUserId: String(user.id),
    patientName,
    age: Number(patient.age || 0),
  };
};

const buildMedicationInstruction = (payload: any): string => {
  const drugName = String(payload.drugName || '').trim();
  const startingDose = String(payload.startingDose || '').trim();
  const frequency = String(payload.frequency || '').trim();
  const explicitInstructions = String(payload.instructions || '').trim();
  if (explicitInstructions) return explicitInstructions;
  return `Take ${drugName} ${startingDose} ${frequency}. May take 2-4 weeks to show effect.`.trim();
};

const computeInteractionRules = (allItems: string[]) => {
  const lower = allItems.map((item) => item.toLowerCase());
  const hasAshwagandha = lower.some((i) => i.includes('ashwagandha'));
  const hasSsri = lower.some((i) => i.includes('sertraline') || i.includes('escitalopram') || i.includes('fluoxetine') || i.includes('ssri'));
  const hasAlcohol = lower.some((i) => i.includes('alcohol'));

  const warnings: Array<Record<string, unknown>> = [];

  if (hasAshwagandha && hasSsri) {
    warnings.push({
      severity: 'CAUTION',
      primarySubstance: 'SSRI',
      interactingSubstance: 'Ashwagandha',
      risk: 'Increased sedation',
      recommendation: 'Monitor closely and review daytime sedation',
    });
  }

  if (hasAlcohol && hasSsri) {
    warnings.push({
      severity: 'MONITOR',
      primarySubstance: 'SSRI',
      interactingSubstance: 'Alcohol',
      risk: 'May increase drowsiness and reduce treatment response',
      recommendation: 'Advise reduced alcohol intake and monitor side effects',
    });
  }

  return warnings;
};

export const listPsychiatristPatients = async (userId: string) => {
  await ensurePsychiatristTables();
  await assertPsychiatrist(userId);

  const sessions = await db.therapySession.findMany({
    where: { therapistProfileId: userId },
    orderBy: { dateTime: 'desc' },
    select: {
      patientProfileId: true,
      dateTime: true,
      patientProfile: {
        select: {
          id: true,
          age: true,
          user: {
            select: {
              id: true,
              name: true,
              firstName: true,
              lastName: true,
            },
          },
        },
      },
    },
  });

  const seen = new Set<string>();
  const items: Array<Record<string, unknown>> = [];

  for (const row of sessions) {
    const patientId = String(row.patientProfileId);
    if (seen.has(patientId)) continue;
    seen.add(patientId);

    const user = row.patientProfile?.user;
    const full = `${String(user?.firstName || '').trim()} ${String(user?.lastName || '').trim()}`.trim();

    items.push({
      patientId,
      patientUserId: String(user?.id || ''),
      name: String(user?.name || '').trim() || full || 'Patient',
      age: Number(row.patientProfile?.age || 0),
      lastSessionAt: row.dateTime,
    });
  }

  // Fallback pool for psychiatrists with no prior sessions yet.
  if (items.length === 0) {
    const profiles = await db.patientProfile.findMany({
      take: 25,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        age: true,
        user: {
          select: {
            id: true,
            name: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    for (const p of profiles) {
      const user = p.user;
      const full = `${String(user?.firstName || '').trim()} ${String(user?.lastName || '').trim()}`.trim();
      items.push({
        patientId: String(p.id),
        patientUserId: String(user?.id || ''),
        name: String(user?.name || '').trim() || full || 'Patient',
        age: Number(p.age || 0),
        lastSessionAt: null,
      });
    }
  }

  return { items };
};

export const getPsychiatristDashboard = async (userId: string, patientId?: string) => {
  await ensurePsychiatristTables();
  await assertPsychiatrist(userId);

  if (!patientId) {
    const now = new Date();
    const dayStart = new Date(now);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(now);
    dayEnd.setHours(23, 59, 59, 999);

    const psychiatristSessions = await db.therapySession.findMany({
      where: { therapistProfileId: userId },
      select: { patientProfileId: true },
    });
    const patientIds = Array.from(new Set((psychiatristSessions as any[]).map((s) => String(s.patientProfileId))));

    const [todayConsultationsCount, medicationReviews, interactionAlerts, worseningSymptoms] = await Promise.all([
      db.therapySession.count({
        where: {
          therapistProfileId: userId,
          dateTime: { gte: dayStart, lte: dayEnd },
        },
      }),
      db.$queryRawUnsafe(
        `SELECT COUNT(*)::int AS value FROM prescriptions WHERE psychiatrist_id = $1 AND is_active = true AND review_due_at IS NOT NULL AND review_due_at <= NOW()`,
        userId,
      ),
      db.$queryRawUnsafe(
        `SELECT COUNT(*)::int AS value FROM drug_interactions WHERE psychiatrist_id = $1 AND severity IN ('CRITICAL', 'CAUTION')`,
        userId,
      ),
      db.$queryRawUnsafe(
        `SELECT COUNT(*)::int AS value FROM psychiatric_assessments pa WHERE pa.psychiatrist_id = $1 AND LOWER(COALESCE(pa.severity, '')) IN ('severe','moderately severe')`,
        userId,
      ),
    ]);

    let nonAdherenceCount = 0;
    if (patientIds.length > 0) {
      const placeholders = patientIds.map((_, i) => `$${i + 1}`).join(',');
      const rows = await db.$queryRawUnsafe(
        `SELECT COUNT(*)::int AS value FROM psychologist_wellness_plans WHERE is_active = true AND adherence_score < 60 AND patient_id IN (${placeholders})`,
        ...patientIds,
      );
      nonAdherenceCount = Number((rows as any[])[0]?.value || 0);
    }

    return {
      mode: 'professional',
      patientSelected: false,
      todaysConsultations: Number(todayConsultationsCount || 0),
      medicationReviewsDue: Number((medicationReviews as any[])[0]?.value || 0),
      drugInteractionAlerts: Number((interactionAlerts as any[])[0]?.value || 0),
      nonAdherenceAlerts: nonAdherenceCount,
      worseningSymptoms: Number((worseningSymptoms as any[])[0]?.value || 0),
    };
  }

  const patient = await getPatientBasics(patientId);

  const [lastSession, nextSession, diagnosisRows, medicationsRows, wellnessRows, exercisesRows] = await Promise.all([
    db.therapySession.findFirst({
      where: { therapistProfileId: userId, patientProfileId: patientId, dateTime: { lte: new Date() } },
      orderBy: { dateTime: 'desc' },
      select: { dateTime: true },
    }),
    db.therapySession.findFirst({
      where: { therapistProfileId: userId, patientProfileId: patientId, dateTime: { gt: new Date() } },
      orderBy: { dateTime: 'asc' },
      select: { dateTime: true },
    }),
    db.$queryRawUnsafe(
      `SELECT clinical_impression, severity, created_at FROM psychiatric_assessments WHERE psychiatrist_id = $1 AND patient_id = $2 ORDER BY created_at DESC LIMIT 1`,
      userId,
      patientId,
    ),
    db.$queryRawUnsafe(
      `SELECT drug_name, starting_dose, frequency, duration, instructions FROM prescriptions WHERE psychiatrist_id = $1 AND patient_id = $2 AND is_active = true ORDER BY created_at DESC`,
      userId,
      patientId,
    ),
    db.$queryRawUnsafe(
      `SELECT plan_items, notes, adherence_score, created_at FROM psychologist_wellness_plans WHERE patient_id = $1 AND is_active = true ORDER BY created_at DESC LIMIT 1`,
      patientId,
    ),
    db.$queryRawUnsafe(
      `SELECT name, completion_rate FROM therapist_exercises WHERE patient_id = $1 ORDER BY updated_at DESC LIMIT 8`,
      patientId,
    ),
  ]);

  const diagnosis = (diagnosisRows as any[])[0] || null;
  const wellness = (wellnessRows as any[])[0] || null;

  return {
    mode: 'professional',
    patientSelected: true,
    patientOverview: {
      name: patient.patientName,
      age: patient.age,
      diagnosis: diagnosis?.clinical_impression || 'Not assessed',
      currentMedications: (medicationsRows as any[]).map((row) => ({
        drugName: row.drug_name,
        dose: row.starting_dose,
        frequency: row.frequency,
        duration: row.duration,
      })),
      lastSession: lastSession?.dateTime || null,
      nextFollowUp: nextSession?.dateTime || null,
    },
    psychologistWellnessPlan: {
      readOnly: true,
      available: Boolean(wellness),
      items: (wellness?.plan_items as any[]) || (exercisesRows as any[]).map((row) => ({
        label: String(row.name || ''),
        progress: `${Number(row.completion_rate || 0)}%`,
      })),
      notes: wellness?.notes || '',
      adherenceScore: Number(wellness?.adherence_score || 0),
      emptyMessage: wellness ? null : 'No wellness plan available yet',
    },
    psychiatricAssessmentSummary: diagnosis
      ? {
          clinicalImpression: diagnosis.clinical_impression,
          severity: diagnosis.severity,
          assessedAt: diagnosis.created_at,
        }
      : null,
    medicationOverview: (medicationsRows as any[]),
  };
};

export const createPsychiatricAssessment = async (userId: string, payload: any) => {
  await ensurePsychiatristTables();
  await assertPsychiatrist(userId);

  const patientId = String(payload.patientId || '').trim();
  if (!patientId) throw new AppError('patientId is required', 400);
  await getPatientBasics(patientId);

  const id = randomUUID();
  await db.$executeRawUnsafe(
    `
    INSERT INTO psychiatric_assessments (
      id, psychiatrist_id, patient_id, chief_complaint, symptoms, duration_weeks,
      medical_history, lab_results, clinical_impression, severity, status, created_at, updated_at
    ) VALUES ($1,$2,$3,$4,$5::jsonb,$6,$7::jsonb,$8::jsonb,$9,$10,$11,NOW(),NOW())
    `,
    id,
    userId,
    patientId,
    String(payload.chiefComplaint || '').trim(),
    JSON.stringify(Array.isArray(payload.symptoms) ? payload.symptoms : []),
    payload.durationWeeks == null ? null : Number(payload.durationWeeks),
    JSON.stringify(payload.medicalHistory || {}),
    JSON.stringify(payload.labResults || {}),
    payload.clinicalImpression ? String(payload.clinicalImpression) : null,
    payload.severity ? String(payload.severity) : null,
    String(payload.status || 'draft'),
  );

  return { id };
};

export const listPsychiatricAssessments = async (userId: string, patientId?: string) => {
  await ensurePsychiatristTables();
  await assertPsychiatrist(userId);

  const rows = patientId
    ? await db.$queryRawUnsafe(
        `SELECT * FROM psychiatric_assessments WHERE psychiatrist_id = $1 AND patient_id = $2 ORDER BY created_at DESC LIMIT 100`,
        userId,
        patientId,
      )
    : await db.$queryRawUnsafe(
        `SELECT * FROM psychiatric_assessments WHERE psychiatrist_id = $1 ORDER BY created_at DESC LIMIT 100`,
        userId,
      );

  return { items: rows };
};

export const createPrescription = async (userId: string, payload: any) => {
  await ensurePsychiatristTables();
  await assertPsychiatrist(userId);

  const patientId = String(payload.patientId || '').trim();
  if (!patientId) throw new AppError('patientId is required', 400);
  await getPatientBasics(patientId);

  const id = randomUUID();
  const instructions = buildMedicationInstruction(payload);

  await db.$executeRawUnsafe(
    `
    INSERT INTO prescriptions (
      id, psychiatrist_id, patient_id, drug_name, brand_name, indication, starting_dose,
      target_dose, max_dose, frequency, duration, instructions, is_active, review_due_at, created_at, updated_at
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,true,$13,NOW(),NOW())
    `,
    id,
    userId,
    patientId,
    String(payload.drugName || '').trim(),
    payload.brandName ? String(payload.brandName) : null,
    payload.indication ? String(payload.indication) : null,
    payload.startingDose ? String(payload.startingDose) : null,
    payload.targetDose ? String(payload.targetDose) : null,
    payload.maxDose ? String(payload.maxDose) : null,
    payload.frequency ? String(payload.frequency) : null,
    payload.duration ? String(payload.duration) : null,
    instructions,
    payload.reviewDueAt ? new Date(payload.reviewDueAt) : null,
  );

  return { id, instructions };
};

export const listPrescriptions = async (userId: string, patientId?: string) => {
  await ensurePsychiatristTables();
  await assertPsychiatrist(userId);

  const rows = patientId
    ? await db.$queryRawUnsafe(
        `SELECT * FROM prescriptions WHERE psychiatrist_id = $1 AND patient_id = $2 ORDER BY created_at DESC`,
        userId,
        patientId,
      )
    : await db.$queryRawUnsafe(`SELECT * FROM prescriptions WHERE psychiatrist_id = $1 ORDER BY created_at DESC`, userId);

  return { items: rows };
};

export const checkDrugInteractions = async (userId: string, payload: any) => {
  await ensurePsychiatristTables();
  await assertPsychiatrist(userId);

  const patientId = payload.patientId ? String(payload.patientId) : null;
  const medications = Array.isArray(payload.medications) ? payload.medications : [];
  const supplements = Array.isArray(payload.supplements) ? payload.supplements : [];
  const herbals = Array.isArray(payload.herbals) ? payload.herbals : [];

  const warnings = computeInteractionRules([
    ...medications.map((v: unknown) => String(v)),
    ...supplements.map((v: unknown) => String(v)),
    ...herbals.map((v: unknown) => String(v)),
  ]);

  for (const w of warnings) {
    await db.$executeRawUnsafe(
      `
      INSERT INTO drug_interactions (
        id, psychiatrist_id, patient_id, primary_substance, interacting_substance, severity, risk, recommendation, resolution, override_justification, created_at
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,NOW())
      `,
      randomUUID(),
      userId,
      patientId,
      String(w.primarySubstance),
      String(w.interactingSubstance),
      String(w.severity),
      String(w.risk || ''),
      String(w.recommendation || ''),
      payload.resolution ? String(payload.resolution) : null,
      payload.overrideJustification ? String(payload.overrideJustification) : null,
    );
  }

  return {
    level: warnings.some((w) => String(w.severity) === 'CRITICAL')
      ? 'CRITICAL'
      : warnings.some((w) => String(w.severity) === 'CAUTION')
      ? 'CAUTION'
      : warnings.some((w) => String(w.severity) === 'MONITOR')
      ? 'MONITOR'
      : 'NONE',
    warnings,
  };
};

export const recordMedicationAdjustment = async (userId: string, payload: any) => {
  await ensurePsychiatristTables();
  await assertPsychiatrist(userId);

  const patientId = String(payload.patientId || '').trim();
  if (!patientId) throw new AppError('patientId is required', 400);

  const id = randomUUID();
  await db.$executeRawUnsafe(
    `
    INSERT INTO medication_history (
      id, psychiatrist_id, patient_id, medication, old_dose, new_dose, reason, outcome, changed_at, created_at
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,NOW())
    `,
    id,
    userId,
    patientId,
    String(payload.medication || '').trim(),
    payload.oldDose ? String(payload.oldDose) : null,
    payload.newDose ? String(payload.newDose) : null,
    payload.reason ? String(payload.reason) : null,
    payload.outcome ? String(payload.outcome) : null,
    payload.changedAt ? new Date(payload.changedAt) : new Date(),
  );

  return { id };
};

export const listMedicationHistory = async (userId: string, patientId?: string) => {
  await ensurePsychiatristTables();
  await assertPsychiatrist(userId);

  const rows = patientId
    ? await db.$queryRawUnsafe(
        `SELECT * FROM medication_history WHERE psychiatrist_id = $1 AND patient_id = $2 ORDER BY changed_at DESC`,
        userId,
        patientId,
      )
    : await db.$queryRawUnsafe(`SELECT * FROM medication_history WHERE psychiatrist_id = $1 ORDER BY changed_at DESC`, userId);

  return { items: rows };
};

export const getParameterTracking = async (userId: string, patientId: string) => {
  await ensurePsychiatristTables();
  await assertPsychiatrist(userId);

  const patient = await getPatientBasics(patientId);

  const [phqRows, gadRows, vitalsRows] = await Promise.all([
    db.$queryRawUnsafe(
      `SELECT assessed_at, total_score FROM phq9_assessments WHERE user_id = $1 ORDER BY assessed_at ASC LIMIT 24`,
      patient.patientUserId,
    ),
    db.$queryRawUnsafe(
      `SELECT assessed_at, total_score FROM gad7_assessments WHERE user_id = $1 ORDER BY assessed_at ASC LIMIT 24`,
      patient.patientUserId,
    ),
    db.$queryRawUnsafe(
      `SELECT recorded_at, adherence_percent, side_effects, systolic, diastolic, pulse, weight FROM patient_vitals WHERE patient_id = $1 ORDER BY recorded_at ASC LIMIT 24`,
      patientId,
    ),
  ]);

  return {
    patientId,
    phq9Trend: (phqRows as any[]).map((r) => ({ at: r.assessed_at, score: Number(r.total_score || 0) })),
    gad7Trend: (gadRows as any[]).map((r) => ({ at: r.assessed_at, score: Number(r.total_score || 0) })),
    medicationAdherence: (vitalsRows as any[]).map((r) => ({ at: r.recorded_at, adherencePercent: Number(r.adherence_percent || 0) })),
    sideEffects: (vitalsRows as any[]).map((r) => ({ at: r.recorded_at, sideEffects: r.side_effects || [] })),
    vitals: (vitalsRows as any[]).map((r) => ({
      at: r.recorded_at,
      systolic: r.systolic,
      diastolic: r.diastolic,
      pulse: r.pulse,
      weight: r.weight,
    })),
    aiAlerts: {
      symptomsWorsening: false,
      nonAdherence: (vitalsRows as any[]).some((r) => Number(r.adherence_percent || 100) < 60),
      severeSideEffects: (vitalsRows as any[]).some((r) => {
        const effects = Array.isArray(r.side_effects) ? r.side_effects : [];
        return effects.some((e: any) => Number(e.severity || 0) >= 7);
      }),
    },
  };
};

export const scheduleFollowUp = async (userId: string, payload: any) => {
  await ensurePsychiatristTables();
  await assertPsychiatrist(userId);

  const patientId = String(payload.patientId || '').trim();
  if (!patientId) throw new AppError('patientId is required', 400);

  const bookingReferenceId = `PSY-FU-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
  const type = String(payload.type || 'Medication Check');
  const durationMinutes = type === 'Medication Check (15 min)'
    ? 15
    : type === 'Med + Therapy (30 min)'
    ? 30
    : type === 'Full Evaluation (60 min)'
    ? 60
    : 30;

  const session = await db.therapySession.create({
    data: {
      bookingReferenceId,
      patientProfileId: patientId,
      therapistProfileId: userId,
      dateTime: new Date(payload.dateTime || Date.now() + 3 * 24 * 60 * 60 * 1000),
      durationMinutes,
      sessionFeeMinor: BigInt(0),
      paymentStatus: 'UNPAID',
      status: 'CONFIRMED',
    },
    select: { id: true, bookingReferenceId: true, dateTime: true, durationMinutes: true },
  });

  return {
    ...session,
    reminders: ['3 days before', '1 day before', '2 hours before'],
  };
};

export const getSelfModeDashboard = async (userId: string) => {
  await ensurePsychiatristTables();
  await assertPsychiatrist(userId);

  const weekStart = new Date();
  const day = weekStart.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  weekStart.setDate(weekStart.getDate() + diff);
  weekStart.setHours(0, 0, 0, 0);

  const [sessions, activePrescriptions, consultationsThisWeek, incomeAgg] = await Promise.all([
    db.therapySession.findMany({
      where: { therapistProfileId: userId },
      select: { patientProfileId: true },
    }),
    db.$queryRawUnsafe(
      `SELECT COUNT(*)::int AS value FROM prescriptions WHERE psychiatrist_id = $1 AND is_active = true`,
      userId,
    ),
    db.therapySession.count({ where: { therapistProfileId: userId, dateTime: { gte: weekStart } } }),
    db.therapySession.aggregate({
      _sum: { sessionFeeMinor: true },
      where: { therapistProfileId: userId },
    }),
  ]);

  const totalPatients = new Set((sessions as any[]).map((s) => String(s.patientProfileId))).size;

  return {
    mode: 'self',
    totalPatients: Number(totalPatients || 0),
    activePrescriptions: Number((activePrescriptions as any[])[0]?.value || 0),
    consultationsThisWeek: Number(consultationsThisWeek || 0),
    incomeMinor: Number((incomeAgg as any)?._sum?.sessionFeeMinor || 0),
  };
};
