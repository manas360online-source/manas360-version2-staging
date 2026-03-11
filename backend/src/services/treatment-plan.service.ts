import { randomUUID } from 'crypto';
import { prisma } from '../config/db';
import { AppError } from '../middleware/error.middleware';

const db = prisma as any;
let initialized = false;

const ensureTreatmentPlanTables = async (): Promise<void> => {
  if (initialized) return;

  await db.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS treatment_plans (
      id TEXT PRIMARY KEY,
      patient_profile_id TEXT NOT NULL REFERENCES patient_profiles(id) ON DELETE CASCADE,
      patient_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      primary_provider_id TEXT REFERENCES users(id) ON DELETE SET NULL,
      plan_name TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'active',
      week_number INT NOT NULL DEFAULT 1,
      total_weeks INT NOT NULL DEFAULT 8,
      adherence_percent NUMERIC NOT NULL DEFAULT 0,
      recommendation_snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
      UNIQUE(patient_profile_id, status)
    );
  `);

  await db.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS treatment_plan_tasks (
      id TEXT PRIMARY KEY,
      plan_id TEXT NOT NULL REFERENCES treatment_plans(id) ON DELETE CASCADE,
      task_type TEXT NOT NULL,
      title TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      due_at TIMESTAMP,
      completed_at TIMESTAMP,
      sort_order INT NOT NULL DEFAULT 0,
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP NOT NULL DEFAULT NOW()
    );
  `);

  await db.$executeRawUnsafe('CREATE INDEX IF NOT EXISTS treatment_plans_patient_user_idx ON treatment_plans(patient_user_id, updated_at DESC);');
  await db.$executeRawUnsafe('CREATE INDEX IF NOT EXISTS treatment_plan_tasks_plan_idx ON treatment_plan_tasks(plan_id, sort_order ASC);');
  initialized = true;
};

const getPatientProfile = async (userId: string) => {
  const patient = await db.patientProfile.findUnique({ where: { userId }, select: { id: true, userId: true } });
  if (patient) return patient;

  const created = await db.patientProfile.create({
    data: {
      userId,
      age: 25,
      gender: 'prefer_not_to_say',
      emergencyContact: {
        name: 'Not provided',
        relation: 'Not provided',
        phone: 'Not provided',
      },
    },
    select: { id: true, userId: true },
  }).catch(() => null);

  if (!created) {
    throw new AppError('Patient profile unavailable', 500);
  }

  return created;
};

const defaultTaskTemplate = [
  { taskType: 'mood', title: 'Daily mood check-in', sortOrder: 1 },
  { taskType: 'exercise', title: 'CBT breathing exercise (5 min)', sortOrder: 2 },
  { taskType: 'assessment', title: 'Quick mental check', sortOrder: 3 },
  { taskType: 'session', title: 'Review next therapist session', sortOrder: 4 },
];

const createDefaultPlan = async (patientProfileId: string, userId: string, recommendationSnapshot: Record<string, any> = {}) => {
  const now = new Date();
  const planId = randomUUID();

  await db.$executeRawUnsafe(
    `INSERT INTO treatment_plans (id, patient_profile_id, patient_user_id, plan_name, status, week_number, total_weeks, adherence_percent, recommendation_snapshot, created_at, updated_at)
     VALUES ($1, $2, $3, $4, 'active', 1, 8, 0, $5::jsonb, $6, $7)`,
    planId,
    patientProfileId,
    userId,
    'Guided Recovery Plan',
    JSON.stringify(recommendationSnapshot || {}),
    now,
    now,
  );

  for (const item of defaultTaskTemplate) {
    await db.$executeRawUnsafe(
      `INSERT INTO treatment_plan_tasks (id, plan_id, task_type, title, status, sort_order, created_at, updated_at)
       VALUES ($1, $2, $3, $4, 'pending', $5, $6, $7)`,
      randomUUID(),
      planId,
      item.taskType,
      item.title,
      item.sortOrder,
      now,
      now,
    );
  }

  return planId;
};

const getOrCreateActivePlan = async (patientProfileId: string, userId: string) => {
  const rows = await db.$queryRawUnsafe(
    `SELECT id, patient_profile_id, patient_user_id, primary_provider_id, plan_name, status, week_number, total_weeks, adherence_percent, recommendation_snapshot, created_at, updated_at
     FROM treatment_plans
     WHERE patient_profile_id = $1 AND status = 'active'
     ORDER BY updated_at DESC
     LIMIT 1`,
    patientProfileId,
  );

  const existing = (rows as any[])[0];
  if (existing) return existing;

  const id = await createDefaultPlan(patientProfileId, userId);
  const createdRows = await db.$queryRawUnsafe(
    `SELECT id, patient_profile_id, patient_user_id, primary_provider_id, plan_name, status, week_number, total_weeks, adherence_percent, recommendation_snapshot, created_at, updated_at
     FROM treatment_plans WHERE id = $1 LIMIT 1`,
    id,
  );

  return (createdRows as any[])[0];
};

