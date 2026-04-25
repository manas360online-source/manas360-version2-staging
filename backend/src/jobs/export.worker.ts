import { Worker, Queue } from 'bullmq';
import { sessionExportService } from '../services/session-export.service';
import { createClient } from 'redis';
import { env } from '../config/env';

const REDIS_URL = process.env.REDIS_URL || env.redisUrl || 'redis://127.0.0.1:6379';
const isTestEnv = process.env.NODE_ENV === 'test';

export const exportQueue = isTestEnv
  ? ({
      add: async (_name: string, data: any) => ({ id: `test-job-${Date.now()}`, data }),
      getJob: async (_id: string) => null,
    } as any)
  : new Queue('session-exports', { connection: { url: REDIS_URL } });

// Worker to process export jobs
export const exportWorker = isTestEnv
  ? null
  : new Worker(
  'session-exports',
  async (job: any) => {
    const { sessionId, format, requestorId, uploadToS3 } = job.data as any;
    if (format === 'pdf') {
      return sessionExportService.exportToPDF(sessionId, { uploadToS3, requestorId });
    }

    if (format === 'csv') {
      return sessionExportService.exportToCSV(sessionId, { uploadToS3, requestorId });
    }

    if (format === 'json') {
      return sessionExportService.exportToJSON(sessionId, { uploadToS3, requestorId });
    }

    throw new Error('Unsupported format');
  },
  { connection: { url: REDIS_URL }, concurrency: 2 }
);

if (exportWorker) {
  exportWorker.on('failed', (job: any, err: any) => {
    console.error('[exportWorker] job failed', job.id, err);
  });
}
