import { prisma } from '../src/config/db';

type DateDimRow = {
	dateKey: number;
	calendarDate: string;
	dayOfWeek: number;
	weekOfYear: number;
	monthOfYear: number;
	quarterOfYear: number;
	yearNum: number;
	weekStartDate: string;
	monthStartDate: string;
};

function formatDate(date: Date): string {
	return date.toISOString().slice(0, 10);
}

function toDateKey(date: Date): number {
	const yyyy = date.getUTCFullYear();
	const mm = String(date.getUTCMonth() + 1).padStart(2, '0');
	const dd = String(date.getUTCDate()).padStart(2, '0');
	return Number(`${yyyy}${mm}${dd}`);
}

function getWeekStart(date: Date): Date {
	const value = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
	const day = value.getUTCDay();
	const diff = day === 0 ? -6 : 1 - day;
	value.setUTCDate(value.getUTCDate() + diff);
	return value;
}

function buildDateDimRow(date: Date): DateDimRow {
	const weekStart = getWeekStart(date);
	const monthStart = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));

	const firstDayOfYear = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
	const daysSinceYearStart = Math.floor((Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()) - firstDayOfYear.getTime()) / 86400000);
	const weekOfYear = Math.floor((daysSinceYearStart + firstDayOfYear.getUTCDay()) / 7) + 1;

	return {
		dateKey: toDateKey(date),
		calendarDate: formatDate(date),
		dayOfWeek: date.getUTCDay() === 0 ? 7 : date.getUTCDay(),
		weekOfYear,
		monthOfYear: date.getUTCMonth() + 1,
		quarterOfYear: Math.floor(date.getUTCMonth() / 3) + 1,
		yearNum: date.getUTCFullYear(),
		weekStartDate: formatDate(weekStart),
		monthStartDate: formatDate(monthStart),
	};
}

async function ensureDateDimensionSchema() {
	await prisma.$executeRawUnsafe(
		`ALTER TABLE analytics.dim_date
			ADD COLUMN IF NOT EXISTS week_of_year smallint NOT NULL DEFAULT 0;
		 ALTER TABLE analytics.dim_date
			ADD COLUMN IF NOT EXISTS month_of_year smallint NOT NULL DEFAULT 0;
		 ALTER TABLE analytics.dim_date
			ADD COLUMN IF NOT EXISTS quarter_of_year smallint NOT NULL DEFAULT 0;
		 ALTER TABLE analytics.dim_date
			ADD COLUMN IF NOT EXISTS year_num integer NOT NULL DEFAULT 0;
		 ALTER TABLE analytics.dim_date
			ADD COLUMN IF NOT EXISTS week_start_date date NOT NULL DEFAULT '1970-01-01';
		 ALTER TABLE analytics.dim_date
			ADD COLUMN IF NOT EXISTS month_start_date date NOT NULL DEFAULT '1970-01-01';
		`,
	);
}

async function ensureDateDimension(start: Date, end: Date) {
	for (
		let d = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate()));
		d <= end;
		d = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() + 1))
	) {
		const row = buildDateDimRow(d);
		await prisma.$executeRawUnsafe(
			`INSERT INTO analytics.dim_date
				(date_key, calendar_date, day_of_week, week_of_year, month_of_year, quarter_of_year, year_num, week_start_date, month_start_date)
			 VALUES ($1, $2::date, $3, $4, $5, $6, $7, $8::date, $9::date)
			 ON CONFLICT (date_key) DO NOTHING`,
			row.dateKey,
			row.calendarDate,
			row.dayOfWeek,
			row.weekOfYear,
			row.monthOfYear,
			row.quarterOfYear,
			row.yearNum,
			row.weekStartDate,
			row.monthStartDate,
		);
	}
}

