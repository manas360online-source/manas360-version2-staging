import { prisma } from '../config/db';
import { AppError } from '../middleware/error.middleware';

const db = prisma as any;

const MAX_PAGE_SIZE = 100;

export interface AdminAnalyticsRange {
	from: string;
	to: string;
	organizationKey: number;
}

export interface TemplateCursor {
	lastSessionsCount?: number;
	lastTemplateKey?: number;
}

export interface UtilizationCursor {
	lastWeekStartDate?: string;
	lastTherapistKey?: number;
}

function toDateKey(dateValue: string): number {
	const date = new Date(dateValue);
	if (Number.isNaN(date.getTime())) {
		throw new AppError(`Invalid date: ${dateValue}`, 400);
	}
	const yyyy = date.getUTCFullYear();
	const mm = String(date.getUTCMonth() + 1).padStart(2, '0');
	const dd = String(date.getUTCDate()).padStart(2, '0');
	return Number(`${yyyy}${mm}${dd}`);
}

function normalizeLimit(limit?: number): number {
	if (!limit || Number.isNaN(limit)) return 25;
	if (limit < 1) return 1;
	return Math.min(limit, MAX_PAGE_SIZE);
}

export class AdminAnalyticsService {
	async getSummary(range: AdminAnalyticsRange, therapistId?: string) {
		const startKey = toDateKey(range.from);
		const endKey = toDateKey(range.to);

		const [totalsRows, completionRows] = await Promise.all([
			prisma.$queryRawUnsafe(
				`SELECT COUNT(*)::bigint AS total_sessions
				 FROM analytics.fact_session fs
				 WHERE fs.organization_key = $3
				   AND fs.date_key BETWEEN $1 AND $2`,
				startKey,
				endKey,
				range.organizationKey,
			) as Promise<Array<{ total_sessions: bigint | number }>>,
			prisma.$queryRawUnsafe(
				`SELECT
					COUNT(*)::bigint AS started_sessions,
					COUNT(*) FILTER (WHERE fs.is_completed)::bigint AS completed_sessions,
					(COUNT(*) FILTER (WHERE fs.is_completed)::numeric / NULLIF(COUNT(*), 0))::numeric(8,4) AS completion_rate,
					AVG(CASE WHEN fs.is_completed AND fs.duration_seconds IS NOT NULL THEN fs.duration_seconds END)::numeric(12,2) AS avg_completion_seconds
				 FROM analytics.fact_session fs
				 WHERE fs.organization_key = $3
				   AND fs.date_key BETWEEN $1 AND $2`,
				startKey,
				endKey,
				range.organizationKey,
			) as Promise<Array<{ started_sessions: bigint | number; completed_sessions: bigint | number; completion_rate: string | number | null; avg_completion_seconds: string | number | null }>>,
		]);

		let engagementRows: Array<{ engagement_score: string | number | null }> = [];
		try {
			engagementRows = (await prisma.$queryRawUnsafe(
				`SELECT AVG(m.answered_count)::numeric(10,2) AS engagement_score
				 FROM analytics_session_metrics m
				 WHERE m.completed_at >= $1::timestamptz
				   AND m.completed_at <  $2::timestamptz
				   AND ($3::text IS NULL OR m.therapist_id = $3::text)`,
				range.from,
				range.to,
				therapistId ?? null,
			)) as Array<{ engagement_score: string | number | null }>;
		} catch {
			engagementRows = [{ engagement_score: 0 }];
		}

		const totals = totalsRows[0];
		const completion = completionRows[0];
		const engagement = engagementRows[0];

		return {
			totalSessionsConducted: Number(totals?.total_sessions ?? 0),
			startedSessions: Number(completion?.started_sessions ?? 0),
			completedSessions: Number(completion?.completed_sessions ?? 0),
			completionRate: Number(completion?.completion_rate ?? 0),
			averageCompletionSeconds: Number(completion?.avg_completion_seconds ?? 0),
			patientEngagementScore: Number(engagement?.engagement_score ?? 0),
		};
	}

