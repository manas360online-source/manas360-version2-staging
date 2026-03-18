import type { Request, Response } from 'express';
import { createReadStream } from 'fs';
import { AppError } from '../middleware/error.middleware';
import { adminAnalyticsService } from '../services/admin-analytics.service';
import { adminAnalyticsExportService } from '../services/admin-analytics-export.service';
import { adminAnalyticsExportQueue } from '../jobs/admin-analytics-export.worker';
import { prisma } from '../config/db';
import { sendSuccess } from '../utils/response';

function parseRequiredString(value: unknown, field: string): string {
	if (typeof value !== 'string' || !value.trim()) {
		throw new AppError(`${field} is required`, 400);
	}
	return value.trim();
}

function parseRequiredNumber(value: unknown, field: string): number {
	if (typeof value !== 'string' && typeof value !== 'number') {
		throw new AppError(`${field} is required`, 400);
	}
	const parsed = Number(value);
	if (Number.isNaN(parsed)) {
		throw new AppError(`${field} must be a number`, 400);
	}
	return parsed;
}

function parseOptionalNumber(value: unknown): number | undefined {
	if (value === undefined || value === null || value === '') return undefined;
	const parsed = Number(value);
	if (Number.isNaN(parsed)) {
		throw new AppError('Invalid numeric query parameter', 400);
	}
	return parsed;
}

export const getAdminAnalyticsSummaryController = async (req: Request, res: Response): Promise<void> => {
	const from = parseRequiredString(req.query.from, 'from');
	const to = parseRequiredString(req.query.to, 'to');
	const organizationKey = parseRequiredNumber(req.query.organizationKey, 'organizationKey');
	const therapistId = typeof req.query.therapistId === 'string' && req.query.therapistId.trim() ? req.query.therapistId.trim() : undefined;

	const result = await adminAnalyticsService.getSummary({
		from,
		to,
		organizationKey,
	}, therapistId);

	sendSuccess(res, result, 'Admin analytics summary fetched successfully');
};

export const getAdminMostUsedTemplatesController = async (req: Request, res: Response): Promise<void> => {
	const from = parseRequiredString(req.query.from, 'from');
	const to = parseRequiredString(req.query.to, 'to');
	const organizationKey = parseRequiredNumber(req.query.organizationKey, 'organizationKey');
	const limit = parseOptionalNumber(req.query.limit);
	const lastSessionsCount = parseOptionalNumber(req.query.lastSessionsCount);
	const lastTemplateKey = parseOptionalNumber(req.query.lastTemplateKey);

	const result = await adminAnalyticsService.getMostUsedTemplates(
		{
			from,
			to,
			organizationKey,
		},
		limit,
		{
			lastSessionsCount,
			lastTemplateKey,
		},
	);

	sendSuccess(res, result, 'Admin template usage fetched successfully');
};

export const getAdminTherapistUtilizationController = async (req: Request, res: Response): Promise<void> => {
	const from = parseRequiredString(req.query.from, 'from');
	const to = parseRequiredString(req.query.to, 'to');
	const organizationKey = parseRequiredNumber(req.query.organizationKey, 'organizationKey');
	const limit = parseOptionalNumber(req.query.limit);
	const lastWeekStartDate = typeof req.query.lastWeekStartDate === 'string' ? req.query.lastWeekStartDate : undefined;
	const lastTherapistKey = parseOptionalNumber(req.query.lastTherapistKey);

	const result = await adminAnalyticsService.getTherapistUtilization(
		{
			from,
			to,
			organizationKey,
		},
		limit,
		{
			lastWeekStartDate,
			lastTherapistKey,
		},
	);

	sendSuccess(res, result, 'Admin therapist utilization fetched successfully');
};

export const exportAdminAnalyticsReportController = async (req: Request, res: Response): Promise<void> => {
	const formatRaw = typeof req.body?.format === 'string' ? req.body.format.toLowerCase() : 'csv';
	if (formatRaw !== 'csv' && formatRaw !== 'pdf') {
		throw new AppError('format must be csv or pdf', 400);
	}

	const from = parseRequiredString(req.body?.from, 'from');
	const to = parseRequiredString(req.body?.to, 'to');
	const organizationKey = parseRequiredNumber(req.body?.organizationKey, 'organizationKey');
	const includeChartsSnapshot = Boolean(req.body?.includeChartsSnapshot);
	const chartSnapshots = Array.isArray(req.body?.chartSnapshots)
		? req.body.chartSnapshots.filter((value: unknown) => typeof value === 'string')
		: undefined;
	const userId = req.auth?.userId;

	if (!userId) {
		throw new AppError('Authentication required', 401);
	}

	const result = await adminAnalyticsExportService.exportReport(
		{
			format: formatRaw,
			from,
			to,
			organizationKey,
			includeChartsSnapshot,
			chartSnapshots,
		},
		userId,
		{
			ip: req.ip,
			userAgent: req.headers['user-agent'] as string | undefined,
		},
	);

	res.setHeader('Content-Type', result.contentType);
	res.setHeader('Content-Disposition', `attachment; filename="${result.fileName}"`);
	res.status(200).send(result.buffer);
};

