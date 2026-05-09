import PDFDocument from 'pdfkit';
import { prisma } from '../config/db';
import { AppError } from '../middleware/error.middleware';
import { adminAnalyticsService } from './admin-analytics.service';

export type AdminAnalyticsExportFormat = 'csv' | 'pdf';

export type AdminAnalyticsExportPayload = {
	format: AdminAnalyticsExportFormat;
	from: string;
	to: string;
	organizationKey: number;
	includeChartsSnapshot?: boolean;
	chartSnapshots?: string[];
};

const MAX_CHART_SNAPSHOTS = 3;

function sanitizeForCsv(value: unknown): string {
	return String(value ?? '').replace(/\r?\n/g, ' ').trim();
}

function toIsoNow() {
	return new Date().toISOString();
}

function normalizeDate(dateInput: string, fieldName: string): string {
	const value = new Date(dateInput);
	if (Number.isNaN(value.getTime())) {
		throw new AppError(`Invalid ${fieldName}`, 400);
	}
	return value.toISOString();
}

async function createPdfBuffer(write: (doc: any) => Promise<void> | void): Promise<Buffer> {
	return await new Promise((resolve, reject) => {
		const doc = new PDFDocument({ margin: 40 });
		const chunks: Buffer[] = [];

		doc.on('data', (chunk: Buffer) => chunks.push(chunk));
		doc.on('end', () => resolve(Buffer.concat(chunks)));
		doc.on('error', reject);

		Promise.resolve(write(doc))
			.then(() => doc.end())
			.catch(reject);
	});
}

function parseDataUrl(dataUrl: string): Buffer | null {
	const match = dataUrl.match(/^data:image\/(png|jpeg|jpg);base64,(.+)$/i);
	if (!match) return null;
	try {
		return Buffer.from(match[2], 'base64');
	} catch {
		return null;
	}
}