	async getMostUsedTemplates(
		range: AdminAnalyticsRange,
		limit?: number,
		cursor?: TemplateCursor,
	) {
		const pageSize = normalizeLimit(limit);
		const hasCursor = typeof cursor?.lastSessionsCount === 'number' && typeof cursor?.lastTemplateKey === 'number';

		const rows = hasCursor
			? (await prisma.$queryRawUnsafe(
				`WITH agg AS (
					SELECT
						w.template_key,
						SUM(w.total_sessions_conducted)::bigint AS sessions_count
					FROM analytics.mv_admin_weekly_kpi w
					WHERE w.organization_key = $3
					  AND w.week_start_date >= $1::date
					  AND w.week_start_date <  $2::date
					GROUP BY w.template_key
				)
				SELECT
					a.template_key,
					t.template_id,
					t.template_version,
					t.template_name,
					a.sessions_count
				FROM agg a
				JOIN analytics.dim_template t ON t.template_key = a.template_key
				WHERE (a.sessions_count < $4)
				   OR (a.sessions_count = $4 AND a.template_key > $5)
				ORDER BY a.sessions_count DESC, a.template_key ASC
				LIMIT $6`,
				range.from,
				range.to,
				range.organizationKey,
				cursor?.lastSessionsCount,
				cursor?.lastTemplateKey,
				pageSize,
			)) as Array<{ template_key: bigint | number; template_id: string; template_version: number; template_name: string; sessions_count: bigint | number }>
			: (await prisma.$queryRawUnsafe(
				`WITH agg AS (
					SELECT
						w.template_key,
						SUM(w.total_sessions_conducted)::bigint AS sessions_count
					FROM analytics.mv_admin_weekly_kpi w
					WHERE w.organization_key = $3
					  AND w.week_start_date >= $1::date
					  AND w.week_start_date <  $2::date
					GROUP BY w.template_key
				)
				SELECT
					a.template_key,
					t.template_id,
					t.template_version,
					t.template_name,
					a.sessions_count
				FROM agg a
				JOIN analytics.dim_template t ON t.template_key = a.template_key
				ORDER BY a.sessions_count DESC, a.template_key ASC
				LIMIT $4`,
				range.from,
				range.to,
				range.organizationKey,
				pageSize,
			)) as Array<{ template_key: bigint | number; template_id: string; template_version: number; template_name: string; sessions_count: bigint | number }>;

		const next = rows.length
			? {
				lastSessionsCount: Number(rows[rows.length - 1].sessions_count),
				lastTemplateKey: Number(rows[rows.length - 1].template_key),
			}
			: null;

		return {
			items: rows.map((row) => ({
				templateKey: Number(row.template_key),
				templateId: row.template_id,
				templateVersion: row.template_version,
				templateName: row.template_name,
				sessionsCount: Number(row.sessions_count),
			})),
			nextCursor: next,
		};
	}

