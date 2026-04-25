import { randomUUID } from 'crypto';
import { prisma } from '../config/db';
import { AppError } from '../middleware/error.middleware';

const db = prisma as any;
let initialized = false;

const ensurePsychologistTables = async (): Promise<void> => {
  if (initialized) return;

  await db.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS psychologist_assessments (
      id TEXT PRIMARY KEY,
      psychologist_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      patient_id TEXT NOT NULL REFERENCES patient_profiles(id) ON DELETE CASCADE,
      assessment_type TEXT NOT NULL,
      title TEXT,
      observations TEXT,
      findings JSONB NOT NULL DEFAULT '{}'::jsonb,
      score NUMERIC,
      status TEXT NOT NULL DEFAULT 'completed',
      evaluated_at TIMESTAMP NOT NULL DEFAULT NOW(),
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP NOT NULL DEFAULT NOW()
    );
  `);

  await db.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS psychologist_reports (
      id TEXT PRIMARY KEY,
      psychologist_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      patient_id TEXT NOT NULL REFERENCES patient_profiles(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      diagnosis_observations TEXT,
      behavioral_analysis TEXT,
      cognitive_findings TEXT,
      recommendations TEXT,
      attachments JSONB NOT NULL DEFAULT '[]'::jsonb,
      status TEXT NOT NULL DEFAULT 'draft',
      submitted_at TIMESTAMP,
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP NOT NULL DEFAULT NOW()
    );
  `);

  await db.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS psychologist_settings (
      id TEXT PRIMARY KEY,
      psychologist_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      payload JSONB NOT NULL DEFAULT '{}'::jsonb,
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
      UNIQUE(psychologist_id)
    );
  `);

  await db.$executeRawUnsafe('CREATE INDEX IF NOT EXISTS psychologist_assessments_psychologist_idx ON psychologist_assessments(psychologist_id, evaluated_at DESC);');
  await db.$executeRawUnsafe('CREATE INDEX IF NOT EXISTS psychologist_assessments_patient_idx ON psychologist_assessments(patient_id, evaluated_at DESC);');
  await db.$executeRawUnsafe('CREATE INDEX IF NOT EXISTS psychologist_reports_psychologist_idx ON psychologist_reports(psychologist_id, updated_at DESC);');
  await db.$executeRawUnsafe('CREATE INDEX IF NOT EXISTS psychologist_reports_patient_idx ON psychologist_reports(patient_id, updated_at DESC);');
  await db.$executeRawUnsafe('CREATE INDEX IF NOT EXISTS psychologist_settings_psychologist_idx ON psychologist_settings(psychologist_id, updated_at DESC);');

  initialized = true;
};

const assertPsychologist = async (userId: string): Promise<void> => {
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { role: true, isDeleted: true },
  });

  if (!user || user.isDeleted) throw new AppError('Psychologist not found', 404);
  if (String(user.role) !== 'PSYCHOLOGIST') throw new AppError('Psychologist role required', 403);
};

const patientNameFromUser = (user: any): string => {
  if (!user) return 'Patient';
  if (user.showNameToProviders === false) return 'Anonymous Patient';
  const full = `${String(user.firstName || '').trim()} ${String(user.lastName || '').trim()}`.trim();
  return String(user.name || '').trim() || full || 'Patient';
};

const listAssignedPatientProfiles = async (userId: string) => {
  const assignments = await db.careTeamAssignment.findMany({
    where: { providerId: userId, status: 'ACTIVE' },
    select: { patientId: true, assignedAt: true },
    orderBy: { assignedAt: 'desc' },
  }).catch(() => []);

  const patientUserIds = assignments.map((row: any) => String(row.patientId));

  if (patientUserIds.length === 0) {
    // Return only assigned patients. Avoid a broad fallback list that could surface
    // unassigned patients and later fail authorization on detail endpoints.
    return [];
  }

  const profiles = await db.patientProfile.findMany({
    where: { userId: { in: patientUserIds } },
    select: {
      id: true,
      age: true,
      gender: true,
      userId: true,
      user: { select: { id: true, name: true, firstName: true, lastName: true, showNameToProviders: true } },
    },
  });

  const assignedAtByUserId = new Map(assignments.map((a: any) => [String(a.patientId), a.assignedAt]));

  return profiles.map((p: any) => ({
    patientProfileId: String(p.id),
    patientUserId: String(p.userId),
    patientName: patientNameFromUser(p.user),
    age: Number(p.age || 0),
    gender: String(p.gender || 'unknown'),
    assignedAt: assignedAtByUserId.get(String(p.userId)) || null,
  }));
};

const requireAssignedPatient = async (userId: string, patientProfileId: string): Promise<void> => {
  const patient = await db.patientProfile.findUnique({ where: { id: patientProfileId }, select: { userId: true } });
  if (!patient) throw new AppError('Patient not found', 404);

  const assignment = await db.careTeamAssignment.findFirst({
    where: { providerId: userId, patientId: String(patient.userId), status: 'ACTIVE' },
    select: { id: true },
  });

  if (!assignment) {
    const fallbackExists = await db.therapySession.findFirst({
      where: { therapistProfileId: userId, patientProfileId },
      select: { id: true },
    });

    if (!fallbackExists) throw new AppError('Patient is not assigned to this psychologist', 403);
  }
};

export const listPsychologistPatients = async (userId: string) => {
  await ensurePsychologistTables();
  await assertPsychologist(userId);

  const items = await listAssignedPatientProfiles(userId);
  return { items };
};

export const getPsychologistPatientOverview = async (userId: string, patientProfileId: string) => {
  await ensurePsychologistTables();
  await assertPsychologist(userId);
  await requireAssignedPatient(userId, patientProfileId);

  const patientProfile = await db.patientProfile.findUnique({
    where: { id: patientProfileId },
    select: {
      id: true,
      userId: true,
      age: true,
      gender: true,
      medicalHistory: true,
      emergencyContact: true,
      user: {
        select: {
          id: true,
          email: true,
          phone: true,
          name: true,
          firstName: true,
          lastName: true,
          showNameToProviders: true,
        },
      },
    },
  });

  if (!patientProfile) throw new AppError('Patient not found', 404);

  const [assessments, reports, careAssignments] = await Promise.all([
    db.$queryRawUnsafe(
      `SELECT id, assessment_type, status, evaluated_at
       FROM psychologist_assessments
       WHERE psychologist_id = $1 AND patient_id = $2
       ORDER BY evaluated_at DESC
       LIMIT 200`,
      userId,
      patientProfileId,
    ),
    db.$queryRawUnsafe(
      `SELECT id, status, updated_at
       FROM psychologist_reports
       WHERE psychologist_id = $1 AND patient_id = $2
       ORDER BY updated_at DESC
       LIMIT 200`,
      userId,
      patientProfileId,
    ),
    db.careTeamAssignment.findMany({
      where: { patientId: String(patientProfile.userId), status: 'ACTIVE' },
      orderBy: { assignedAt: 'desc' },
      select: {
        id: true,
        assignedAt: true,
        provider: {
          select: {
            id: true,
            role: true,
            email: true,
            phone: true,
            name: true,
            firstName: true,
            lastName: true,
            showNameToProviders: true,
          },
        },
      },
    }).catch(() => []),
  ]);

  const assessmentRows = assessments as any[];
  const reportRows = reports as any[];

  const careTeam = (careAssignments || []).map((row: any) => ({
    assignmentId: String(row.id),
    role: String(row.provider?.role || '').toLowerCase(),
    name: patientNameFromUser(row.provider),
    email: row.provider?.email || null,
    phone: row.provider?.phone || null,
    assignedAt: row.assignedAt || null,
    canConnect: true,
  }));

  const submittedReports = reportRows.filter((r) => String(r.status || '').toLowerCase() === 'submitted').length;

  return {
    patient: {
      id: String(patientProfile.id),
      userId: String(patientProfile.userId),
      name: patientNameFromUser(patientProfile.user),
      age: Number(patientProfile.age || 0),
      gender: String(patientProfile.gender || 'unknown'),
      email: patientProfile.user?.email || null,
      phone: patientProfile.user?.phone || null,
      medicalHistory: patientProfile.medicalHistory || null,
      emergencyContact: patientProfile.emergencyContact || null,
    },
    summary: {
      assessmentCount: assessmentRows.length,
      reportCount: reportRows.length,
      submittedReports,
      careTeamCount: careTeam.length,
      lastAssessmentAt: assessmentRows[0]?.evaluated_at || null,
      lastReportAt: reportRows[0]?.updated_at || null,
    },
    careTeam,
  };
};

export const getPsychologistDashboard = async (userId: string) => {
  await ensurePsychologistTables();
  await assertPsychologist(userId);

  const patients = await listAssignedPatientProfiles(userId);
  const patientProfileIds = patients.map((p) => p.patientProfileId);

  const [assessmentRows, reportRows] = await Promise.all([
    patientProfileIds.length
      ? db.$queryRawUnsafe(
          `SELECT id, patient_id, assessment_type, status, evaluated_at FROM psychologist_assessments WHERE psychologist_id = $1 AND patient_id = ANY($2::text[]) ORDER BY evaluated_at DESC LIMIT 500`,
          userId,
          patientProfileIds,
        )
      : Promise.resolve([]),
    patientProfileIds.length
      ? db.$queryRawUnsafe(
          `SELECT id, patient_id, status, submitted_at, updated_at FROM psychologist_reports WHERE psychologist_id = $1 AND patient_id = ANY($2::text[]) ORDER BY updated_at DESC LIMIT 500`,
          userId,
          patientProfileIds,
        )
      : Promise.resolve([]),
  ]);

  const assessments = assessmentRows as any[];
  const reports = reportRows as any[];

  const pendingEvaluations = Math.max(0, patients.length - new Set(assessments.map((a) => String(a.patient_id))).size);
  const submittedReports = reports.filter((r) => String(r.status).toLowerCase() === 'submitted').length;

  const now = new Date();
  const upcomingEvaluations = assessments.filter((a) => new Date(a.evaluated_at).getTime() > now.getTime()).length;

  const weekBuckets = Array.from({ length: 6 }, (_, idx) => {
    const d = new Date();
    d.setDate(d.getDate() - (5 - idx) * 7);
    return d;
  });

  const evalsPerWeek = weekBuckets.map((start) => {
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    const count = assessments.filter((a) => {
      const t = new Date(a.evaluated_at).getTime();
      return t >= start.getTime() && t <= end.getTime();
    }).length;
    return {
      label: `${start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`,
      value: count,
    };
  });

  const assessmentTypeMap = new Map<string, number>();
  for (const row of assessments) {
    const key = String(row.assessment_type || 'general');
    assessmentTypeMap.set(key, (assessmentTypeMap.get(key) || 0) + 1);
  }

  const assessmentTypeDistribution = Array.from(assessmentTypeMap.entries()).map(([type, value]) => ({ type, value }));

  const recentActivity = [
    ...assessments.slice(0, 5).map((a) => ({ type: 'evaluation_completed', at: a.evaluated_at, patientId: String(a.patient_id) })),
    ...reports.slice(0, 5).map((r) => ({ type: 'report_updated', at: r.updated_at, patientId: String(r.patient_id) })),
    ...patients.slice(0, 5).map((p) => ({ type: 'patient_assigned', at: p.assignedAt, patientId: p.patientProfileId })),
  ]
    .filter((item) => item.at)
    .sort((a, b) => new Date(String(b.at)).getTime() - new Date(String(a.at)).getTime())
    .slice(0, 10);

  return {
    cards: {
      totalPatients: patients.length,
      pendingEvaluations,
      reportsSubmitted: submittedReports,
      upcomingEvaluations,
    },
    charts: {
      evaluationsPerWeek: evalsPerWeek,
      assessmentTypeDistribution,
    },
    recentActivity,
  };
};

export const listPsychologistAssessments = async (userId: string, patientId?: string) => {
  await ensurePsychologistTables();
  await assertPsychologist(userId);

  const wherePatient = patientId ? ' AND patient_id = $2' : '';
  const rows = await db.$queryRawUnsafe(
    `SELECT id, patient_id, assessment_type, title, observations, findings, score, status, evaluated_at, created_at, updated_at
     FROM psychologist_assessments
     WHERE psychologist_id = $1${wherePatient}
     ORDER BY evaluated_at DESC
     LIMIT 500`,
    ...(patientId ? [userId, patientId] : [userId]),
  );

  return { items: rows as any[] };
};

export const createPsychologistAssessment = async (userId: string, payload: any) => {
  await ensurePsychologistTables();
  await assertPsychologist(userId);

  const patientId = String(payload.patientId || '').trim();
  if (!patientId) throw new AppError('patientId is required', 400);
  await requireAssignedPatient(userId, patientId);

  const id = randomUUID();
  const now = new Date();

  await db.$executeRawUnsafe(
    `INSERT INTO psychologist_assessments (id, psychologist_id, patient_id, assessment_type, title, observations, findings, score, status, evaluated_at, created_at, updated_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7::jsonb,$8,$9,$10,$11,$12)`,
    id,
    userId,
    patientId,
    String(payload.assessmentType || 'general'),
    payload.title ? String(payload.title) : null,
    payload.observations ? String(payload.observations) : null,
    JSON.stringify(payload.findings || {}),
    payload.score != null ? Number(payload.score) : null,
    String(payload.status || 'completed'),
    payload.evaluatedAt ? new Date(payload.evaluatedAt) : now,
    now,
    now,
  );

  return { id };
};

export const listPsychologistReports = async (userId: string, patientId?: string) => {
  await ensurePsychologistTables();
  await assertPsychologist(userId);

  const wherePatient = patientId ? ' AND patient_id = $2' : '';
  const rows = await db.$queryRawUnsafe(
    `SELECT id, patient_id, title, diagnosis_observations, behavioral_analysis, cognitive_findings, recommendations, attachments, status, submitted_at, created_at, updated_at
     FROM psychologist_reports
     WHERE psychologist_id = $1${wherePatient}
     ORDER BY updated_at DESC
     LIMIT 500`,
    ...(patientId ? [userId, patientId] : [userId]),
  );

  return { items: rows as any[] };
};

export const createPsychologistReport = async (userId: string, payload: any) => {
  await ensurePsychologistTables();
  await assertPsychologist(userId);

  const patientId = String(payload.patientId || '').trim();
  if (!patientId) throw new AppError('patientId is required', 400);
  await requireAssignedPatient(userId, patientId);

  const id = randomUUID();
  const now = new Date();
  const status = String(payload.status || 'draft').toLowerCase();

  await db.$executeRawUnsafe(
    `INSERT INTO psychologist_reports (id, psychologist_id, patient_id, title, diagnosis_observations, behavioral_analysis, cognitive_findings, recommendations, attachments, status, submitted_at, created_at, updated_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9::jsonb,$10,$11,$12,$13)`,
    id,
    userId,
    patientId,
    String(payload.title || 'Psychological Report'),
    payload.diagnosisObservations ? String(payload.diagnosisObservations) : null,
    payload.behavioralAnalysis ? String(payload.behavioralAnalysis) : null,
    payload.cognitiveFindings ? String(payload.cognitiveFindings) : null,
    payload.recommendations ? String(payload.recommendations) : null,
    JSON.stringify(payload.attachments || []),
    status,
    status === 'submitted' ? now : null,
    now,
    now,
  );

  return { id };
};

export const updatePsychologistReport = async (userId: string, reportId: string, payload: any) => {
  await ensurePsychologistTables();
  await assertPsychologist(userId);

  const existingRows = await db.$queryRawUnsafe(
    `SELECT id, patient_id FROM psychologist_reports WHERE id = $1 AND psychologist_id = $2 LIMIT 1`,
    reportId,
    userId,
  );

  const existing = (existingRows as any[])[0];
  if (!existing) throw new AppError('Report not found', 404);

  const now = new Date();
  const nextStatus = payload.status ? String(payload.status).toLowerCase() : null;

  await db.$executeRawUnsafe(
    `UPDATE psychologist_reports
     SET title = COALESCE($1, title),
         diagnosis_observations = COALESCE($2, diagnosis_observations),
         behavioral_analysis = COALESCE($3, behavioral_analysis),
         cognitive_findings = COALESCE($4, cognitive_findings),
         recommendations = COALESCE($5, recommendations),
         attachments = COALESCE($6::jsonb, attachments),
         status = COALESCE($7, status),
         submitted_at = CASE WHEN COALESCE($7, status) = 'submitted' THEN NOW() ELSE submitted_at END,
         updated_at = $8
     WHERE id = $9 AND psychologist_id = $10`,
    payload.title != null ? String(payload.title) : null,
    payload.diagnosisObservations != null ? String(payload.diagnosisObservations) : null,
    payload.behavioralAnalysis != null ? String(payload.behavioralAnalysis) : null,
    payload.cognitiveFindings != null ? String(payload.cognitiveFindings) : null,
    payload.recommendations != null ? String(payload.recommendations) : null,
    payload.attachments != null ? JSON.stringify(payload.attachments) : null,
    nextStatus,
    now,
    reportId,
    userId,
  );

  return { id: reportId };
};

export const listPsychologistTests = async (userId: string, patientId?: string) => {
  await ensurePsychologistTables();
  await assertPsychologist(userId);

  const assessments = await listPsychologistAssessments(userId, patientId);
  const items = (assessments.items || []).map((item: any) => ({
    id: item.id,
    patientId: item.patient_id,
    testType: item.assessment_type,
    score: item.score,
    evaluatedAt: item.evaluated_at,
  }));

  return { items };
};

export const getPsychologistSchedule = async (userId: string) => {
  await ensurePsychologistTables();
  await assertPsychologist(userId);

  const now = new Date();
  const upcoming = await db.therapySession.findMany({
    where: {
      therapistProfileId: userId,
      dateTime: { gte: now },
    },
    orderBy: { dateTime: 'asc' },
    take: 100,
    select: {
      id: true,
      dateTime: true,
      status: true,
      patientProfileId: true,
      patientProfile: {
        select: {
          user: { select: { name: true, firstName: true, lastName: true, showNameToProviders: true } },
        },
      },
    },
  });

  return {
    items: upcoming.map((item: any) => ({
      id: String(item.id),
      patientId: String(item.patientProfileId),
      patientName: patientNameFromUser(item.patientProfile?.user),
      scheduledAt: item.dateTime,
      status: String(item.status || 'scheduled').toLowerCase(),
    })),
  };
};

export const getPsychologistMessages = async (userId: string) => {
  await ensurePsychologistTables();
  await assertPsychologist(userId);

  const items = await db.notification.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    take: 50,
    select: {
      id: true,
      type: true,
      title: true,
      message: true,
      isRead: true,
      createdAt: true,
    },
  }).catch(() => []);

  return { items };
};

export const getPsychologistProfile = async (userId: string) => {
  await ensurePsychologistTables();
  await assertPsychologist(userId);

  const user = await db.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      isTherapistVerified: true,
      therapistVerifiedAt: true,
      status: true,
      createdAt: true,
    },
  });

  if (!user) throw new AppError('Psychologist not found', 404);

  return {
    id: user.id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    verification: {
      degreeVerified: Boolean(user.isTherapistVerified),
      licenseVerified: Boolean(user.isTherapistVerified),
      certificationStatus: Boolean(user.isTherapistVerified) ? 'verified' : 'pending',
      adminApproval: user.therapistVerifiedAt ? 'approved' : 'pending',
      badge: String(user.status || '').toUpperCase() === 'SUSPENDED' ? 'suspended' : user.isTherapistVerified ? 'verified' : 'pending',
    },
    createdAt: user.createdAt,
  };
};

export const getPsychologistSettings = async (userId: string) => {
  await ensurePsychologistTables();
  await assertPsychologist(userId);

  const rows = await db.$queryRawUnsafe(
    `SELECT payload, updated_at FROM psychologist_settings WHERE psychologist_id = $1 LIMIT 1`,
    userId,
  );

  const row = (rows as any[])[0];
  return {
    payload: row?.payload || {},
    updatedAt: row?.updated_at || null,
  };
};

export const upsertPsychologistSettings = async (userId: string, payload: any) => {
  await ensurePsychologistTables();
  await assertPsychologist(userId);

  const now = new Date();
  await db.$executeRawUnsafe(
    `INSERT INTO psychologist_settings (id, psychologist_id, payload, created_at, updated_at)
     VALUES ($1, $2, $3::jsonb, $4, $5)
     ON CONFLICT (psychologist_id)
     DO UPDATE SET payload = EXCLUDED.payload, updated_at = EXCLUDED.updated_at`,
    randomUUID(),
    userId,
    JSON.stringify(payload || {}),
    now,
    now,
  );

  return { ok: true };
};
