import { Queue, Worker } from 'bullmq';
import { promises as fs } from 'fs';
import { join } from 'path';
import { env } from '../config/env';
import { adminAnalyticsExportService, type AdminAnalyticsExportPayload } from '../services/admin-analytics-export.service';
import { prisma } from '../config/db';

const REDIS_URL = process.env.REDIS_URL || env.redisUrl || 'redis://127.0.0.1:6379';
const isTestEnv = process.env.NODE_ENV === 'test';

export const adminAnalyticsExportQueue = isTestEnv
	? ({
			add: async (_name: string, data: any) => ({ id: `test-admin-export-${Date.now()}`, data }),
	  } as any)
	: new Queue('admin-analytics-exports', {
			connection: { url: REDIS_URL },
	  });

type AdminAnalyticsExportJobData = {
	exportJobKey: number;
	payload: AdminAnalyticsExportPayload;
	adminUserId: string;
};

const updateStatus = async (exportJobKey: number, status: 'running' | 'completed' | 'failed', patch?: { outputUri?: string; error?: string; rowCount?: number }) => {
	if (status === 'running') {
		await prisma.$executeRawUnsafe(
			`UPDATE analytics.report_export_job
			 SET status = 'running', started_at = now(), updated_at = now()
			 WHERE export_job_key = $1`,
			exportJobKey,
		);
		return;
	}

	if (status === 'completed') {
		await prisma.$executeRawUnsafe(
			`UPDATE analytics.report_export_job
			 SET status = 'completed', output_uri = $2, row_count = $3, finished_at = now(), updated_at = now()
			 WHERE export_job_key = $1`,
			exportJobKey,
			patch?.outputUri ?? null,
			patch?.rowCount ?? null,
		);
		return;
	}

	await prisma.$executeRawUnsafe(
		`UPDATE analytics.report_export_job
		 SET status = 'failed', error_message = $2, finished_at = now(), updated_at = now()
		 WHERE export_job_key = $1`,
		exportJobKey,
		patch?.error ?? 'Unknown export error',
	);
};

export const adminAnalyticsExportWorker = isTestEnv
	? null
	: new Worker(
	'admin-analytics-exports',
	async (job: any) => {
		const data = job.data as AdminAnalyticsExportJobData;
		await updateStatus(data.exportJobKey, 'running');

		try {
			const result = await adminAnalyticsExportService.exportReport(data.payload, data.adminUserId);
			const outputDir = join(process.cwd(), 'exports', 'admin-analytics');
			await fs.mkdir(outputDir, { recursive: true });
			const outputFilePath = join(outputDir, result.fileName);
			await fs.writeFile(outputFilePath, result.buffer);

			await updateStatus(data.exportJobKey, 'completed', {
				outputUri: outputFilePath,
				rowCount: 0,
			});

			return { outputFilePath, fileName: result.fileName };
		} catch (error) {
			await updateStatus(data.exportJobKey, 'failed', {
				error: (error as Error).message,
			});
			throw error;
		}
	},
	{ connection: { url: REDIS_URL }, concurrency: 2 },
);

if (adminAnalyticsExportWorker) {
	adminAnalyticsExportWorker.on('failed', (job: any, error: any) => {
		console.error('[adminAnalyticsExportWorker] job failed', job?.id, error);
	});
}