	async getTherapistUtilization(
		range: AdminAnalyticsRange,
		limit?: number,
		cursor?: UtilizationCursor,
	) {
		const pageSize = normalizeLimit(limit);
		const hasCursor = Boolean(cursor?.lastWeekStartDate) && typeof cursor?.lastTherapistKey === 'number';

		const rows = hasCursor
			? (await prisma.$queryRawUnsafe(
				`WITH weekly AS (
					SELECT
						w.week_start_date,
						w.therapist_key,
						SUM(w.total_sessions_conducted)::bigint AS sessions_per_week
					FROM analytics.mv_admin_weekly_kpi w
					WHERE w.organization_key = $3
					  AND w.week_start_date >= $1::date
					  AND w.week_start_date <  $2::date
					GROUP BY w.week_start_date, w.therapist_key
				)
				SELECT week_start_date, therapist_key, sessions_per_week
				FROM weekly
				WHERE (week_start_date < $4::date)
				   OR (week_start_date = $4::date AND therapist_key > $5)
				ORDER BY week_start_date DESC, therapist_key ASC
				LIMIT $6`,
				range.from,
				range.to,
				range.organizationKey,
				cursor?.lastWeekStartDate,
				cursor?.lastTherapistKey,
				pageSize,
			)) as Array<{ week_start_date: Date; therapist_key: bigint | number; sessions_per_week: bigint | number }>
			: (await prisma.$queryRawUnsafe(
				`WITH weekly AS (
					SELECT
						w.week_start_date,
						w.therapist_key,
						SUM(w.total_sessions_conducted)::bigint AS sessions_per_week
					FROM analytics.mv_admin_weekly_kpi w
					WHERE w.organization_key = $3
					  AND w.week_start_date >= $1::date
					  AND w.week_start_date <  $2::date
					GROUP BY w.week_start_date, w.therapist_key
				)
				SELECT week_start_date, therapist_key, sessions_per_week
				FROM weekly
				ORDER BY week_start_date DESC, therapist_key ASC
				LIMIT $4`,
				range.from,
				range.to,
				range.organizationKey,
				pageSize,
			)) as Array<{ week_start_date: Date; therapist_key: bigint | number; sessions_per_week: bigint | number }>;

		const next = rows.length
			? {
				lastWeekStartDate: rows[rows.length - 1].week_start_date.toISOString().slice(0, 10),
				lastTherapistKey: Number(rows[rows.length - 1].therapist_key),
			}
			: null;

		return {
			items: rows.map((row) => ({
				weekStartDate: row.week_start_date.toISOString().slice(0, 10),
				therapistKey: Number(row.therapist_key),
				sessionsPerWeek: Number(row.sessions_per_week),
			})),
			nextCursor: next,
		};
	}
	async getRevenueAnalytics() {
		// Active Patient Subscriptions MRR
		const patientSubs = await prisma.patientSubscription.findMany({
			where: { status: 'active' },
			select: { plan: true, price: true },
		});
		let patientMrr = 0;
		patientSubs.forEach((sub) => {
			if (sub.plan.includes('quarterly')) patientMrr += sub.price / 3;
			else if (sub.plan.includes('annual')) patientMrr += sub.price / 12;
			else patientMrr += sub.price;
		});

		// Active Provider Subscriptions MRR
		const providerSubs = await prisma.providerSubscription.findMany({
			where: { status: 'active' },
			select: { plan: true, price: true },
		});
		let providerMrr = 0;
		providerSubs.forEach((sub) => {
			if (sub.plan.includes('quarterly')) providerMrr += sub.price / 3;
			else if (sub.plan.includes('annual')) providerMrr += sub.price / 12;
			else providerMrr += sub.price;
		});

		// Marketplace Sales
		const marketplaceAgg = await prisma.leadPurchase.aggregate({
			_sum: { finalPrice: true },
			where: { status: 'success' },
		});
		const marketplaceSales = marketplaceAgg._sum.finalPrice || 0;

		// Session Commissions
		const sessionsAgg = await prisma.revenueLedger.aggregate({
			_sum: { platformCommissionMinor: true },
			where: { type: 'SESSION' },
		});
		const sessionCommissions = Number(sessionsAgg._sum.platformCommissionMinor || 0) / 100;

		const total = patientMrr + providerMrr + marketplaceSales + sessionCommissions;
		const mrr = patientMrr + providerMrr;

		return {
			patientSubscriptions: patientMrr,
			providerSubscriptions: providerMrr,
			marketplaceSales,
			sessionCommissions,
			total,
			mrr,
		};
	}

	async getUserMetrics() {
		const totalPatients = await prisma.user.count({ where: { role: 'patient' } });
		const activeSubscribers = await prisma.patientSubscription.count({ where: { status: 'active' } });

		return {
			totalPatients,
			activeSubscribers,
			freeVsPaidRatio: totalPatients > 0 ? (activeSubscribers / totalPatients) * 100 : 0,
		};
	}

	async getProviderMetrics() {
		const totalProviders = await prisma.user.count({ where: { role: 'provider' } });
		const activeSubscriptions = await prisma.providerSubscription.count({ where: { status: 'active' } });
		
		const planDistributionRaw = await prisma.providerSubscription.groupBy({
			by: ['plan'],
			_count: true,
			where: { status: 'active' }
		});

		const planDistribution = planDistributionRaw.map(p => ({
			name: p.plan,
			value: p._count
		}));

		return {
			totalProviders,
			activeSubscriptions,
			planDistribution,
		};
	}