export class AdminAnalyticsExportService {
	async exportReport(payload: AdminAnalyticsExportPayload, adminUserId: string, reqMeta?: { ip?: string; userAgent?: string }) {
		const from = normalizeDate(payload.from, 'from');
		const to = normalizeDate(payload.to, 'to');

		if (!Number.isFinite(payload.organizationKey) || payload.organizationKey <= 0) {
			throw new AppError('organizationKey must be a positive number', 400);
		}

		const [summary, templates, utilization] = await Promise.all([
			adminAnalyticsService.getSummary({ from, to, organizationKey: payload.organizationKey }),
			adminAnalyticsService.getMostUsedTemplates({ from, to, organizationKey: payload.organizationKey }, 50),
			adminAnalyticsService.getTherapistUtilization({ from, to, organizationKey: payload.organizationKey }, 250),
		]);

		const sessionsOverTimeMap = new Map<string, number>();
		for (const row of utilization.items) {
			sessionsOverTimeMap.set(row.weekStartDate, (sessionsOverTimeMap.get(row.weekStartDate) ?? 0) + row.sessionsPerWeek);
		}
		const sessionsOverTime = Array.from(sessionsOverTimeMap.entries())
			.sort(([a], [b]) => (a < b ? -1 : 1))
			.map(([weekStartDate, sessions]) => ({ weekStartDate, sessions }));

		const exportTimestamp = toIsoNow();
		const suffix = exportTimestamp.replace(/[:.]/g, '-');
		const fileName = `admin-analytics-${payload.organizationKey}-${suffix}.${payload.format}`;

		let buffer: Buffer;
		let contentType: string;

		if (payload.format === 'csv') {
			const lines: string[] = [];
			const addRow = (...cells: unknown[]) => {
				lines.push(cells.map((cell) => `"${sanitizeForCsv(cell).split('"').join('""')}"`).join(','));
			};

			addRow('report', 'admin_analytics_export');
			addRow('generated_at', exportTimestamp);
			addRow('organization_key', payload.organizationKey);
			addRow('date_range_from', from);
			addRow('date_range_to', to);
			addRow('');
			addRow('section', 'metric', 'value');
			addRow('summary', 'total_sessions_conducted', summary.totalSessionsConducted);
			addRow('summary', 'completion_rate', summary.completionRate);
			addRow('summary', 'avg_completion_seconds', summary.averageCompletionSeconds);
			addRow('summary', 'engagement_score', summary.patientEngagementScore);
			addRow('');
			addRow('section', 'template', 'sessions_count');
			for (const item of templates.items) {
				addRow('template_usage', item.templateName, item.sessionsCount);
			}
			addRow('');
			addRow('section', 'week_start_date', 'sessions');
			for (const row of sessionsOverTime) {
				addRow('sessions_over_time', row.weekStartDate, row.sessions);
			}

			buffer = Buffer.from(lines.join('\n'), 'utf-8');
			contentType = 'text/csv; charset=utf-8';
		} else {
			const snapshots = (payload.includeChartsSnapshot ? payload.chartSnapshots ?? [] : [])
				.slice(0, MAX_CHART_SNAPSHOTS)
				.map(parseDataUrl)
				.filter((value): value is Buffer => Boolean(value));

			buffer = await createPdfBuffer(async (doc) => {
				doc.fontSize(20).font('Helvetica-Bold').text('Admin Analytics Report', { align: 'left' });
				doc.moveDown(0.4);
				doc.fontSize(10).font('Helvetica');
				doc.text(`Generated at: ${exportTimestamp}`);
				doc.text(`Organization Key: ${payload.organizationKey}`);
				doc.text(`Date Range: ${from} to ${to}`);
				doc.moveDown();

				doc.fontSize(13).font('Helvetica-Bold').text('Metrics Summary');
				doc.moveDown(0.3);
				doc.fontSize(10).font('Helvetica');
				doc.text(`Total Sessions: ${summary.totalSessionsConducted}`);
				doc.text(`Completion Rate: ${summary.completionRate}%`);
				doc.text(`Average Completion Time: ${summary.averageCompletionSeconds} seconds`);
				doc.text(`Patient Engagement Score: ${summary.patientEngagementScore}`);
				doc.moveDown();

				doc.fontSize(13).font('Helvetica-Bold').text('Top Templates');
				doc.moveDown(0.3);
				doc.fontSize(10).font('Helvetica');
				for (const item of templates.items.slice(0, 10)) {
					doc.text(`• ${item.templateName} (v${item.templateVersion}) — ${item.sessionsCount} sessions`);
				}
				doc.moveDown();

				doc.fontSize(13).font('Helvetica-Bold').text('Sessions Over Time (Weekly)');
				doc.moveDown(0.3);
				doc.fontSize(10).font('Helvetica');
				for (const row of sessionsOverTime.slice(-12)) {
					doc.text(`• ${row.weekStartDate}: ${row.sessions}`);
				}

				if (snapshots.length > 0) {
					doc.addPage();
					doc.fontSize(13).font('Helvetica-Bold').text('Chart Snapshots');
					doc.moveDown();
					for (const image of snapshots) {
						const imageWidth = 500;
						const imageHeight = 220;
						const remaining = doc.page.height - doc.y - 50;
						if (remaining < imageHeight) {
							doc.addPage();
						}
						try {
							doc.image(image, { fit: [imageWidth, imageHeight], align: 'center' });
							doc.moveDown();
						} catch {
							// ignore invalid image payloads
						}
					}
				}
			});

			contentType = 'application/pdf';
		}

		await prisma.sessionAuditLog.create({
			data: {
				userId: adminUserId,
				action: 'EXPORTED',
				entityType: 'ANALYTICS_REPORT',
				entityId: `admin-analytics:${payload.organizationKey}`,
				changes: {
					reportType: 'admin_analytics',
					format: payload.format,
					dateRange: { from, to },
					organizationKey: payload.organizationKey,
					rowCount: {
						templates: templates.items.length,
						utilization: utilization.items.length,
						sessionsOverTime: sessionsOverTime.length,
					},
				},
				ipAddress: reqMeta?.ip,
			},
		});

		return { fileName, buffer, contentType };
	}
}

export const adminAnalyticsExportService = new AdminAnalyticsExportService();
