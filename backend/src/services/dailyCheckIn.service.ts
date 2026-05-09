export type DailyCheckInEnergy = 'low' | 'medium' | 'high';

export type DailyCheckInMetadata = {
	intensity?: number | null;
	tags: string[];
	energy?: DailyCheckInEnergy | null;
	sleepHours?: string | null;
};

type DailyCheckInEntry = {
	mood: number;
	created_at: string | Date;
	metadata?: DailyCheckInMetadata | null;
};

const DETAILS_HEADER = 'Check-in details:';
const TAG_LINE = '- Tags:';
const INTENSITY_LINE = '- Intensity:';
const ENERGY_LINE = '- Energy:';
const SLEEP_LINE = '- Sleep:';

const TAG_LABELS: Record<string, string> = {
	work: 'Work',
	sleep: 'Sleep',
	family: 'Family',
	health: 'Health',
	finances: 'Finances',
	exercise: 'Exercise',
	relationships: 'Relationships',
	grief: 'Grief',
	social: 'Social',
	selfcare: 'Self-care',
};

const ENERGY_LABELS: Record<DailyCheckInEnergy, string> = {
	low: 'Low',
	medium: 'Medium',
	high: 'High',
};

const unique = <T,>(items: T[]): T[] => [...new Set(items)];

const normalizeTag = (value: string): string =>
	String(value || '')
		.trim()
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-+|-+$/g, '');

export const formatDailyCheckInTag = (tag: string): string => {
	const normalized = normalizeTag(tag);
	return TAG_LABELS[normalized] || normalized.replace(/-/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase()) || 'General';
};

export const formatDailyCheckInEnergy = (energy?: string | null): string | null => {
	if (!energy) return null;
	const normalized = String(energy).trim().toLowerCase() as DailyCheckInEnergy;
	return ENERGY_LABELS[normalized] || null;
};

export const buildDailyCheckInNote = (input: {
	journal?: string | null;
	tags?: string[];
	intensity?: number | null;
	energy?: string | null;
	sleepHours?: string | null;
}): string | null => {
	const journal = String(input.journal || '').trim();
	const tags = unique((Array.isArray(input.tags) ? input.tags : []).map(normalizeTag).filter(Boolean)).slice(0, 3);
	const intensity = Number.isFinite(input.intensity) ? Math.max(1, Math.min(10, Math.round(Number(input.intensity)))) : null;
	const energy = formatDailyCheckInEnergy(input.energy)?.toLowerCase() as DailyCheckInEnergy | null;
	const sleepHours = String(input.sleepHours || '').trim() || null;

	const detailLines = [
		tags.length ? `${TAG_LINE} ${tags.join(', ')}` : null,
		intensity ? `${INTENSITY_LINE} ${intensity}/10` : null,
		energy ? `${ENERGY_LINE} ${energy}` : null,
		sleepHours ? `${SLEEP_LINE} ${sleepHours}` : null,
	].filter(Boolean) as string[];

	if (!journal && !detailLines.length) return null;
	if (!detailLines.length) return journal || null;

	return [journal, journal ? '' : null, DETAILS_HEADER, ...detailLines]
		.filter((line): line is string => line !== null)
		.join('\n');
};

export const parseDailyCheckInNote = (note?: string | null): { journal: string | null; metadata: DailyCheckInMetadata } => {
	const raw = String(note || '').trim();
	if (!raw) {
		return { journal: null, metadata: { tags: [] } };
	}

	const detailsIndex = raw.indexOf(DETAILS_HEADER);
	if (detailsIndex === -1) {
		return { journal: raw, metadata: { tags: [] } };
	}

	const journal = raw.slice(0, detailsIndex).trim() || null;
	const detailBlock = raw.slice(detailsIndex + DETAILS_HEADER.length).trim();
	const metadata: DailyCheckInMetadata = { tags: [] };

	for (const line of detailBlock.split('\n').map((item) => item.trim()).filter(Boolean)) {
		if (line.startsWith(TAG_LINE)) {
			metadata.tags = unique(
				line
					.slice(TAG_LINE.length)
					.split(',')
					.map(normalizeTag)
					.filter(Boolean),
			);
			continue;
		}

		if (line.startsWith(INTENSITY_LINE)) {
			const matched = line.match(/(\d+)/);
			if (matched) metadata.intensity = Math.max(1, Math.min(10, Number(matched[1])));
			continue;
		}

		if (line.startsWith(ENERGY_LINE)) {
			const energyValue = line.slice(ENERGY_LINE.length).trim().toLowerCase();
			if (energyValue === 'low' || energyValue === 'medium' || energyValue === 'high') {
				metadata.energy = energyValue;
			}
			continue;
		}

		if (line.startsWith(SLEEP_LINE)) {
			metadata.sleepHours = line.slice(SLEEP_LINE.length).trim() || null;
		}
	}

	return { journal, metadata };
};

