import { prisma } from '../config/db';
import { env } from '../config/env';

const DEFAULT_INTERVAL = Number(env.analyticsRollupIntervalSeconds || 3600); // seconds

async function ensureMaterializedView() {
	const createSql = `DO $$
BEGIN
	IF NOT EXISTS (SELECT 1 FROM pg_matviews WHERE matviewname = 'analytics_session_metrics') THEN
		-- use distinct dollar tags for nested EXECUTE to avoid delimiter collisions
		EXECUTE $create$
			CREATE MATERIALIZED VIEW analytics_session_metrics AS
			SELECT
				ps."id" AS session_id,
				t."therapistId" AS therapist_id,
				ps."patientId" AS patient_id,
				ps."startedAt" AS started_at,
				ps."completedAt" AS completed_at,
				EXTRACT(EPOCH FROM (ps."completedAt" - ps."startedAt"))::int AS duration_seconds,
				(SELECT COUNT(*) FROM "patient_session_responses" r WHERE r."sessionId" = ps."id") AS answered_count,
				(SELECT COUNT(*) FROM "cbt_questions" q WHERE q."sessionId" = t."id") AS total_questions,
				AVG((r."responseData"->>'score')::numeric) AS session_score,
				ps."templateVersion" AS template_version
			FROM "patient_sessions" ps
			JOIN "cbt_session_templates" t ON t."id" = ps."templateId"
			LEFT JOIN "patient_session_responses" r ON r."sessionId" = ps."id"
			WHERE ps."completedAt" IS NOT NULL
			GROUP BY ps."id", t."id", t."therapistId", ps."patientId", ps."startedAt", ps."completedAt", ps."templateVersion";
		$create$;

		EXECUTE $idx$CREATE UNIQUE INDEX idx_analytics_session_metrics_session_id ON analytics_session_metrics(session_id)$idx$;
		EXECUTE $idx2$CREATE INDEX idx_analytics_session_metrics_therapist_completed_at ON analytics_session_metrics(therapist_id, completed_at)$idx2$;
	END IF;
END
$$;`;

	await prisma.$executeRawUnsafe(createSql);
}

async function refreshAdminRollupsIfAvailable() {
	try {
		await prisma.$executeRawUnsafe(`DO $$
		BEGIN
			IF to_regprocedure('analytics.refresh_admin_rollups()') IS NOT NULL THEN
				PERFORM analytics.refresh_admin_rollups();
			END IF;
		END
		$$;`);
	} catch (e) {
		console.warn('analytics: failed to refresh admin rollups', e);
	}
}

export async function refreshAnalyticsMaterializedViews() {
	try {
		await ensureMaterializedView();
		// Use CONCURRENTLY where possible to avoid long locks
		try {
			await prisma.$executeRawUnsafe('REFRESH MATERIALIZED VIEW CONCURRENTLY analytics_session_metrics;');
		} catch (e) {
			// fallback to non-concurrent refresh if concurrent fails (e.g., lack of unique index or permission)
			await prisma.$executeRawUnsafe('REFRESH MATERIALIZED VIEW analytics_session_metrics;');
		}
		await refreshAdminRollupsIfAvailable();
		console.log('analytics: refreshed materialized views');
	} catch (err) {
		console.error('analytics: failed to refresh materialized views', err);
	}
}

async function ensureIndexes() {
	try {
		// patient_sessions: helpful composite index for therapist/time lookups
		await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS idx_patient_sessions_template_started_completed ON "patient_sessions"("templateId", "startedAt", "completedAt");`);
		// patient_session_responses: index by session and answeredAt
		await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS idx_patient_session_responses_session_answered_at ON "patient_session_responses"("sessionId", "answeredAt");`);
		// patient_session_responses: index by questionId for drop-off computations
		await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS idx_patient_session_responses_question_id ON "patient_session_responses"("questionId");`);
		console.log('analytics: ensured base table indexes');
	} catch (e) {
		console.warn('analytics: failed to create indexes', e);
	}
}


let timer: NodeJS.Timeout | null = null;

export function startAnalyticsRollup(intervalSeconds = DEFAULT_INTERVAL) {
	// run immediately then schedule
	void ensureIndexes().catch(() => {});
	void refreshAnalyticsMaterializedViews();
	if (timer) clearInterval(timer);
	timer = setInterval(() => {
		void refreshAnalyticsMaterializedViews();
	}, intervalSeconds * 1000);
	console.log(`analytics: rollup started, interval ${intervalSeconds}s`);
	return timer;
}

export function stopAnalyticsRollup() {
	if (timer) clearInterval(timer);
	timer = null;
}

