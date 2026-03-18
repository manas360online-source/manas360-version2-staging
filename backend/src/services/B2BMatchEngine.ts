type Coordinates = {
	latitude: number;
	longitude: number;
};

type LanguageProficiency = 'native' | 'professional' | 'conversational';

type AvailabilitySlot = {
	dayOfWeek: number;
	startMinute: number;
	endMinute: number;
	isAvailable?: boolean;
};

type AvailabilityPrefs = {
	daysOfWeek: number[];
	timeSlots: Array<{ startMinute: number; endMinute: number }>;
};

export interface B2BTherapistProfile {
	certifications?: string[];
	certificationAwardedAt?: Record<string, string | Date>;
	languages?: string[];
	languageProficiencies?: Record<string, LanguageProficiency>;
	rating?: number;
	ratingSignals?: {
		recentAverage?: number;
		historicalAverage?: number;
		recentWeight?: number;
	};
	location?: Partial<Coordinates> | null;
	availability?: AvailabilitySlot[];
}

export interface B2BInstitutionalEngagement {
	requiredCert?: string | null;
	languages?: string[];
	requiredLanguageProficiency?: LanguageProficiency;
	location?: Partial<Coordinates> | null;
	deliveryMode?: string | null;
	isRemote?: boolean;
	cityTrafficIndex?: number;
	targetStartMinute?: number;
	durationMinutes?: number;
	availabilityPrefs?: AvailabilityPrefs;
	availabilityOverlap?: boolean;
}

export interface B2BScoreBreakdown {
	certification: number;
	certificationBonus: number;
	language: number;
	proximity: number;
	rating: number;
	availability: number;
	total: number;
	distanceKm: number | null;
	travelMinutes: number | null;
}

const MAX = {
	certification: 35,
	language: 25,
	proximity: 20,
	rating: 15,
	availability: 5,
} as const;

const clamp = (value: number, min: number, max: number): number => Math.min(max, Math.max(min, value));

const normalize = (value: string): string => value.trim().toLowerCase();

const proficiencyRank: Record<LanguageProficiency, number> = {
	native: 3,
	professional: 2,
	conversational: 1,
};

const proficiencyMultiplier: Record<LanguageProficiency, number> = {
	native: 1,
	professional: 0.85,
	conversational: 0.6,
};

const CERTIFIED_PLUS_BONUS = 5;

const parseDate = (value: string | Date | undefined): Date | null => {
	if (!value) return null;
	const parsed = value instanceof Date ? value : new Date(value);
	return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const toRadians = (degrees: number): number => (degrees * Math.PI) / 180;

const getDistanceKm = (a: Coordinates, b: Coordinates): number => {
	const earthRadiusKm = 6371;
	const dLat = toRadians(b.latitude - a.latitude);
	const dLon = toRadians(b.longitude - a.longitude);
	const lat1 = toRadians(a.latitude);
	const lat2 = toRadians(b.latitude);

	const haversine =
		Math.sin(dLat / 2) * Math.sin(dLat / 2) +
		Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
	const c = 2 * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine));
	return earthRadiusKm * c;
};

const isTimeOverlap = (start1: number, end1: number, start2: number, end2: number): boolean =>
	start1 < end2 && end1 > start2;

const hasAvailabilityOverlap = (
	therapistSlots: AvailabilitySlot[] | undefined,
	prefs: AvailabilityPrefs | undefined,
): boolean => {
	if (!therapistSlots || therapistSlots.length === 0 || !prefs) {
		return false;
	}

	return prefs.daysOfWeek.some((requestedDay) =>
		prefs.timeSlots.some((requestedSlot) =>
			therapistSlots.some(
				(slot) =>
					slot.dayOfWeek === requestedDay &&
					(slot.isAvailable ?? true) &&
					isTimeOverlap(
						requestedSlot.startMinute,
						requestedSlot.endMinute,
						slot.startMinute,
						slot.endMinute,
					),
			),
		),
	);
};

const hasBufferGap = (
	therapistSlots: AvailabilitySlot[] | undefined,
	prefs: AvailabilityPrefs | undefined,
	engagement: B2BInstitutionalEngagement,
): boolean => {
	if (!therapistSlots || therapistSlots.length === 0 || !prefs) {
		return false;
	}

	const duration = Math.max(1, Number(engagement.durationMinutes ?? 60));

	return prefs.daysOfWeek.some((requestedDay) =>
		prefs.timeSlots.some((requestedSlot) => {
			const requestedStart =
				typeof engagement.targetStartMinute === 'number'
					? engagement.targetStartMinute
					: requestedSlot.startMinute;
			const requestedEnd = Math.max(requestedSlot.endMinute, requestedStart + duration);

			return therapistSlots.some((slot) => {
				if (slot.dayOfWeek !== requestedDay || !(slot.isAvailable ?? true)) {
					return false;
				}

				const hasOverlap = isTimeOverlap(
					requestedStart,
					requestedEnd,
					slot.startMinute,
					slot.endMinute,
				);

				if (!hasOverlap) {
					return false;
				}

				return slot.startMinute <= requestedStart - 30 && slot.endMinute >= requestedEnd + 30;
			});
		}),
	);
};