	async getMarketplaceMetrics() {
		const totalGenerated = await prisma.lead.count();
		const totalAssigned = await prisma.lead.count({ where: { providerId: { not: null } } });
		const purchased = await prisma.leadPurchase.count({ where: { status: 'success' } });

		return {
			generated: totalGenerated,
			assigned: totalAssigned,
			purchased,
			conversionRate: totalGenerated > 0 ? (purchased / totalGenerated) * 100 : 0,
		};
	}

	async getSystemHealthMetrics() {
		const failedLeadPayments = await prisma.leadPurchase.count({ where: { status: 'failed' } });
		const failedSessionPayments = await prisma.financialPayment.count({ where: { status: 'FAILED' } });
		const pendingPayments = await prisma.financialPayment.count({ where: { status: 'PENDING_CAPTURE' } });
		const expiredSubscriptions = await prisma.providerSubscription.count({
			where: { status: 'active', expiryDate: { lt: new Date() } }
		});

		return {
			failedPayments: failedLeadPayments + failedSessionPayments,
			pendingPayments,
			expiredSubscriptions,
		};
	}

	async getPaymentReliabilityMetrics(days = 30) {
		const safeDays = Math.min(365, Math.max(1, Number(days) || 30));
		const from = new Date(Date.now() - safeDays * 24 * 60 * 60 * 1000);

		const daily = await db.dailyPaymentMetric.findMany({
			where: { date: { gte: new Date(Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), from.getUTCDate())) } },
			orderBy: { date: 'asc' },
		});

		const totals = daily.reduce((acc: any, row: any) => {
			acc.total += Number(row.totalPayments || 0);
			acc.success += Number(row.successCount || 0);
			acc.failed += Number(row.failedCount || 0);
			acc.retryAttempts += Number(row.retryAttemptCount || 0);
			acc.retrySuccess += Number(row.retrySuccessCount || 0);
			acc.revenueMinor += Number(row.revenueMinor || 0);
			return acc;
		}, { total: 0, success: 0, failed: 0, retryAttempts: 0, retrySuccess: 0, revenueMinor: 0 });

		const failureReasonRows = await db.financialPayment.groupBy({
			by: ['failureReason'],
			where: {
				status: { in: ['FAILED', 'EXPIRED'] },
				failedAt: { gte: from },
			},
			_count: { _all: true },
			orderBy: { _count: { failureReason: 'desc' } },
			take: 10,
		});

		const capturedRows = await db.financialPayment.findMany({
			where: {
				status: 'CAPTURED',
				capturedAt: { gte: from },
			},
			select: {
				amountMinor: true,
				metadata: true,
			},
		});

		const revenueByPlan: Record<string, number> = {};
		for (const row of capturedRows as any[]) {
			const plan = String(row?.metadata?.plan || 'unmapped');
			revenueByPlan[plan] = Number(revenueByPlan[plan] || 0) + Number(row?.amountMinor || 0);
		}

		return {
			windowDays: safeDays,
			totalPayments: totals.total,
			successRate: totals.total > 0 ? Number(((totals.success / totals.total) * 100).toFixed(2)) : 0,
			retrySuccessRate: totals.retryAttempts > 0 ? Number(((totals.retrySuccess / totals.retryAttempts) * 100).toFixed(2)) : 0,
			revenueMinor: totals.revenueMinor,
			revenueInr: Number((totals.revenueMinor / 100).toFixed(2)),
			failureReasons: (failureReasonRows || []).map((row: any) => ({
				reason: String(row.failureReason || 'UNKNOWN'),
				count: Number(row._count?._all || 0),
			})),
			revenuePerPlanMinor: revenueByPlan,
			daily: (daily || []).map((row: any) => ({
				date: new Date(row.date).toISOString().slice(0, 10),
				total: Number(row.totalPayments || 0),
				success: Number(row.successCount || 0),
				failed: Number(row.failedCount || 0),
				retryAttempts: Number(row.retryAttemptCount || 0),
				retrySuccess: Number(row.retrySuccessCount || 0),
				revenueMinor: Number(row.revenueMinor || 0),
			})),
		};
	}
}

export const adminAnalyticsService = new AdminAnalyticsService();
