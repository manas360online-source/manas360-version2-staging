import { prisma } from '../config/db';
import { AppError } from '../middleware/error.middleware';
import { generateSummary } from './ai.service';

const db = prisma as any;

const assertTherapist = async (userId: string) => {
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { id: true, role: true, isDeleted: true },
  });

  if (!user || user.isDeleted) {
    throw new AppError('Therapist not found', 404);
  }

  const role = String(user.role || '').toUpperCase();
  if (!['THERAPIST', 'PSYCHIATRIST', 'COACH'].includes(role)) {
    throw new AppError('Therapist role required', 403);
  }

  return user;
};

const resolvePatientName = async (patientId?: string | null, fallbackName?: string | null): Promise<string> => {
  if (patientId) {
    const patient = await db.patientProfile.findUnique({
      where: { id: patientId },
      select: {
        user: {
          select: {
            showNameToProviders: true,
            name: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    const user = patient?.user;
    if (user?.showNameToProviders === false) {
      return 'Anonymous Patient';
    }

    const fullName = `${String(user?.firstName || '').trim()} ${String(user?.lastName || '').trim()}`.trim();
    return String(user?.name || '').trim() || fullName || String(fallbackName || '').trim() || 'Patient';
  }

  const fallback = String(fallbackName || '').trim();
  return fallback || 'Patient';
};

const normalizeStatus = (status: unknown, fallback: 'draft' | 'active' = 'draft'): string => {
  const value = String(status || '').trim().toLowerCase();
  if (!value) return fallback;
  return value;
};

export const listTherapistStructuredSessionNotes = async (userId: string) => {
  await assertTherapist(userId);

  const sessions = await db.therapySession.findMany({
    where: { therapistProfileId: userId },
    orderBy: { dateTime: 'desc' },
    take: 100,
    select: {
      id: true,
      bookingReferenceId: true,
      dateTime: true,
      noteUpdatedAt: true,
      patientProfileId: true,
      patientProfile: {
        select: {
          user: {
            select: {
              showNameToProviders: true,
              name: true,
              firstName: true,
              lastName: true,
            },
          },
        },
      },
      therapistSessionNote: {
        select: {
          sessionType: true,
          subjective: true,
          objective: true,
          assessment: true,
          plan: true,
          phq9: true,
          gad7: true,
          assignedExercise: true,
          nextSessionDate: true,
          status: true,
          history: true,
          updatedAt: true,
        },
      },
    },
  });

  const items = sessions.map((row: any) => {
    const patient = row.patientProfile?.user;
    const fullName = `${String(patient?.firstName || '').trim()} ${String(patient?.lastName || '').trim()}`.trim();
    const patientName = patient?.showNameToProviders === false
      ? 'Anonymous Patient'
      : String(patient?.name || '').trim() || fullName || 'Patient';

    const note = row.therapistSessionNote;
    const status = note?.status ? String(note.status).toLowerCase() : row.noteUpdatedAt ? 'submitted' : 'draft';

    return {
      id: String(row.id),
      sessionId: String(row.id),
      bookingReferenceId: row.bookingReferenceId,
      patientId: String(row.patientProfileId),
      patientName,
      sessionAt: row.dateTime,
      status: status === 'submitted' ? 'submitted' : 'draft',
      noteUpdatedAt: note?.updatedAt || row.noteUpdatedAt || null,
      sessionType: String(note?.sessionType || 'Therapy Session'),
      subjective: String(note?.subjective || ''),
      objective: String(note?.objective || ''),
      assessment: String(note?.assessment || ''),
      plan: String(note?.plan || ''),
      phq9: note?.phq9 == null ? '' : String(note.phq9),
      gad7: note?.gad7 == null ? '' : String(note.gad7),
      assignedExercise: String(note?.assignedExercise || ''),
      nextSessionDate: note?.nextSessionDate ? new Date(note.nextSessionDate).toISOString() : '',
      history: Array.isArray(note?.history) ? note.history : [],
    };
  });

  return { items };
};

export const upsertTherapistStructuredSessionNote = async (
  userId: string,
  sessionId: string,
  payload: {
    sessionType?: string;
    subjective?: string;
    objective?: string;
    assessment?: string;
    plan?: string;
    phq9?: string | number | null;
    gad7?: string | number | null;
    assignedExercise?: string;
    nextSessionDate?: string | null;
    status?: string;
    history?: Array<{ at: string; event: string }>;
  },
) => {
  await assertTherapist(userId);

  const session = await db.therapySession.findFirst({
    where: { id: sessionId, therapistProfileId: userId },
    select: { id: true, patientProfileId: true },
  });

  if (!session) {
    throw new AppError('Session not found', 404);
  }

  const phq9 = payload.phq9 == null || String(payload.phq9).trim() === '' ? null : Number(payload.phq9);
  const gad7 = payload.gad7 == null || String(payload.gad7).trim() === '' ? null : Number(payload.gad7);

  const updated = await db.therapistSessionNote.upsert({
    where: { sessionId },
    create: {
      sessionId,
      therapistId: userId,
      patientId: String(session.patientProfileId),
      sessionType: String(payload.sessionType || 'Therapy Session'),
      subjective: String(payload.subjective || ''),
      objective: String(payload.objective || ''),
      assessment: String(payload.assessment || ''),
      plan: String(payload.plan || ''),
      phq9: Number.isFinite(phq9 as number) ? phq9 : null,
      gad7: Number.isFinite(gad7 as number) ? gad7 : null,
      assignedExercise: payload.assignedExercise ? String(payload.assignedExercise) : null,
      nextSessionDate: payload.nextSessionDate ? new Date(payload.nextSessionDate) : null,
      status: normalizeStatus(payload.status, 'draft'),
      history: Array.isArray(payload.history) ? payload.history : [],
    },
    update: {
      sessionType: String(payload.sessionType || 'Therapy Session'),
      subjective: String(payload.subjective || ''),
      objective: String(payload.objective || ''),
      assessment: String(payload.assessment || ''),
      plan: String(payload.plan || ''),
      phq9: Number.isFinite(phq9 as number) ? phq9 : null,
      gad7: Number.isFinite(gad7 as number) ? gad7 : null,
      assignedExercise: payload.assignedExercise ? String(payload.assignedExercise) : null,
      nextSessionDate: payload.nextSessionDate ? new Date(payload.nextSessionDate) : null,
      status: normalizeStatus(payload.status, 'draft'),
      history: Array.isArray(payload.history) ? payload.history : [],
    },
  });

  await db.therapySession.update({
    where: { id: sessionId },
    data: {
      noteUpdatedAt: new Date(),
      noteUpdatedByTherapistId: userId,
    },
  });

  return {
    id: String(updated.id),
    sessionId: String(updated.sessionId),
    status: String(updated.status),
    updatedAt: updated.updatedAt,
  };
};

export const generateTherapistAiSessionNote = async (userId: string, sessionId: string) => {
  await assertTherapist(userId);

  const session = await db.therapySession.findFirst({
    where: { id: sessionId, therapistProfileId: userId },
    select: {
      id: true,
      patientProfileId: true,
      transcript: true,
    },
  });

  if (!session) {
    throw new AppError('Session not found', 404);
  }

  const transcript = String(session.transcript || '').trim();
  if (!transcript) {
    throw new AppError('No transcript found for this session', 400);
  }

  const summary = await generateSummary(transcript);

  const existingNote = await db.therapistSessionNote.findUnique({
    where: { sessionId },
    select: { history: true },
  });

  const history = Array.isArray(existingNote?.history) ? existingNote.history : [];
  const nextHistory = [
    ...history,
    {
      at: new Date().toISOString(),
      event: 'ai_clinical_summary_generated',
      moodAnalysis: {
        emotionalTone: summary.moodSentiment.primaryEmotionalState,
        energyLevel: `Volatility ${summary.moodSentiment.emotionalVolatilityScore}/10`,
        riskSignals: `Anxiety ${summary.moodSentiment.anxietyLevelScore}/10`,
      },
      moodSentiment: summary.moodSentiment,
      actionItems: summary.actionItems,
    },
  ];

  const updated = await db.therapistSessionNote.upsert({
    where: { sessionId },
    create: {
      sessionId,
      therapistId: userId,
      patientId: String(session.patientProfileId),
      sessionType: 'Therapy Session',
      subjective: summary.soapNote.subjective,
      objective: summary.soapNote.objective,
      assessment: summary.soapNote.assessment,
      plan: summary.soapNote.plan,
      status: 'draft',
      history: nextHistory,
    },
    update: {
      subjective: summary.soapNote.subjective,
      objective: summary.soapNote.objective,
      assessment: summary.soapNote.assessment,
      plan: summary.soapNote.plan,
      history: nextHistory,
    },
  });

  await db.therapySession.update({
    where: { id: sessionId },
    data: {
      noteUpdatedAt: new Date(),
      noteUpdatedByTherapistId: userId,
    },
  });

  return {
    sessionId,
    noteId: String(updated.id),
    moodAnalysis: {
      emotionalTone: summary.moodSentiment.primaryEmotionalState,
      energyLevel: `Volatility ${summary.moodSentiment.emotionalVolatilityScore}/10`,
      riskSignals: `Anxiety ${summary.moodSentiment.anxietyLevelScore}/10`,
    },
    moodSentiment: summary.moodSentiment,
    soapNote: summary.soapNote,
    actionItems: summary.actionItems,
    status: String(updated.status),
    updatedAt: updated.updatedAt,
  };
};

export const listTherapistExercises = async (userId: string) => {
  await assertTherapist(userId);

  const rows = await db.therapistExercise.findMany({
    where: { therapistId: userId },
    orderBy: { updatedAt: 'desc' },
  });

  return {
    items: rows.map((row: any) => ({
      id: String(row.id),
      patientId: row.patientId ? String(row.patientId) : '',
      assignedTo: String(row.patientName || ''),
      name: String(row.name || ''),
      category: String(row.category || ''),
      worksheetUrl: String(row.worksheetUrl || ''),
      completionRate: Number(row.completionRate || 0),
      status: String(row.status || 'active'),
      updatedAt: row.updatedAt,
    })),
  };
};

export const createTherapistExercise = async (userId: string, payload: any) => {
  await assertTherapist(userId);

  const patientId = payload.patientId ? String(payload.patientId) : null;
  const patientName = await resolvePatientName(patientId, payload.assignedTo);

  const created = await db.therapistExercise.create({
    data: {
      therapistId: userId,
      patientId,
      patientName,
      name: String(payload.name || '').trim(),
      category: String(payload.category || '').trim(),
      worksheetUrl: payload.worksheetUrl ? String(payload.worksheetUrl).trim() : null,
      completionRate: Number(payload.completionRate || 0),
      status: normalizeStatus(payload.status, 'active'),
    },
  });

  return created;
};

export const updateTherapistExercise = async (userId: string, id: string, payload: any) => {
  await assertTherapist(userId);

  const existing = await db.therapistExercise.findFirst({ where: { id, therapistId: userId } });
  if (!existing) throw new AppError('Exercise not found', 404);

  const patientId = payload.patientId !== undefined ? (payload.patientId ? String(payload.patientId) : null) : existing.patientId;
  const patientName = await resolvePatientName(patientId, payload.assignedTo ?? existing.patientName);

  return db.therapistExercise.update({
    where: { id },
    data: {
      name: payload.name !== undefined ? String(payload.name || '').trim() : undefined,
      category: payload.category !== undefined ? String(payload.category || '').trim() : undefined,
      worksheetUrl: payload.worksheetUrl !== undefined ? (payload.worksheetUrl ? String(payload.worksheetUrl).trim() : null) : undefined,
      patientId,
      patientName,
      completionRate: payload.completionRate !== undefined ? Math.max(0, Math.min(100, Number(payload.completionRate || 0))) : undefined,
      status: payload.status !== undefined ? normalizeStatus(payload.status, 'active') : undefined,
    },
  });
};

export const bumpTherapistExerciseCompletion = async (userId: string, id: string, amount = 10) => {
  await assertTherapist(userId);

  const existing = await db.therapistExercise.findFirst({ where: { id, therapistId: userId } });
  if (!existing) throw new AppError('Exercise not found', 404);

  const next = Math.max(0, Math.min(100, Number(existing.completionRate || 0) + Number(amount || 10)));

  return db.therapistExercise.update({
    where: { id },
    data: { completionRate: next },
  });
};

export const deleteTherapistExercise = async (userId: string, id: string) => {
  await assertTherapist(userId);

  const existing = await db.therapistExercise.findFirst({ where: { id, therapistId: userId } });
  if (!existing) throw new AppError('Exercise not found', 404);

  await db.therapistExercise.delete({ where: { id } });
  return { id };
};

export const listTherapistAssessmentRecords = async (userId: string) => {
  await assertTherapist(userId);

  const rows = await db.therapistAssessmentRecord.findMany({
    where: { therapistId: userId },
    orderBy: { assessedAt: 'desc' },
    take: 300,
  });

  return {
    items: rows.map((row: any) => ({
      id: String(row.id),
      type: String(row.type || ''),
      patient: String(row.patientName || ''),
      patientId: row.patientId ? String(row.patientId) : '',
      score: Number(row.score || 0),
      date: new Date(row.assessedAt).toISOString().slice(0, 10),
      assessedAt: row.assessedAt,
    })),
  };
};

export const createTherapistAssessmentRecord = async (userId: string, payload: any) => {
  await assertTherapist(userId);

  const patientId = payload.patientId ? String(payload.patientId) : null;
  const patientName = await resolvePatientName(patientId, payload.patient);

  return db.therapistAssessmentRecord.create({
    data: {
      therapistId: userId,
      patientId,
      patientName,
      type: String(payload.type || '').trim(),
      score: Number(payload.score || 0),
      assessedAt: payload.assessedAt ? new Date(payload.assessedAt) : new Date(),
    },
  });
};

export const listTherapistResources = async (userId: string) => {
  await assertTherapist(userId);

  const rows = await db.therapistResource.findMany({ where: { therapistId: userId }, orderBy: { updatedAt: 'desc' } });

  return {
    items: rows.map((row: any) => ({
      id: String(row.id),
      title: String(row.title || ''),
      type: String(row.type || ''),
      assignedTo: String(row.patientName || ''),
      patientId: row.patientId ? String(row.patientId) : '',
      views: Number(row.views || 0),
      updatedAt: row.updatedAt,
    })),
  };
};

export const createTherapistResource = async (userId: string, payload: any) => {
  await assertTherapist(userId);

  const patientId = payload.patientId ? String(payload.patientId) : null;
  const patientName = await resolvePatientName(patientId, payload.assignedTo);

  return db.therapistResource.create({
    data: {
      therapistId: userId,
      patientId,
      patientName: patientId || payload.assignedTo ? patientName : null,
      title: String(payload.title || '').trim(),
      type: String(payload.type || '').trim(),
      views: Number(payload.views || 0),
    },
  });
};

export const bumpTherapistResourceView = async (userId: string, id: string) => {
  await assertTherapist(userId);

  const existing = await db.therapistResource.findFirst({ where: { id, therapistId: userId } });
  if (!existing) throw new AppError('Resource not found', 404);

  return db.therapistResource.update({
    where: { id },
    data: { views: Number(existing.views || 0) + 1 },
  });
};

export const deleteTherapistResource = async (userId: string, id: string) => {
  await assertTherapist(userId);

  const existing = await db.therapistResource.findFirst({ where: { id, therapistId: userId } });
  if (!existing) throw new AppError('Resource not found', 404);

  await db.therapistResource.delete({ where: { id } });
  return { id };
};

export const listTherapistCareTeamMembers = async (userId: string, patientId?: string) => {
  await assertTherapist(userId);

  const where: Record<string, unknown> = { therapistId: userId };
  if (patientId && patientId.trim()) {
    where.patientId = patientId.trim();
  }

  const rows = await db.therapistCareTeamMember.findMany({ where, orderBy: { updatedAt: 'desc' } });
  return {
    items: rows.map((row: any) => ({
      id: String(row.id),
      role: String(row.role || ''),
      name: String(row.name || ''),
      treatment: String(row.treatment || ''),
      notes: String(row.notes || ''),
      suggestions: String(row.suggestions || ''),
      prescriptions: String(row.prescriptions || ''),
      patientId: row.patientId ? String(row.patientId) : '',
      updatedAt: row.updatedAt,
    })),
  };
};

export const createTherapistCareTeamMember = async (userId: string, payload: any) => {
  await assertTherapist(userId);

  return db.therapistCareTeamMember.create({
    data: {
      therapistId: userId,
      patientId: payload.patientId ? String(payload.patientId) : null,
      role: String(payload.role || '').trim(),
      name: String(payload.name || '').trim(),
      treatment: String(payload.treatment || ''),
      notes: String(payload.notes || ''),
      suggestions: String(payload.suggestions || ''),
      prescriptions: String(payload.prescriptions || ''),
    },
  });
};

export const updateTherapistCareTeamMember = async (userId: string, id: string, payload: any) => {
  await assertTherapist(userId);

  const existing = await db.therapistCareTeamMember.findFirst({ where: { id, therapistId: userId } });
  if (!existing) throw new AppError('Care team member not found', 404);

  return db.therapistCareTeamMember.update({
    where: { id },
    data: {
      role: payload.role !== undefined ? String(payload.role || '').trim() : undefined,
      name: payload.name !== undefined ? String(payload.name || '').trim() : undefined,
      treatment: payload.treatment !== undefined ? String(payload.treatment || '') : undefined,
      notes: payload.notes !== undefined ? String(payload.notes || '') : undefined,
      suggestions: payload.suggestions !== undefined ? String(payload.suggestions || '') : undefined,
      prescriptions: payload.prescriptions !== undefined ? String(payload.prescriptions || '') : undefined,
      patientId: payload.patientId !== undefined ? (payload.patientId ? String(payload.patientId) : null) : undefined,
    },
  });
};

export const deleteTherapistCareTeamMember = async (userId: string, id: string) => {
  await assertTherapist(userId);

  const existing = await db.therapistCareTeamMember.findFirst({ where: { id, therapistId: userId } });
  if (!existing) throw new AppError('Care team member not found', 404);

  await db.therapistCareTeamMember.delete({ where: { id } });
  return { id };
};
