type MatchContext = 'Standard' | 'Corporate' | 'Night' | 'Buddy' | 'Crisis';

type AvailabilitySlot = {
	dayOfWeek: number;
	startMinute: number;
	endMinute: number;
	isAvailable?: boolean;
};

type ProviderProfileLike = {
	specializations?: string[];
	clinicalCategories?: string[];
	certifications?: string[];
	languages?: string[];
	shiftPreferences?: string[];
	availability?: AvailabilitySlot[] | unknown;
	bio?: string | null;
	averageRating?: number | null;
	yearsOfExperience?: number | null;
};

type ProviderMatchInput = {
	profile: ProviderProfileLike;
	context?: MatchContext;
	requestedConcerns?: string[];
	requestedLanguages?: string[];
	requestedModes?: string[];
	availabilityPrefs?: {
		daysOfWeek: number[];
		timeSlots: Array<{ startMinute: number; endMinute: number }>;
	};
	nextHours?: number;
	qualityStats?: {
		total: number;
		completed: number;
		cancelled: number;
	};
	continuitySessions?: number;
	providerId?: string;
	patientUserId?: string;
	isNriUser?: boolean;
};

type ProviderMatchResult = {
	providerId?: string;
	score: number;
	tier: 'HOT' | 'WARM' | 'COLD';
	matchBand: 'PLATINUM' | 'HOT' | 'WARM' | 'COLD';
	matchChancePct: number;
	breakdown: {
		expertise: number;
		communication: number;
		quality: number;
	};
	contextMultiplier: {
		expertise: number;
		communication: number;
		quality: number;
	};
	matchedConcernCount: number;
	matchedLanguageCount: number;
	matchedModeCount: number;
	matchedAvailabilityCount: number;
};

const NRI_PROVIDER_CERT_MARKER = 'NRI_SESSION_ENABLED';
const NRI_PROVIDER_TAGS = ['nri', 'expat', 'overseas', 'international', 'janmabhoomi'];

const CONTEXT_MULTIPLIERS: Record<MatchContext, { expertise: number; communication: number; quality: number }> = {
	Standard: { expertise: 1.0, communication: 1.0, quality: 1.0 },
	Corporate: { expertise: 1.2, communication: 1.0, quality: 0.8 },
	Night: { expertise: 0.8, communication: 1.5, quality: 0.7 },
	Buddy: { expertise: 0.5, communication: 1.8, quality: 0.7 },
	Crisis: { expertise: 1.0, communication: 1.5, quality: 0.5 },
};

const normalizeToken = (value: unknown): string => String(value || '').trim().toLowerCase().replace(/[^a-z0-9]+/g, ' ');

const normalizeList = (values: unknown): string[] => {
	if (!Array.isArray(values)) return [];
	return values.map((value) => normalizeToken(value)).filter(Boolean);
};

const hasExplicitNriProviderCapability = (profile: ProviderProfileLike): boolean => {
	const certifications = Array.isArray(profile.certifications) ? profile.certifications : [];
	return certifications.some((cert) => String(cert || '').trim().toUpperCase() === NRI_PROVIDER_CERT_MARKER);
};

export const hasNriProviderCapability = (profile: ProviderProfileLike): boolean => {
	if (!profile) return false;
	if (hasExplicitNriProviderCapability(profile)) return true;

	const terms = [
		...(Array.isArray(profile.specializations) ? profile.specializations : []),
		...(Array.isArray(profile.clinicalCategories) ? profile.clinicalCategories : []),
		...(Array.isArray(profile.certifications) ? profile.certifications : []),
		...(Array.isArray(profile.shiftPreferences) ? profile.shiftPreferences : []),
		profile.bio || '',
	].map(normalizeToken).filter(Boolean);

	return terms.some((term) => NRI_PROVIDER_TAGS.some((tag) => term.includes(tag)));
};

