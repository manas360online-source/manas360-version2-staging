import { render, screen, waitFor } from '@testing-library/react';

import { vi, describe, it, beforeEach, afterEach } from 'vitest';
import TherapyPlanPage from '../pages/patient/TherapyPlanPage';

vi.mock('../api/patient', () => ({
  patientApi: {
    getMyProfile: vi.fn(async () => ({ createdAt: new Date().toISOString() })),
    getTherapyPlan: vi.fn(async (day?: number) => {
      const dayNum = day || 1;
      // For current day (1) return one incomplete task, for day 2 return empty
      if (dayNum === 1) {
        return {
          dailyTasks: [],
          goals: [{ id: 'g1', title: 'Do breathing', category: 'Mindfulness', todayCheckInDone: false, startDate: new Date().toISOString() }],
          cbtExercises: [],
          recentFeedback: [],
          dayContext: { selectedDay: dayNum, currentDay: 1, totalDays: 3 },
        };
      }
      return {
        dailyTasks: [],
        goals: [],
        cbtExercises: [],
        recentFeedback: [],
        dayContext: { selectedDay: dayNum, currentDay: 1, totalDays: 3 },
      };
    }),
    completeTherapyPlanTask: vi.fn(async () => ({})),
    getPetState: vi.fn(async () => ({ selectedPet: 'koi', vitality: 10, unlockedItems: [], isPremium: false })),
    upsertPetState: vi.fn(async () => ({})),
  },
}));

describe('TherapyPlan locking', () => {
  beforeEach(() => {
    vi.useRealTimers();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  it('locks day 2 when current day not 100% complete', async () => {
    render(<TherapyPlanPage />);

    await waitFor(() => screen.getByText(/You are in Day/));

    // Day 2 button should be present but disabled (locked)
    const day2 = screen.getByRole('button', { name: /Day 2/ });
    expect(day2).toBeDisabled();
  });
});
