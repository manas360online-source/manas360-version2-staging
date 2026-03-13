import { prisma } from '../config/db';
import { AppError } from '../middleware/error.middleware';

// Re-export specific enums for easy use in this file, or we can just use the Prisma ones.
import { PlanActivityFrequency, PlanActivityType } from '@prisma/client';

const getPatientProfile = async (userId: string) => {
  const patient = await prisma.patientProfile.findUnique({
    where: { userId },
    select: { id: true, userId: true },
  });
  if (patient) return patient;

  const created = await prisma.patientProfile.create({
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

const getConnectedProvider = async (userId: string) => {
  const assignment = await prisma.careTeamAssignment.findFirst({
    where: {
      patientId: userId,
      status: 'ACTIVE',
      revokedAt: null,
      provider: {
        isDeleted: false,
        status: 'ACTIVE',
      },
    },
    orderBy: { assignedAt: 'desc' },
    select: {
      providerId: true,
    },
  });

  return assignment?.providerId || null;
};

const createDefaultPlan = async (patientProfileId: string, therapistId?: string) => {
  const now = new Date();
  const endDate = new Date();
  endDate.setDate(endDate.getDate() + 7); // 1 week

  const plan = await prisma.therapyPlan.create({
    data: {
      patientId: patientProfileId,
      therapistId,
      title: 'Week 1: Foundations',
      startDate: now,
      endDate: endDate,
      status: 'ACTIVE',
      activities: {
        create: [
          {
            title: 'Daily check-in',
            frequency: PlanActivityFrequency.DAILY_RITUAL,
            activityType: PlanActivityType.MOOD_CHECKIN,
            estimatedMinutes: 2,
            orderIndex: 0,
          },
          {
            title: 'Breathing Focus Audio (5 min)',
            frequency: PlanActivityFrequency.DAILY_RITUAL,
            activityType: PlanActivityType.AUDIO_THERAPY,
            estimatedMinutes: 5,
            orderIndex: 1,
          },
          {
            title: 'Reframing Assessment',
            frequency: PlanActivityFrequency.WEEKLY_MILESTONE,
            activityType: PlanActivityType.CLINICAL_ASSESSMENT,
            estimatedMinutes: 10,
            orderIndex: 0,
          },
          {
            title: 'Session Review Notes',
            frequency: PlanActivityFrequency.WEEKLY_MILESTONE,
            activityType: PlanActivityType.EXERCISE,
            estimatedMinutes: 15,
            orderIndex: 1,
          },
        ],
      },
    },
    include: {
      activities: {
        orderBy: { orderIndex: 'asc' },
      },
    },
  });

  return plan;
};

const getOrCreateActivePlan = async (patientProfileId: string, providerId: string) => {
  let plan = await prisma.therapyPlan.findFirst({
    where: {
      patientId: patientProfileId,
      status: 'ACTIVE',
    },
    include: {
      activities: {
        orderBy: { orderIndex: 'asc' },
      },
    },
    orderBy: { updatedAt: 'desc' },
  });

  if (!plan) {
    plan = await createDefaultPlan(patientProfileId, providerId);
  } else if (!plan.therapistId) {
    plan = await prisma.therapyPlan.update({
      where: { id: plan.id },
      data: { therapistId: providerId },
      include: {
        activities: {
          orderBy: { orderIndex: 'asc' },
        },
      },
    });
  }

  return plan;
};

export const syncTreatmentPlanFromAssessment = async (
  userId: string,
  input: { assessmentType: string; score: number; severity: string },
) => {
  const connectedProviderId = await getConnectedProvider(userId);
  if (!connectedProviderId) {
    return {
      assessmentType: input.assessmentType,
      score: input.score,
      severity: input.severity,
      synced: false,
      reason: 'NO_CONNECTED_PROVIDER',
    };
  }

  const patientProfile = await getPatientProfile(userId);
  const plan = await getOrCreateActivePlan(patientProfile.id, connectedProviderId);

  // In the real system, you might generate an activity or note here based on severity.
  // For now, we simulate syncing by logging the intent, since there is no `recommendation_snapshot` anymore.
  // We can leave a contextual provider note if severe.
  const level = String(input.severity || '').toLowerCase();
  if (level.includes('severe')) {
    await prisma.therapyPlan.update({
      where: { id: plan.id },
      data: {
        providerNote: `Heads up - recent ${input.assessmentType} indicates severe context. Please schedule a check-in.`,
      },
    });
  }

  return {
    assessmentType: input.assessmentType,
    score: input.score,
    severity: input.severity,
    synced: true,
  };
};

export const getMyTreatmentPlan = async (userId: string) => {
  const connectedProviderId = await getConnectedProvider(userId);
  if (!connectedProviderId) {
    throw new AppError('Therapy plan will be available once you are connected with a provider.', 404);
  }

  const patientProfile = await getPatientProfile(userId);
  const plan = await getOrCreateActivePlan(patientProfile.id, connectedProviderId);

  const completed = plan.activities.filter(a => a.status === 'COMPLETED').length;
  const adherencePercent = plan.activities.length ? Number(((completed / plan.activities.length) * 100).toFixed(1)) : 0;

  // We map cleanly to the format the frontend expects, which has the new properties.
  return {
    plan: {
      id: plan.id,
      title: plan.title,
      status: plan.status,
      providerNote: plan.providerNote,
      startDate: plan.startDate,
      endDate: plan.endDate,
      weekNumber: 1, // Optional: Calculate dynamically 
      totalWeeks: 8,
      adherencePercent,
      updatedAt: plan.updatedAt,
    },
    activities: plan.activities.map((item) => ({
      id: item.id,
      title: item.title,
      frequency: item.frequency,
      activityType: item.activityType,
      status: item.status,
      completedAt: item.completedAt,
      estimatedMinutes: item.estimatedMinutes,
      orderIndex: item.orderIndex,
    })),
  };
};

export const completeTreatmentPlanTask = async (userId: string, taskId: string) => {
  const patientProfile = await getPatientProfile(userId);

  // Ensure this task belongs to the user
  const task = await prisma.therapyPlanActivity.findUnique({
    where: { id: taskId },
    include: { plan: true },
  });

  if (!task || task.plan.patientId !== patientProfile.id) {
    throw new AppError('Activity not found or unauthorized', 404);
  }

  const updated = await prisma.therapyPlanActivity.update({
    where: { id: taskId },
    data: {
      status: 'COMPLETED',
      completedAt: new Date(),
    },
  });

  return { id: taskId, status: 'COMPLETED' };
};