const isAvailabilityInNextHours = (slots: AvailabilitySlot[], nextHours: number): boolean => {
	if (!slots.length) return false;
	if (!Number.isFinite(nextHours) || nextHours <= 0) return true;

	const now = new Date();
	const horizon = new Date(now.getTime() + nextHours * 60 * 60 * 1000);

	return slots.some((slot) => {
		if (!slot || (slot.isAvailable ?? true) === false) return false;
		if (!Number.isFinite(slot.startMinute) || !Number.isFinite(slot.endMinute) || slot.endMinute <= slot.startMinute) return false;

		for (let offset = 0; offset <= 14; offset += 1) {
			const candidate = new Date(now);
			candidate.setDate(now.getDate() + offset);

			if (candidate.getDay() !== slot.dayOfWeek) {
				continue;
			}

			const slotStart = new Date(candidate);
			slotStart.setHours(0, 0, 0, 0);
			slotStart.setMinutes(slot.startMinute);

			if (slotStart >= now && slotStart <= horizon) {
				return true;
			}
		}

		return false;
	});
};

const countAvailabilityOverlaps = (slots: AvailabilitySlot[], availabilityPrefs: NonNullable<ProviderMatchInput['availabilityPrefs']>): number => {
	if (!slots.length || !availabilityPrefs.daysOfWeek.length || !availabilityPrefs.timeSlots.length) return 0;

	return availabilityPrefs.timeSlots.filter((slot) =>
		availabilityPrefs.daysOfWeek.some((day) =>
			slots.some((entry) =>
				entry.dayOfWeek === day
				&& (entry.isAvailable ?? true)
				&& Number.isFinite(entry.startMinute)
				&& Number.isFinite(entry.endMinute)
				&& entry.endMinute > entry.startMinute
				&& entry.startMinute < slot.endMinute
				&& slot.startMinute < entry.endMinute,
			),
		),
	).length;
};

const mapTierFromScore = (score: number): 'HOT' | 'WARM' | 'COLD' => {
	if (score >= 70) return 'HOT';
	if (score >= 50) return 'WARM';
	return 'COLD';
};

const mapBandFromScore = (score: number): 'PLATINUM' | 'HOT' | 'WARM' | 'COLD' => {
	if (score >= 85) return 'PLATINUM';
	if (score >= 70) return 'HOT';
	if (score >= 50) return 'WARM';
	return 'COLD';
};