async function run() {
	const now = new Date();
	const rangeStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - 120));
	const rangeEnd = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));

	const organizationId = 'mock-org-main';
	const therapistIds = ['mock-therapist-1', 'mock-therapist-2', 'mock-therapist-3'];
	const templates = [
		{ id: 'mock-template-anxiety', version: 1, name: 'Anxiety Regulation', category: 'Anxiety' },
		{ id: 'mock-template-depression', version: 1, name: 'Depression Recovery', category: 'Depression' },
		{ id: 'mock-template-sleep', version: 1, name: 'Sleep Reset', category: 'Sleep' },
		{ id: 'mock-template-stress', version: 1, name: 'Stress Management', category: 'Stress' },
	];

	console.log('Seeding admin analytics mock data...');
	await ensureDateDimensionSchema();
	await ensureDateDimension(rangeStart, rangeEnd);

	const organizationRows = (await prisma.$queryRawUnsafe(
		`INSERT INTO analytics.dim_organization (organization_id, organization_name, plan_tier, region)
		 VALUES ($1, 'Mock Organization', 'enterprise', 'IN')
		 ON CONFLICT (organization_id)
		 DO UPDATE SET organization_name = EXCLUDED.organization_name, updated_at = now()
		 RETURNING organization_key`,
		organizationId,
	)) as Array<{ organization_key: bigint | number }>;

	const organizationKey = Number(organizationRows[0].organization_key);

	const therapistKeys: number[] = [];
	for (const therapistId of therapistIds) {
		const rows = (await prisma.$queryRawUnsafe(
			`INSERT INTO analytics.dim_therapist (therapist_id, specialization, region, license_type, is_active)
			 VALUES ($1, 'CBT', 'IN', 'LCSW', true)
			 ON CONFLICT (therapist_id)
			 DO UPDATE SET specialization = EXCLUDED.specialization, updated_at = now()
			 RETURNING therapist_key`,
			therapistId,
		)) as Array<{ therapist_key: bigint | number }>;
		therapistKeys.push(Number(rows[0].therapist_key));
	}

	const templateKeys: number[] = [];
	for (const template of templates) {
		const rows = (await prisma.$queryRawUnsafe(
			`INSERT INTO analytics.dim_template (template_id, template_version, template_name, category, is_active)
			 VALUES ($1, $2, $3, $4, true)
			 ON CONFLICT (template_id, template_version)
			 DO UPDATE SET template_name = EXCLUDED.template_name, category = EXCLUDED.category, updated_at = now()
			 RETURNING template_key`,
			template.id,
			template.version,
			template.name,
			template.category,
		)) as Array<{ template_key: bigint | number }>;
		templateKeys.push(Number(rows[0].template_key));
	}

	const dayCount = Math.floor((rangeEnd.getTime() - rangeStart.getTime()) / 86400000);
	const totalSessions = 180;

	for (let i = 0; i < totalSessions; i += 1) {
		const offset = i % Math.max(dayCount, 1);
		const day = new Date(Date.UTC(rangeStart.getUTCFullYear(), rangeStart.getUTCMonth(), rangeStart.getUTCDate() + offset));
		const dateKey = toDateKey(day);

		const therapistKey = therapistKeys[i % therapistKeys.length];
		const templateKey = templateKeys[i % templateKeys.length];

		const hour = 8 + (i % 8);
		const startedAt = new Date(Date.UTC(day.getUTCFullYear(), day.getUTCMonth(), day.getUTCDate(), hour, 0, 0));

		const status = i % 10 === 0 ? 'abandoned' : i % 8 === 0 ? 'in_progress' : 'completed';
		const isCompleted = status === 'completed';
		const durationSeconds = isCompleted ? 1200 + (i % 6) * 300 : null;
		const endedAt = isCompleted && durationSeconds
			? new Date(startedAt.getTime() + durationSeconds * 1000)
			: null;
		const completionRatio = status === 'completed' ? 1 : status === 'abandoned' ? 0.35 : 0.55;

		await prisma.$executeRawUnsafe(
			`INSERT INTO analytics.fact_session
				(source_session_id, date_key, organization_key, therapist_key, template_key, started_at, ended_at, duration_seconds, status, is_completed, is_billable, completion_ratio)
			 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
			 ON CONFLICT (source_session_id)
			 DO UPDATE SET
				date_key = EXCLUDED.date_key,
				organization_key = EXCLUDED.organization_key,
				therapist_key = EXCLUDED.therapist_key,
				template_key = EXCLUDED.template_key,
				started_at = EXCLUDED.started_at,
				ended_at = EXCLUDED.ended_at,
				duration_seconds = EXCLUDED.duration_seconds,
				status = EXCLUDED.status,
				is_completed = EXCLUDED.is_completed,
				is_billable = EXCLUDED.is_billable,
				completion_ratio = EXCLUDED.completion_ratio,
				updated_at = now()`,
			`mock-admin-session-${i + 1}`,
			dateKey,
			organizationKey,
			therapistKey,
			templateKey,
			startedAt,
			endedAt,
			durationSeconds,
			status,
			isCompleted,
			isCompleted,
			completionRatio,
		);
	}

	for (
		let d = new Date(Date.UTC(rangeStart.getUTCFullYear(), rangeStart.getUTCMonth(), rangeStart.getUTCDate()));
		d <= rangeEnd;
		d = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() + 1))
	) {
		const dateKey = toDateKey(d);
		for (let i = 0; i < therapistKeys.length; i += 1) {
			const therapistKey = therapistKeys[i];
			const availableMinutes = 480;
			const bookedMinutes = 180 + ((toDateKey(d) + i) % 220);
			const completedMinutes = Math.max(0, bookedMinutes - 20);

			await prisma.$executeRawUnsafe(
				`INSERT INTO analytics.fact_therapist_capacity_daily
					(date_key, therapist_key, organization_key, available_minutes, booked_minutes, completed_minutes, unavailable_minutes)
				 VALUES ($1, $2, $3, $4, $5, $6, 0)
				 ON CONFLICT (date_key, therapist_key)
				 DO UPDATE SET
					organization_key = EXCLUDED.organization_key,
					available_minutes = EXCLUDED.available_minutes,
					booked_minutes = EXCLUDED.booked_minutes,
					completed_minutes = EXCLUDED.completed_minutes,
					updated_at = now()`,
				dateKey,
				therapistKey,
				organizationKey,
				availableMinutes,
				bookedMinutes,
				completedMinutes,
			);
		}
	}

	await prisma.$executeRawUnsafe('SELECT analytics.refresh_admin_rollups();');

	console.log('Admin analytics mock data seed complete.');
	console.log(JSON.stringify({ organizationKey, therapistKeys, templateKeys, totalSessions }, null, 2));
	console.log('Use the printed organizationKey in the Admin Dashboard filter if it is not 1.');
}

run()
	.then(async () => {
		await prisma.$disconnect();
		process.exit(0);
	})
	.catch(async (error) => {
		console.error(error);
		await prisma.$disconnect();
		process.exit(1);
	});
