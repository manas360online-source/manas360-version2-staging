import { cleanupExpiredPatientSharedReports } from '../services/patient-shared-report.service';

const REPORT_CLEANUP_INTERVAL_MS = 60 * 60 * 1000;

const runCleanup = async (): Promise<void> => {
  try {
    const result = await cleanupExpiredPatientSharedReports();
    if (result.expired > 0) {
      console.info('[patient-reports] cleanup_completed', result);
    }
  } catch (error) {
    console.error('[patient-reports] cleanup_failed', {
      errorType: (error as any)?.name || 'UnknownError',
      message: (error as any)?.message || 'unknown',
    });
  }
};

export const startPatientSharedReportCleanupJob = (): void => {
  void runCleanup();
  setInterval(() => {
    void runCleanup();
  }, REPORT_CLEANUP_INTERVAL_MS);
};