export const scoreProviderMatch = (input: ProviderMatchInput): ProviderMatchResult | null => {
	const context = input.context || 'Standard';
	const contextMultiplier = CONTEXT_MULTIPLIERS[context] || CONTEXT_MULTIPLIERS.Standard;
	const requestedConcerns = normalizeList(input.requestedConcerns);
	const requestedLanguages = normalizeList(input.requestedLanguages);
	const requestedModes = normalizeList(input.requestedModes);
	const profile = input.profile || {};

	const specs = normalizeList([
		...(Array.isArray(profile.specializations) ? profile.specializations : []),
		...(Array.isArray(profile.clinicalCategories) ? profile.clinicalCategories : []),
	]);
	const certs = normalizeList(profile.certifications);
	const langs = normalizeList(profile.languages);

	const concernOverlap = requestedConcerns.length
		? requestedConcerns.filter((concern) => specs.some((spec) => spec.includes(concern) || concern.includes(spec))).length
		: 1;
	if (requestedConcerns.length > 0 && concernOverlap === 0) return null;

	let expertiseScore = 0;
	if (concernOverlap >= 4) expertiseScore = 30;
	else if (concernOverlap >= 3) expertiseScore = 25;
	else if (concernOverlap >= 2) expertiseScore = 18;
	else if (concernOverlap >= 1) expertiseScore = 12;

	let certScore = 0;
	if (certs.length >= 2) certScore = 10;
	else if (certs.length >= 1) certScore = 7;
	const expertise = Math.min(40, expertiseScore + certScore);

	const languageOverlap = requestedLanguages.length
		? requestedLanguages.filter((language) => langs.some((existingLanguage) => existingLanguage.includes(language) || language.includes(existingLanguage))).length
		: 1;
	if (requestedLanguages.length > 0 && languageOverlap === 0) return null;

	let languageScore = 0;
	if (languageOverlap >= 3) languageScore = 20;
	else if (languageOverlap >= 2) languageScore = 16;
	else if (languageOverlap >= 1) languageScore = 12;

	const availabilitySlots = Array.isArray(profile.availability) ? profile.availability as AvailabilitySlot[] : [];
	let availabilityScore = 0;
	let matchedAvailabilityCount = 0;

	if (input.availabilityPrefs) {
		matchedAvailabilityCount = countAvailabilityOverlaps(availabilitySlots, input.availabilityPrefs);
		if (matchedAvailabilityCount === 0) return null;
		if (matchedAvailabilityCount >= 3) availabilityScore = 10;
		else if (matchedAvailabilityCount >= 2) availabilityScore = 8;
		else if (matchedAvailabilityCount >= 1) availabilityScore = 6;
	} else if (typeof input.nextHours === 'number') {
		const hasAvailability = isAvailabilityInNextHours(availabilitySlots, input.nextHours);
		if (!hasAvailability) return null;
		availabilityScore = 6;
		matchedAvailabilityCount = 1;
	}

	const supportedModes = ['video', 'phone', 'chat', 'in_person'];
	const modeOverlap = requestedModes.length
		? requestedModes.filter((mode) => supportedModes.includes(mode)).length
		: 1;
	let modeScore = 0;
	if (modeOverlap >= 2) modeScore = 5;
	else if (modeOverlap >= 1) modeScore = 3;

	const communication = Math.min(35, languageScore + availabilityScore + modeScore);

	const qualityStats = input.qualityStats || { total: 0, completed: 0, cancelled: 0 };
	const totalSessions = Math.max(qualityStats.total, 1);
	const retentionRate = qualityStats.completed / totalSessions;
	const noShowRate = qualityStats.cancelled / totalSessions;
	const rating = Number(profile.averageRating || 0);

	let healthScore = 0;
	if (rating >= 4.5) healthScore += 5;
	else if (rating >= 4.0) healthScore += 3;
	else if (rating > 0) healthScore += 1;

	if (retentionRate >= 0.7) healthScore += 4;
	else if (retentionRate >= 0.5) healthScore += 2;
	else if (retentionRate >= 0.3) healthScore += 1;

	if (noShowRate < 0.03) healthScore += 3;
	else if (noShowRate < 0.05) healthScore += 2;
	else if (noShowRate < 0.1) healthScore += 1;

	healthScore += 3;

	let continuityScore = 0;
	if (Number(input.continuitySessions || 0) >= 5) continuityScore = 10;
	else if (Number(input.continuitySessions || 0) >= 3) continuityScore = 8;
	else if (Number(input.continuitySessions || 0) >= 1) continuityScore = 5;

	const quality = Math.min(25, healthScore + continuityScore);
	const score = Math.round(
		expertise * contextMultiplier.expertise
		+ communication * contextMultiplier.communication
		+ quality * contextMultiplier.quality,
	);

	return {
		providerId: input.providerId,
		score,
		tier: mapTierFromScore(score),
		matchBand: mapBandFromScore(score),
		matchChancePct: Math.max(25, Math.min(95, Math.round(score * 0.8))),
		breakdown: {
			expertise,
			communication,
			quality,
		},
		contextMultiplier,
		matchedConcernCount: concernOverlap,
		matchedLanguageCount: languageOverlap,
		matchedModeCount: modeOverlap,
		matchedAvailabilityCount,
	};
};

export type { MatchContext, AvailabilitySlot, ProviderMatchInput, ProviderMatchResult };