export const enqueueAdminAnalyticsExportController = async (req: Request, res: Response): Promise<void> => {
	const formatRaw = typeof req.body?.format === 'string' ? req.body.format.toLowerCase() : 'csv';
	if (formatRaw !== 'csv' && formatRaw !== 'pdf') {
		throw new AppError('format must be csv or pdf', 400);
	}

	const from = parseRequiredString(req.body?.from, 'from');
	const to = parseRequiredString(req.body?.to, 'to');
	const organizationKey = parseRequiredNumber(req.body?.organizationKey, 'organizationKey');
	const includeChartsSnapshot = Boolean(req.body?.includeChartsSnapshot);
	const chartSnapshots = Array.isArray(req.body?.chartSnapshots)
		? req.body.chartSnapshots.filter((value: unknown) => typeof value === 'string')
		: undefined;
	const userId = req.auth?.userId;

	if (!userId) {
		throw new AppError('Authentication required', 401);
	}

	const rows = (await prisma.$queryRawUnsafe(
		`INSERT INTO analytics.report_export_job
		 (requested_by_admin_id, report_type, format, range_start, range_end, filter_payload, status)
		 VALUES ($1, $2, $3, $4::timestamptz, $5::timestamptz, $6::jsonb, 'queued')
		 RETURNING export_job_key`,
		userId,
		'admin_analytics',
		formatRaw,
		from,
		to,
		JSON.stringify({ organizationKey, includeChartsSnapshot }),
	)) as Array<{ export_job_key: bigint | number }>;

	const exportJobKey = Number(rows[0]?.export_job_key);
	if (!exportJobKey) {
		throw new AppError('Failed to create export job', 500);
	}

	const queueJob = await adminAnalyticsExportQueue.add(
		'admin-analytics-export',
		{
			exportJobKey,
			payload: {
				format: formatRaw,
				from,
				to,
				organizationKey,
				includeChartsSnapshot,
				chartSnapshots,
			},
			adminUserId: userId,
		},
		{
			jobId: `admin-analytics-export-${exportJobKey}`,
			removeOnComplete: { age: 3600 },
			removeOnFail: { age: 86400 },
		},
	);

	res.status(202).json({
		success: true,
		message: 'Analytics export queued',
		data: {
			exportJobKey,
			queueJobId: queueJob.id,
			status: 'queued',
		},
	});
};

export const getAdminAnalyticsExportStatusController = async (req: Request, res: Response): Promise<void> => {
	const userId = req.auth?.userId;
	if (!userId) {
		throw new AppError('Authentication required', 401);
	}

	const exportJobKey = Number(req.params.exportJobKey);
	if (Number.isNaN(exportJobKey)) {
		throw new AppError('Invalid exportJobKey', 400);
	}

	const rows = (await prisma.$queryRawUnsafe(
		`SELECT export_job_key, status, output_uri, error_message, created_at, started_at, finished_at
		 FROM analytics.report_export_job
		 WHERE export_job_key = $1 AND requested_by_admin_id = $2`,
		exportJobKey,
		userId,
	)) as Array<{
		export_job_key: bigint | number;
		status: string;
		output_uri: string | null;
		error_message: string | null;
		created_at: Date;
		started_at: Date | null;
		finished_at: Date | null;
	}>;

	if (!rows[0]) {
		throw new AppError('Export job not found', 404);
	}

	sendSuccess(
		res,
		{
			exportJobKey: Number(rows[0].export_job_key),
			status: rows[0].status,
			outputUri: rows[0].output_uri,
			errorMessage: rows[0].error_message,
			createdAt: rows[0].created_at,
			startedAt: rows[0].started_at,
			finishedAt: rows[0].finished_at,
		},
		'Export status fetched',
	);
};

export const downloadAdminAnalyticsExportController = async (req: Request, res: Response): Promise<void> => {
	const userId = req.auth?.userId;
	if (!userId) {
		throw new AppError('Authentication required', 401);
	}

	const exportJobKey = Number(req.params.exportJobKey);
	if (Number.isNaN(exportJobKey)) {
		throw new AppError('Invalid exportJobKey', 400);
	}

	const rows = (await prisma.$queryRawUnsafe(
		`SELECT output_uri, format, status
		 FROM analytics.report_export_job
		 WHERE export_job_key = $1 AND requested_by_admin_id = $2`,
		exportJobKey,
		userId,
	)) as Array<{ output_uri: string | null; format: string; status: string }>;

	const row = rows[0];
	if (!row) {
		throw new AppError('Export job not found', 404);
	}

	if (row.status !== 'completed' || !row.output_uri) {
		throw new AppError('Export file is not ready yet', 409);
	}

	const format = String(row.format || '').toLowerCase();
	const extension = format === 'pdf' ? 'pdf' : 'csv';
	res.setHeader('Content-Type', extension === 'pdf' ? 'application/pdf' : 'text/csv; charset=utf-8');
	res.setHeader('Content-Disposition', `attachment; filename="admin-analytics-export-${exportJobKey}.${extension}"`);

	const stream = createReadStream(row.output_uri);
	stream.on('error', () => {
		res.status(404).json({ success: false, message: 'Export file not found on server' });
	});
	stream.pipe(res);
};

export const getAdminRevenueAnalyticsController = async (req: Request, res: Response): Promise<void> => {
	const result = await adminAnalyticsService.getRevenueAnalytics();
	sendSuccess(res, result, 'Admin revenue analytics fetched successfully');
};

export const getAdminUserMetricsController = async (req: Request, res: Response): Promise<void> => {
	const result = await adminAnalyticsService.getUserMetrics();
	sendSuccess(res, result, 'Admin user metrics fetched successfully');
};

export const getAdminProviderMetricsController = async (req: Request, res: Response): Promise<void> => {
	const result = await adminAnalyticsService.getProviderMetrics();
	sendSuccess(res, result, 'Admin provider metrics fetched successfully');
};

export const getAdminMarketplaceMetricsController = async (req: Request, res: Response): Promise<void> => {
	const result = await adminAnalyticsService.getMarketplaceMetrics();
	sendSuccess(res, result, 'Admin marketplace metrics fetched successfully');
};

export const getAdminSystemHealthController = async (req: Request, res: Response): Promise<void> => {
	const result = await adminAnalyticsService.getSystemHealthMetrics();
	sendSuccess(res, result, 'Admin system health fetched successfully');
};
