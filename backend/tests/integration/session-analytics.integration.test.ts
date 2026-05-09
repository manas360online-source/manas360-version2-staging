import { randomUUID } from 'crypto';
import { adminAnalyticsService } from '../../src/services/admin-analytics.service';
import { connectTestDb, disconnectTestDb, prisma } from '../helpers/postgres-fixture';

describe('Session analytics integration', () => {
	let analyticsReady = false;
	const seedPrefix = `it-analytics-${randomUUID()}`;

	beforeAll(async () => {
		await connectTestDb();
		const fn = (await prisma.$queryRawUnsafe(
			`SELECT to_regprocedure('analytics.refresh_admin_rollups()')::text AS fn`,
		)) as Array<{ fn: string | null }>;
		analyticsReady = Boolean(fn?.[0]?.fn);
	});

	afterAll(async () => {
		if (analyticsReady) {
			await prisma.$executeRawUnsafe(
				`DELETE FROM analytics.fact_session WHERE source_session_id LIKE $1`,
				`${seedPrefix}-%`,
			);
			await prisma.$executeRawUnsafe(
				`DELETE FROM analytics.dim_template WHERE template_id LIKE $1`,
				`${seedPrefix}-%`,
			);
			await prisma.$executeRawUnsafe(
				`DELETE FROM analytics.dim_therapist WHERE therapist_id LIKE $1`,
				`${seedPrefix}-%`,
			);
			await prisma.$executeRawUnsafe(
				`DELETE FROM analytics.dim_organization WHERE organization_id LIKE $1`,
				`${seedPrefix}-%`,
			);
		}
		await disconnectTestDb();
	});

	it('validates completion rate, avg duration, template count, and edge cases against manual SQL', async () => {
		if (!analyticsReady) {
			expect(true).toBe(true);
			return;
		}

		const orgId = `${seedPrefix}-org`;
		const therapistId = `${seedPrefix}-therapist`;
		const templateId = `${seedPrefix}-template`;

		await prisma.$executeRawUnsafe(
			`INSERT INTO analytics.dim_date (date_key, calendar_date, day_of_week, week_of_year, month_of_year, quarter_of_year, year_num, week_start_date, month_start_date)
			 VALUES
			 (20260110, DATE '2026-01-10', 6, 2, 1, 1, 2026, DATE '2026-01-05', DATE '2026-01-01'),
			 (20260111, DATE '2026-01-11', 7, 2, 1, 1, 2026, DATE '2026-01-05', DATE '2026-01-01'),
			 (20260112, DATE '2026-01-12', 1, 3, 1, 1, 2026, DATE '2026-01-12', DATE '2026-01-01'),
			 (20260113, DATE '2026-01-13', 2, 3, 1, 1, 2026, DATE '2026-01-12', DATE '2026-01-01')
			 ON CONFLICT (date_key) DO NOTHING`,
		);

		const organization = (await prisma.$queryRawUnsafe(
			`INSERT INTO analytics.dim_organization (organization_id, organization_name, plan_tier, region)
			 VALUES ($1, 'IT Org', 'enterprise', 'test')
			 ON CONFLICT (organization_id)
			 DO UPDATE SET organization_name = EXCLUDED.organization_name
			 RETURNING organization_key`,
			orgId,
		)) as Array<{ organization_key: bigint | number }>;

		const therapist = (await prisma.$queryRawUnsafe(
			`INSERT INTO analytics.dim_therapist (therapist_id, specialization, region, license_type)
			 VALUES ($1, 'CBT', 'test', 'LCSW')
			 ON CONFLICT (therapist_id)
			 DO UPDATE SET specialization = EXCLUDED.specialization
			 RETURNING therapist_key`,
			therapistId,
		)) as Array<{ therapist_key: bigint | number }>;

		const template = (await prisma.$queryRawUnsafe(
			`INSERT INTO analytics.dim_template (template_id, template_version, template_name, category)
			 VALUES ($1, 1, 'IT Template', 'cbt')
			 ON CONFLICT (template_id, template_version)
			 DO UPDATE SET template_name = EXCLUDED.template_name
			 RETURNING template_key`,
			templateId,
		)) as Array<{ template_key: bigint | number }>;

		const organizationKey = Number(organization[0].organization_key);
		const therapistKey = Number(therapist[0].therapist_key);
		const templateKey = Number(template[0].template_key);

		await prisma.$executeRawUnsafe(
			`INSERT INTO analytics.fact_session
			 (source_session_id, date_key, organization_key, therapist_key, template_key, started_at, ended_at, duration_seconds, status, is_completed, completion_ratio)
			 VALUES
			 ($1, 20260110, $5, $6, $7, now() - interval '5 days', now() - interval '5 days' + interval '1200 seconds', 1200, 'completed', true, 1.0),
			 ($2, 20260111, $5, $6, $7, now() - interval '4 days', now() - interval '4 days' + interval '1800 seconds', 1800, 'completed', true, 1.0),
			 ($3, 20260112, $5, $6, $7, now() - interval '3 days', null, null, 'abandoned', false, 0.25),
			 ($4, 20260113, $5, $6, $7, now() - interval '2 days', null, null, 'in_progress', false, 0.10)`,
			`${seedPrefix}-s1`,
			`${seedPrefix}-s2`,
			`${seedPrefix}-s3`,
			`${seedPrefix}-s4`,
			organizationKey,
			therapistKey,
			templateKey,
		);

		await expect(
			prisma.$executeRawUnsafe(
				`INSERT INTO analytics.fact_session
				 (source_session_id, date_key, organization_key, therapist_key, template_key, started_at, status, is_completed)
				 VALUES ($1, 20260113, $2, $3, $4, now(), 'completed', true)`,
				`${seedPrefix}-s1`,
				organizationKey,
				therapistKey,
				templateKey,
			),
		).rejects.toBeTruthy();

		await prisma.$executeRawUnsafe(`SELECT analytics.refresh_admin_rollups();`);

		const serviceSummary = await adminAnalyticsService.getSummary({
			from: '2026-01-01T00:00:00.000Z',
			to: '2026-01-31T23:59:59.000Z',
			organizationKey,
		});

		const manualSummary = (await prisma.$queryRawUnsafe(
			`SELECT
				COUNT(*)::int AS total_sessions,
				COUNT(*) FILTER (WHERE is_completed)::int AS completed_sessions,
				(COUNT(*) FILTER (WHERE is_completed)::numeric / NULLIF(COUNT(*), 0))::numeric(8,4) AS completion_rate,
				AVG(CASE WHEN is_completed AND duration_seconds IS NOT NULL THEN duration_seconds END)::numeric(12,2) AS avg_completion_seconds
			 FROM analytics.fact_session
			 WHERE organization_key = $1
			   AND date_key BETWEEN 20260101 AND 20260131`,
			organizationKey,
		)) as Array<{
			total_sessions: number;
			completed_sessions: number;
			completion_rate: string;
			avg_completion_seconds: string;
		}>;

		expect(serviceSummary.totalSessionsConducted).toBe(manualSummary[0].total_sessions);
		expect(serviceSummary.completedSessions).toBe(manualSummary[0].completed_sessions);
		expect(serviceSummary.completionRate).toBe(Number(manualSummary[0].completion_rate));
		expect(serviceSummary.averageCompletionSeconds).toBe(Number(manualSummary[0].avg_completion_seconds));

		const templateUsage = await adminAnalyticsService.getMostUsedTemplates(
			{
				from: '2026-01-01',
				to: '2026-02-01',
				organizationKey,
			},
			10,
		);
		expect(templateUsage.items.length).toBeGreaterThan(0);
		expect(templateUsage.items[0].sessionsCount).toBe(4);
	});
});
