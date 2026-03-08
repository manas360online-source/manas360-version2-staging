import { useEffect, useState } from 'react';
import { corporateApi } from '../../api/corporate.api';

export type CorporateDashboardPayload = {
  company: {
    id: string;
    companyKey: string;
    name: string;
    employeeLimit: number;
  };
  summary: {
    enrolledEmployees: number;
    sessionsAllocated: number;
    sessionsUsed: number;
    utilizationRate: number;
    absenteeismReductionPct: number;
    wellbeingScore: number;
    averageSessionRating: number;
    recommendationRatePct: number;
    activeUsers: number;
    costPerSession: number;
    enrollmentRate: number;
  };
  utilizationTrend: Array<{ month: string; sessionsUsed: number; sessionsAllocated: number; activeUsers: number }>;
  departmentBreakdown: Array<{ department: string; enrolled: number; active: number; utilizationPct: number; sessionsUsed: number }>;
  reports: Array<{ id: string; type: string; quarter: string; format: string; downloadUrl: string }>;
  privacy: { note: string };
};

export const useCorporateDashboardData = (companyKey = 'techcorp-india') => {
  const [dashboard, setDashboard] = useState<CorporateDashboardPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = (await corporateApi.getDashboard(companyKey)) as CorporateDashboardPayload;
      setDashboard(data);
    } catch (fetchError: any) {
      setError(fetchError?.response?.data?.message || 'Unable to load corporate data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, [companyKey]);

  return { dashboard, loading, error, refresh: load };
};