const isRemoteEngagement = (engagement: B2BInstitutionalEngagement): boolean => {
	if (engagement.isRemote) {
		return true;
	}

	const mode = String(engagement.deliveryMode ?? '').trim().toLowerCase();
	return mode === 'remote' || mode === 'virtual' || mode === 'online';
};

export const calculateB2BScore = (
	therapist: B2BTherapistProfile,
	engagement: B2BInstitutionalEngagement,
): B2BScoreBreakdown => {
	const therapistCertifications = (therapist.certifications ?? []).map(normalize);
	const requiredCert = engagement.requiredCert ? normalize(engagement.requiredCert) : '';
	const certificationScore = requiredCert && therapistCertifications.includes(requiredCert) ? MAX.certification : 0;
	let certificationBonus = 0;
	if (certificationScore > 0 && therapist.certificationAwardedAt && requiredCert) {
		const awardedAt = parseDate(therapist.certificationAwardedAt[requiredCert]);
		if (awardedAt) {
			const twoYearsAgo = new Date();
			twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 2);
			if (awardedAt <= twoYearsAgo) {
				certificationBonus = CERTIFIED_PLUS_BONUS;
			}
		}
	}

	const therapistLanguages = new Set((therapist.languages ?? []).map(normalize));
	const targetProficiency: LanguageProficiency = engagement.requiredLanguageProficiency ?? 'conversational';
	let languageScore = 0;
	for (const language of engagement.languages ?? []) {
		const key = normalize(language);
		if (!therapistLanguages.has(key)) {
			continue;
		}

		const therapistProficiency = therapist.languageProficiencies?.[key] ?? 'conversational';
		if (proficiencyRank[therapistProficiency] < proficiencyRank[targetProficiency]) {
			continue;
		}

		languageScore = Math.max(languageScore, MAX.language * proficiencyMultiplier[therapistProficiency]);
	}
	languageScore = Number(languageScore.toFixed(2));

	let proximityScore = 0;
	let distanceKm: number | null = null;
	let travelMinutes: number | null = null;
	const therapistLocation = therapist.location;
	const engagementLocation = engagement.location;
	const hasCoordinates =
		typeof therapistLocation?.latitude === 'number' &&
		typeof therapistLocation?.longitude === 'number' &&
		typeof engagementLocation?.latitude === 'number' &&
		typeof engagementLocation?.longitude === 'number';

	if (!isRemoteEngagement(engagement) && hasCoordinates) {
		distanceKm = getDistanceKm(
			{ latitude: therapistLocation!.latitude as number, longitude: therapistLocation!.longitude as number },
			{ latitude: engagementLocation!.latitude as number, longitude: engagementLocation!.longitude as number },
		);

		const trafficIndex = clamp(Number(engagement.cityTrafficIndex ?? 1), 0.8, 3);
		travelMinutes = (distanceKm / 30) * 60 * trafficIndex;

		if (distanceKm < 10) {
			proximityScore = MAX.proximity;
		} else if (distanceKm <= 25) {
			proximityScore = 10;
		}

		if (travelMinutes > 60) {
			proximityScore = Math.max(0, proximityScore - 8);
		} else if (travelMinutes > 30) {
			proximityScore = Math.max(0, proximityScore - 4);
		}
	}

	const recentAverage = Number(therapist.ratingSignals?.recentAverage ?? therapist.rating ?? 0);
	const historicalAverage = Number(therapist.ratingSignals?.historicalAverage ?? therapist.rating ?? 0);
	const recentWeight = clamp(Number(therapist.ratingSignals?.recentWeight ?? 0.7), 0.5, 0.9);
	const decayedRating = clamp(
		recentAverage * recentWeight + historicalAverage * (1 - recentWeight),
		0,
		5,
	);
	const ratingScore = (decayedRating / 5) * MAX.rating;

	const overlap =
		typeof engagement.availabilityOverlap === 'boolean'
			? engagement.availabilityOverlap
			: hasAvailabilityOverlap(therapist.availability, engagement.availabilityPrefs);
	const bufferGap = hasBufferGap(therapist.availability, engagement.availabilityPrefs, engagement);
	const availabilityScore = overlap ? (bufferGap ? MAX.availability : 2) : 0;

	const total = Math.round(
		clamp(
			certificationScore + certificationBonus + languageScore + proximityScore + ratingScore + availabilityScore,
			0,
			100,
		),
	);

	return {
		certification: certificationScore,
		certificationBonus,
		language: languageScore,
		proximity: proximityScore,
		rating: Number(ratingScore.toFixed(2)),
		availability: availabilityScore,
		total,
		distanceKm: distanceKm === null ? null : Number(distanceKm.toFixed(2)),
		travelMinutes: travelMinutes === null ? null : Number(travelMinutes.toFixed(1)),
	};
};
