import { useState, useEffect } from 'react';
import { patientApi } from '../api/patient';

/**
 * Shared hook for therapy-related data that needs to be synchronized
 * across Dashboard and Daily Check-in pages.
 */
export function useTherapyData() {
  const [streak, setStreak] = useState(0);
  const [loading, setLoading] = useState(true);

  const refreshStreak = async () => {
    try {
      const dashboardRes = await patientApi.getDashboardV2();
      const dashboardPayload = (dashboardRes as Record<string, unknown>)?.data ?? dashboardRes;
      const updatedStreak = Number((dashboardPayload as Record<string, any>)?.streak || 0);
      setStreak(updatedStreak);
    } catch (error) {
      console.warn('Failed to refresh streak:', error);
    }
  };

  useEffect(() => {
    refreshStreak().finally(() => setLoading(false));
  }, []);

  return {
    streak,
    setStreak,
    refreshStreak,
    loading,
  };
}