const buildRecommendations = (assessmentType: string, score: number, severity: string): string[] => {
  const level = String(severity || '').toLowerCase();
  if (level.includes('severe')) {
    return [
      `${assessmentType} indicates severe concern. Schedule therapist session within 24 hours.`,
      'Complete grounding and breathing exercise now.',
      'Use emergency support if distress escalates.',
    ];
  }
  if (level.includes('moderate')) {
    return [
      `${assessmentType} shows moderate symptoms. Complete one CBT exercise today.`,
      'Book therapist follow-up this week.',
      'Track mood and sleep daily for 7 days.',
    ];
  }

  return [
    `${assessmentType} is currently in mild range. Maintain routine.`,
    'Continue mood tracking and weekly quick checks.',
    'Complete assigned exercise to improve adherence.',
  ];
};

export const syncTreatmentPlanFromAssessment = async (
  userId: string,
  input: { assessmentType: string; score: number; severity: string },
) => {
  await ensureTreatmentPlanTables();
  const patientProfile = await getPatientProfile(userId);
  const plan = await getOrCreateActivePlan(patientProfile.id, userId);

  const snapshot = {
    assessmentType: input.assessmentType,
    score: input.score,
    severity: input.severity,
    recommendations: buildRecommendations(input.assessmentType, input.score, input.severity),
    updatedAt: new Date().toISOString(),
  };

  await db.$executeRawUnsafe(
    `UPDATE treatment_plans
     SET recommendation_snapshot = $1::jsonb,
         updated_at = NOW()
     WHERE id = $2`,
    JSON.stringify(snapshot),
    plan.id,
  );

  return snapshot;
};

export const getMyTreatmentPlan = async (userId: string) => {
  await ensureTreatmentPlanTables();
  const patientProfile = await getPatientProfile(userId);
  const plan = await getOrCreateActivePlan(patientProfile.id, userId);

  const tasksRows = await db.$queryRawUnsafe(
    `SELECT id, task_type, title, status, due_at, completed_at, sort_order
     FROM treatment_plan_tasks
     WHERE plan_id = $1
     ORDER BY sort_order ASC, created_at ASC`,
    plan.id,
  );
  const tasks = tasksRows as any[];

  const completed = tasks.filter((item) => String(item.status || '').toLowerCase() === 'completed').length;
  const adherencePercent = tasks.length ? Number(((completed / tasks.length) * 100).toFixed(1)) : 0;

  if (Number(plan.adherence_percent || 0) !== adherencePercent) {
    await db.$executeRawUnsafe(
      `UPDATE treatment_plans SET adherence_percent = $1, updated_at = NOW() WHERE id = $2`,
      adherencePercent,
      plan.id,
    );
  }

  return {
    plan: {
      id: String(plan.id),
      name: String(plan.plan_name || 'Guided Recovery Plan'),
      status: String(plan.status || 'active'),
      weekNumber: Number(plan.week_number || 1),
      totalWeeks: Number(plan.total_weeks || 8),
      adherencePercent,
      recommendationSnapshot:
        plan.recommendation_snapshot && typeof plan.recommendation_snapshot === 'object'
          ? plan.recommendation_snapshot
          : {},
      updatedAt: plan.updated_at,
    },
    tasks: tasks.map((item) => ({
      id: String(item.id),
      type: String(item.task_type || 'task'),
      title: String(item.title || 'Task'),
      status: String(item.status || 'pending'),
      dueAt: item.due_at,
      completedAt: item.completed_at,
      sortOrder: Number(item.sort_order || 0),
    })),
  };
};

export const completeTreatmentPlanTask = async (userId: string, taskId: string) => {
  await ensureTreatmentPlanTables();
  const patientProfile = await getPatientProfile(userId);

  const rows = await db.$queryRawUnsafe(
    `SELECT t.id, t.plan_id
     FROM treatment_plan_tasks t
     INNER JOIN treatment_plans p ON p.id = t.plan_id
     WHERE t.id = $1 AND p.patient_profile_id = $2 AND p.status = 'active'
     LIMIT 1`,
    taskId,
    patientProfile.id,
  );

  const target = (rows as any[])[0];
  if (!target) {
    throw new AppError('Treatment plan task not found', 404);
  }

  await db.$executeRawUnsafe(
    `UPDATE treatment_plan_tasks
     SET status = 'completed', completed_at = NOW(), updated_at = NOW()
     WHERE id = $1`,
    taskId,
  );

  return { id: taskId, status: 'completed' };
};