const topTags = (entries: Array<{ metadata?: DailyCheckInMetadata | null }>) => {
	const counts = new Map<string, number>();
	for (const entry of entries) {
		for (const tag of entry.metadata?.tags || []) {
			counts.set(tag, (counts.get(tag) || 0) + 1);
		}
	}
	return [...counts.entries()].sort((a, b) => b[1] - a[1]);
};

export const buildDailyCheckInInsights = (entries: DailyCheckInEntry[]): string[] => {
	const rows = entries
		.filter((entry) => Number.isFinite(Number(entry.mood)))
		.map((entry) => ({
			mood: Number(entry.mood),
			createdAt: new Date(entry.created_at),
			metadata: entry.metadata || { tags: [] },
		}))
		.filter((entry) => !Number.isNaN(entry.createdAt.getTime()));

	if (!rows.length) return [];

	const insights: string[] = [];
	const positive = rows.filter((entry) => entry.mood >= 4);
	const lowerMood = rows.filter((entry) => entry.mood <= 2);

	const positiveTop = topTags(positive).filter(([, count]) => count >= 2).slice(0, 2);
	if (positiveTop.length) {
		const labels = positiveTop.map(([tag]) => formatDailyCheckInTag(tag));
		insights.push(`Insight: On days you feel better, you often tag ${labels.join(' and ')}.`);
	}

	const recentLowMood = lowerMood.slice(0, 3);
	const lowMoodTop = topTags(recentLowMood).filter(([, count]) => count >= 2)[0];
	if (lowMoodTop) {
		insights.push(
			`Insight: ${formatDailyCheckInTag(lowMoodTop[0])} has been linked to ${lowMoodTop[1]} of your last ${recentLowMood.length} lower-mood check-ins.`,
		);
	}

	const restedPositive = positive.filter((entry) => entry.metadata.sleepHours && String(entry.metadata.sleepHours).trim().length > 0);
	if (restedPositive.length >= 2) {
		const sleepCounts = new Map<string, number>();
		for (const entry of restedPositive) {
			const key = String(entry.metadata.sleepHours);
			sleepCounts.set(key, (sleepCounts.get(key) || 0) + 1);
		}
		const topSleep = [...sleepCounts.entries()].sort((a, b) => b[1] - a[1])[0];
		if (topSleep && topSleep[1] >= 2) {
			insights.push(`Insight: Your steadier check-ins often follow ${topSleep[0]} of sleep.`);
		}
	}

	return unique(insights).slice(0, 3);
};

export const getThreeDayLowMoodTrend = (entries: DailyCheckInEntry[]): { recentDays: Array<{ dayKey: string; mood: number; tags: string[] }> } | null => {
	const byDay = new Map<string, { dayKey: string; mood: number; tags: string[] }>();

	for (const entry of entries) {
		const at = new Date(entry.created_at);
		if (Number.isNaN(at.getTime())) continue;
		const dayKey = at.toISOString().slice(0, 10);
		if (byDay.has(dayKey)) continue;
		byDay.set(dayKey, {
			dayKey,
			mood: Number(entry.mood || 0),
			tags: entry.metadata?.tags || [],
		});
	}

	const recentDays = [...byDay.values()].sort((a, b) => b.dayKey.localeCompare(a.dayKey)).slice(0, 3);
	if (recentDays.length < 3 || recentDays.some((entry) => entry.mood > 2)) return null;

	for (let index = 0; index < recentDays.length - 1; index += 1) {
		const current = new Date(`${recentDays[index].dayKey}T00:00:00.000Z`);
		const next = new Date(`${recentDays[index + 1].dayKey}T00:00:00.000Z`);
		const diffDays = Math.round((current.getTime() - next.getTime()) / (24 * 60 * 60 * 1000));
		if (diffDays !== 1) return null;
	}

	return { recentDays };
};
