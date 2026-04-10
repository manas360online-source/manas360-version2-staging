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
		try {
			// Active Patient Subscriptions MRR (billingCycle is the cycle field, planName is the tier)
			const patientSubs = await prisma.patientSubscription.findMany({
				where: { status: 'active' },
				select: { billingCycle: true, price: true },
			});
			let patientMrr = 0;
			patientSubs.forEach((sub) => {
				const cycle = (sub.billingCycle || '').toLowerCase();
				if (cycle.includes('quarterly')) patientMrr += sub.price / 3;
				else if (cycle.includes('annual') || cycle.includes('yearly')) patientMrr += sub.price / 12;
				else patientMrr += sub.price;
			});

			// Active Provider Subscriptions MRR
			const providerSubs = await prisma.providerSubscription.findMany({
				where: { status: 'active' },
				select: { billingCycle: true, price: true },
			});
			let providerMrr = 0;
			providerSubs.forEach((sub) => {
				const cycle = (sub.billingCycle || '').toLowerCase();
				if (cycle.includes('quarterly')) providerMrr += sub.price / 3;
				else if (cycle.includes('annual') || cycle.includes('yearly')) providerMrr += sub.price / 12;
				else providerMrr += sub.price;
			});

			// Marketplace Sales
			const marketplaceAgg = await prisma.leadPurchase.aggregate({
				_sum: { finalPrice: true },
				where: { status: 'success' },
			});
			const marketplaceSales = marketplaceAgg._sum.finalPrice || 0;

			// Session Commissions (RevenueType enum: SESSION, SUBSCRIPTION, CONTENT)
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
		} catch {
			// Return zeroed data on error so dashboard renders
			return { patientSubscriptions: 0, providerSubscriptions: 0, marketplaceSales: 0, sessionCommissions: 0, total: 0, mrr: 0 };
		}
	}

	async getUserMetrics() {
		try {
			// UserRole enum values: PATIENT, THERAPIST, ADMIN, etc.
			const totalPatients = await prisma.user.count({ where: { role: 'PATIENT', isDeleted: false } });
			const activeSubscribers = await prisma.patientSubscription.count({ where: { status: 'active' } });

			return {
				totalPatients,
				activeSubscribers,
				freeVsPaidRatio: totalPatients > 0 ? (activeSubscribers / totalPatients) * 100 : 0,
			};
		} catch {
			return { totalPatients: 0, activeSubscribers: 0, freeVsPaidRatio: 0 };
		}
	}

	async getProviderMetrics() {
		try {
			// UserRole enum: THERAPIST, PSYCHOLOGIST, PSYCHIATRIST, COACH are all providers
			const totalProviders = await prisma.user.count({
				where: { role: { in: ['THERAPIST', 'PSYCHOLOGIST', 'PSYCHIATRIST', 'COACH'] as any }, isDeleted: false }
			});
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
		} catch {
			return { totalProviders: 0, activeSubscriptions: 0, planDistribution: [] };
		}
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
		const startedAt = Date.now();
		const warnings: string[] = [];

		const dbProbeStartedAt = Date.now();
		let dbProbeMs: number | null = null;
		let dbHealthy = true;
		try {
			await prisma.$queryRawUnsafe('SELECT 1');
			dbProbeMs = Date.now() - dbProbeStartedAt;
		} catch {
			dbHealthy = false;
			warnings.push('Database probe failed');
		}

		const metricResults = await Promise.allSettled([
			prisma.therapySession.count({ where: { status: 'CONFIRMED' } }),
			prisma.patientSubscription.count({ where: { status: 'active' } }),
			prisma.user.count({ where: { role: { in: ['THERAPIST', 'PSYCHOLOGIST', 'PSYCHIATRIST', 'COACH'] as any }, isDeleted: false } }),
			prisma.leadPurchase.count({ where: { status: 'failed' } }),
			prisma.financialPayment.count({ where: { status: 'FAILED' } }),
			prisma.financialPayment.count({ where: { status: 'PENDING_CAPTURE' } }),
			prisma.providerSubscription.count({
				where: { status: 'active', expiryDate: { lt: new Date() } },
			}),
		]);

		const readMetric = (index: number, metricName: string): number => {
			const result = metricResults[index];
			if (result.status === 'fulfilled') {
				return Number(result.value || 0);
			}
			warnings.push(`${metricName} unavailable`);
			return 0;
		};

		const activeSessions = readMetric(0, 'Active sessions');
		const activeSubscriptions = readMetric(1, 'Active subscriptions');
		const totalTherapists = readMetric(2, 'Total therapists');
		const failedLeadPayments = readMetric(3, 'Lead payment failures');
		const failedSessionPayments = readMetric(4, 'Session payment failures');
		const pendingPayments = readMetric(5, 'Pending payments');
		const expiredSubscriptions = readMetric(6, 'Expired subscriptions');

		let queuedExports = 0;
		let failedExports24h = 0;
		try {
			queuedExports = await prisma.$queryRawUnsafe(
				`SELECT COUNT(*)::int AS count
				 FROM analytics.report_export_job
				 WHERE status IN ('queued', 'processing')`,
			).then((rows: any) => Number(rows?.[0]?.count || 0));

			failedExports24h = await prisma.$queryRawUnsafe(
				`SELECT COUNT(*)::int AS count
				 FROM analytics.report_export_job
				 WHERE status = 'failed'
				   AND created_at >= NOW() - INTERVAL '24 hours'`,
			).then((rows: any) => Number(rows?.[0]?.count || 0));
		} catch {
			queuedExports = -1;
			failedExports24h = -1;
			warnings.push('Analytics export queue metrics unavailable');
		}

		const latencyMs = Date.now() - startedAt;
		const backendStatus = latencyMs <= 250 ? 'Healthy' : latencyMs <= 500 ? 'Degraded' : 'Unhealthy';
		const databaseStatus = dbHealthy && (dbProbeMs ?? 9999) <= 200 ? 'Healthy' : dbHealthy ? 'Degraded' : 'Unhealthy';
		const queueStatus = queuedExports < 0
			? 'Unknown'
			: queuedExports > 100 || failedExports24h > 20
				? 'Degraded'
				: 'Healthy';

		const serviceStatuses = [backendStatus, databaseStatus, queueStatus];
		const overall = serviceStatuses.includes('Unhealthy')
			? 'Critical'
			: serviceStatuses.includes('Degraded') || serviceStatuses.includes('Unknown')
				? 'Degraded'
				: 'Healthy';

		return {
			overall,
			latencyMs,
			uptimePercent: 0,
			activeSessions,
			activeSubscriptions,
			totalTherapists,
			failedPayments: failedLeadPayments + failedSessionPayments,
			pendingPayments,
			expiredSubscriptions,
			services: {
				backend: backendStatus,
				database: databaseStatus,
				queue: queueStatus,
				redis: 'Unknown',
				zohoDesk: 'Unknown',
				phonePe: 'Unknown',
			},
			lastChecked: new Date().toISOString(),
			diagnostics: {
				dbProbeMs,
				queuedExports,
				failedExports24h,
				warnings,
			},
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

	async getCompanyReports() {
		try {
			const raw = await prisma.$queryRawUnsafe(
				`SELECT 
					export_job_key as id, 
					report_type, 
					format, 
					status, 
					created_at as "generatedAt",
					filter_payload->>'organizationName' as "companyName",
					filter_payload->>'quarter' as quarter
				 FROM analytics.report_export_job
				 ORDER BY created_at DESC
				 LIMIT 50`
			);
			return raw;
		} catch {
			// analytics schema may not be set up yet – return empty list
			return [];
		}
	}

	async getBICorporateSummary() {
		// Mocked for BI dashboard integration as per PDF Page 23
		return {
			totalValueUnlocked: 1245000,
			programCost: 450000,
			roi: 2.7,
			healthcareSavings: 280000,
			roiMultiplier: 3.1
		};
	}
	async getTherapistPerformanceMetrics() {
		try {
			// Fetch all therapists with their profiles and basic user info
			const therapists = await db.therapistProfile.findMany({
				where: { isDeleted: false },
				include: {
					user: {
						select: {
							firstName: true,
							lastName: true,
						},
					},
				},
			});

			const now = new Date();
			const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
			const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);

			const revenueLedgerAvailable = Boolean((db as any)?.revenueLedger?.aggregate);

			const performanceData = await Promise.all(
				therapists.map(async (profile: any) => {
					const currentSessions = await db.therapySession.count({
						where: {
							therapistProfileId: profile.id,
							status: 'COMPLETED',
							dateTime: { gte: thirtyDaysAgo },
						},
					});

					const previousSessions = await db.therapySession.count({
						where: {
							therapistProfileId: profile.id,
							status: 'COMPLETED',
							dateTime: { gte: sixtyDaysAgo, lt: thirtyDaysAgo },
						},
					});

					const totalSessions = await db.therapySession.count({
						where: {
							therapistProfileId: profile.id,
							status: 'COMPLETED',
						},
					});

					let totalEarningsMinor = 0;
					if (revenueLedgerAvailable) {
						const revenue = await db.revenueLedger.aggregate({
							where: {
								type: 'SESSION',
								referenceId: { not: null },
							},
							_sum: {
								providerShareMinor: true,
							},
						});
						totalEarningsMinor = Number(revenue?._sum?.providerShareMinor || 0);
					}

					const trend = previousSessions === 0 ? 100 : Math.round(((currentSessions - previousSessions) / previousSessions) * 100);

					return {
						id: profile.userId,
						name: `${profile.user.firstName} ${profile.user.lastName}`.trim() || 'Anonymous Provider',
						sessionsCompleted: totalSessions,
						avgRating: profile.averageRating || 0,
						utilizationPercent: Math.min(100, Math.round((totalSessions / 10) * 5)),
						totalEarnings: totalEarningsMinor / 100,
						trend,
					};
				})
			);

			const summary = {
				avgRating: performanceData.length > 0 ? (performanceData.reduce((acc, curr) => acc + curr.avgRating, 0) / performanceData.length).toFixed(1) : 0,
				totalSessions: performanceData.reduce((acc, curr) => acc + curr.sessionsCompleted, 0),
				utilizationPercent: performanceData.length > 0 ? Math.round(performanceData.reduce((acc, curr) => acc + curr.utilizationPercent, 0) / performanceData.length) : 0,
			};

			return { therapists: performanceData, summary };
		} catch (error) {
			console.error('[ADMIN ANALYTICS] Therapist performance failed:', error);
			return { therapists: [], summary: { avgRating: '0.0', totalSessions: 0, utilizationPercent: 0 } };
		}
	}

	async getSessionAnalyticsMetrics(days = 30) {
		const safeDays = Math.min(365, Math.max(1, Number(days) || 30));
		const from = new Date();
		from.setUTCDate(from.getUTCDate() - safeDays);
		from.setUTCHours(0, 0, 0, 0);

		const sessions = await db.therapySession.findMany({
			where: {
				dateTime: { gte: from },
			},
			select: {
				dateTime: true,
				status: true,
				durationMinutes: true,
			},
			orderBy: { dateTime: 'asc' },
		});

		const metricsMap: Record<string, any> = {};

		// Initialize days with zero values to ensure a continuous line in the chart
		for (let i = 0; i <= safeDays; i++) {
			const d = new Date(from);
			d.setUTCDate(d.getUTCDate() + i);
			const dateKey = d.toISOString().split('T')[0];
			metricsMap[dateKey] = {
				date: dateKey,
				totalSessions: 0,
				completed: 0,
				dropped: 0,
				totalDuration: 0,
				avgDurationMinutes: 0,
			};
		}

		sessions.forEach((s: any) => {
			const dateKey = s.dateTime.toISOString().split('T')[0];
			if (!metricsMap[dateKey]) {
				metricsMap[dateKey] = {
					date: dateKey,
					totalSessions: 0,
					completed: 0,
					dropped: 0,
					totalDuration: 0,
					avgDurationMinutes: 0,
				};
			}

			metricsMap[dateKey].totalSessions++;
			if (s.status === 'COMPLETED') {
				metricsMap[dateKey].completed++;
				metricsMap[dateKey].totalDuration += (s.durationMinutes || 0);
			} else if (s.status === 'CANCELLED') {
				metricsMap[dateKey].dropped++;
			}
		});

		const metrics = Object.values(metricsMap).map((m: any) => {
			const { totalDuration, ...rest } = m;
			return {
				...rest,
				avgDurationMinutes: m.completed > 0 ? Math.round(totalDuration / m.completed) : 0,
			};
		}).sort((a: any, b: any) => a.date.localeCompare(b.date));

		const totalSessions = sessions.length;
		const completedCount = sessions.filter((s: any) => s.status === 'COMPLETED').length;
		const droppedCount = sessions.filter((s: any) => s.status === 'CANCELLED').length;
		const totalDurationOverall = sessions.reduce((acc: number, s: any) => acc + (s.status === 'COMPLETED' ? (s.durationMinutes || 0) : 0), 0);

		const summary = {
			totalSessions,
			completionRate: totalSessions > 0 ? Math.round((completedCount / totalSessions) * 100) : 0,
			avgDurationMinutes: completedCount > 0 ? Math.round(totalDurationOverall / completedCount) : 0,
			dropOffRate: totalSessions > 0 ? Math.round((droppedCount / totalSessions) * 100) : 0,
		};

		return { metrics, summary };
	}

	async getUserGrowthMetrics(days: number = 90) {
		const startDate = new Date();
		startDate.setDate(startDate.getDate() - days);

		// 1. New Users Growth (Acquisition)
		const newUsersRaw = await prisma.$queryRawUnsafe(`
			SELECT DATE_TRUNC('day', "createdAt") as date, COUNT(*)::int as count
			FROM users
			WHERE "createdAt" >= $1
			GROUP BY 1
			ORDER BY 1 ASC
		`, startDate) as any[];

		// 2. Active Users (DAU approximate from AuthSession)
		const activeUsersRaw = await prisma.$queryRawUnsafe(`
			SELECT DATE_TRUNC('day', "lastActiveAt") as date, COUNT(DISTINCT "userId")::int as count
			FROM auth_sessions
			WHERE "lastActiveAt" >= $1
			GROUP BY 1
			ORDER BY 1 ASC
		`, startDate) as any[];

		// 3. Summary stats
		const totalRegistered = await prisma.user.count({ where: { isDeleted: false } });
		// Count distinct users active in last 30d
		const activeUsers30dRows = await prisma.$queryRawUnsafe(`
			SELECT COUNT(DISTINCT "userId")::int as count
			FROM auth_sessions
			WHERE "lastActiveAt" >= $1
		`, new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)) as Array<{count: number}>;
		const activeUsers30d = Number(activeUsers30dRows[0]?.count ?? 0);
		const newUsers90d = await prisma.user.count({
			where: { createdAt: { gte: startDate }, isDeleted: false }
		});

		// Merge metrics into a time-series
		const metricsMap: Record<string, any> = {};
		
		// Initialize all dates in range
		for (let i = 0; i <= days; i++) {
			const d = new Date();
			d.setDate(d.getDate() - i);
			const dateStr = d.toISOString().split('T')[0];
			metricsMap[dateStr] = { 
				date: dateStr, 
				newUsers: 0, 
				activeUsers: 0, 
				retentionRate: 0 
			};
		}

		newUsersRaw.forEach(r => {
			const dateStr = new Date(r.date).toISOString().split('T')[0];
			if (metricsMap[dateStr]) metricsMap[dateStr].newUsers = r.count;
		});

		activeUsersRaw.forEach(r => {
			const dateStr = new Date(r.date).toISOString().split('T')[0];
			if (metricsMap[dateStr]) metricsMap[dateStr].activeUsers = r.count;
		});

		// Basic Retention Rate calculation for the trend
		Object.values(metricsMap).forEach((m: any) => {
			// Retention rate here is DAU / Total Registered up to that point (simplified)
			m.retentionRate = totalRegistered > 0 ? Math.min(100, Math.round((m.activeUsers / totalRegistered) * 100)) : 0;
		});

		const metrics = Object.values(metricsMap)
			.sort((a: any, b: any) => a.date.localeCompare(b.date));

		const summary = {
			totalRegistered,
			activeUsers: activeUsers30d,
			avgRetentionRate: totalRegistered > 0 ? Math.round((activeUsers30d / totalRegistered) * 100) : 0,
			newUsers90d
		};

		return { metrics, summary };
	}

	async getPlatformAnalyticsMetrics(days: number = 90) {
		const startDate = new Date();
		startDate.setDate(startDate.getDate() - days);

		// 1. Revenue & Payment metrics from DailyPaymentMetric
		const dailyMetrics = await prisma.dailyPaymentMetric.findMany({
			where: { date: { gte: startDate } },
			orderBy: { date: 'asc' }
		});

		// 2. Premium Users (Active Subscriptions)
		const premiumUsersCount = await prisma.patientSubscription.count({
			where: { status: 'active' }
		});

		// 3. Churn calculation (approximate)
		// Churn = (Cancellations in last 30d) / (Active at start of 30d)
		const thirtyDaysAgo = new Date();
		thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

		const cancellations30d = await prisma.subscriptionHistory.count({
			where: {
				newStatus: { in: ['cancelled', 'expired'] },
				changedAt: { gte: thirtyDaysAgo }
			}
		});

		const totalUsers = await prisma.user.count({ where: { role: 'PATIENT' as any, isDeleted: false } });
		
		// 4. Time-series metrics
		const metricsMap: Record<string, any> = {};
		for (let i = 0; i <= days; i++) {
			const d = new Date();
			d.setDate(d.getDate() - i);
			const dateStr = d.toISOString().split('T')[0];
			metricsMap[dateStr] = {
				date: dateStr,
				revenue: 0,
				churnRate: 0,
				premiumUsers: 0,
				arpu: 0
			};
		}

		dailyMetrics.forEach(m => {
			const dateStr = m.date.toISOString().split('T')[0];
			if (metricsMap[dateStr]) {
				metricsMap[dateStr].revenue = Number(m.revenueMinor) / 100;
			}
		});

		// Calculate cumulative/summary stats
		const totalRevenue = dailyMetrics.reduce((acc, m) => acc + (Number(m.revenueMinor) / 100), 0);
		const churnRate30d = totalUsers > 0 ? (cancellations30d / totalUsers) * 100 : 0;
		const arpu = totalUsers > 0 ? totalRevenue / totalUsers : 0;

		const metrics = Object.values(metricsMap).sort((a: any, b: any) => a.date.localeCompare(b.date));

		metrics.forEach(m => {
			m.churnRate = Math.round(churnRate30d * 10) / 10;
			m.premiumUsers = premiumUsersCount; 
			m.arpu = Math.round(arpu * 100) / 100;
		});

		const summary = {
			totalRevenue: Math.round(totalRevenue),
			churnRate: Math.round(churnRate30d * 10) / 10,
			premiumUsers: premiumUsersCount,
			arpu: Math.round(arpu),
			ltv: churnRate30d > 0 ? Math.round(arpu / (churnRate30d / 100)) : 0
		};

		return { metrics, summary };
	}
}



export const adminAnalyticsService = new AdminAnalyticsService();
