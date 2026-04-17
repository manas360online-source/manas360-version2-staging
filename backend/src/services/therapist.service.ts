import { prisma } from '../config/db';
import { AppError } from '../middleware/error.middleware';
import { randomUUID } from 'crypto';

const db = prisma as any;

interface TherapistProfileInput {
	bio: string;
	specializations: string[];
	languages: string[];
	yearsOfExperience: number;
	consultationFee: number;
	availabilitySlots: Array<{
		dayOfWeek: number;
		startMinute: number;
		endMinute: number;
		isAvailable: boolean;
	}>;
}

interface TherapistNriPoolInput {
	nriPoolCertified: boolean;
	nriTimezoneShifts: string[];
}

const ALLOWED_NRI_SHIFTS = new Set([
	'shift_a_us_east',
	'shift_b_us_west',
	'shift_c_uk',
	'shift_d_au_sg',
	'shift_e_uae',
]);

const normalizeArray = (values: string[]): string[] => {
	const normalized = values
		.map((value) => value.trim())
		.filter((value) => value.length > 0);

	return Array.from(new Set(normalized));
};

const minuteToTime = (minute: number): string => {
	const hours = Math.floor(minute / 60)
		.toString()
		.padStart(2, '0');
	const mins = (minute % 60).toString().padStart(2, '0');

	return `${hours}:${mins}`;
};

const assertTherapistUser = async (userId: string) => {
	const user = await db.user.findUnique({
		where: { id: userId },
		select: { id: true, role: true, firstName: true, lastName: true },
	});

	if (!user) {
		throw new AppError('User not found', 404);
	}

	if (String(user.role) !== 'THERAPIST') {
		throw new AppError('Therapist role required', 403);
	}

	return user;
};

const toSafeProfile = (profile: {
	id: string;
	displayName: string;
	bio?: string | null;
	specializations: string[];
	languages: string[];
	yearsOfExperience: number;
	consultationFee: number;
	availability?: Array<{
		dayOfWeek: number;
		startMinute: number;
		endMinute: number;
		isAvailable: boolean;
	}>; 
	averageRating: number;
	nriPoolCertified?: boolean | null;
	nriPoolCertifiedAt?: Date | null;
	nriTimezoneShifts?: string[];
	createdAt: Date;
	updatedAt: Date;
}) => ({
	id: profile.id,
	displayName: profile.displayName,
	bio: profile.bio ?? null,
	specializations: profile.specializations || [],
	languages: profile.languages || [],
	yearsOfExperience: profile.yearsOfExperience || 0,
	consultationFee: profile.consultationFee || 0,
	availabilitySlots: (profile.availability || []).map((slot) => ({
		dayOfWeek: slot.dayOfWeek,
		startTime: minuteToTime(slot.startMinute),
		endTime: minuteToTime(slot.endMinute),
		isAvailable: slot.isAvailable,
	})),
	averageRating: profile.averageRating || 0,
	nriPoolCertified: Boolean(profile.nriPoolCertified),
	nriPoolCertifiedAt: profile.nriPoolCertifiedAt ?? null,
	nriTimezoneShifts: Array.isArray(profile.nriTimezoneShifts) ? profile.nriTimezoneShifts : [],
	createdAt: profile.createdAt,
	updatedAt: profile.updatedAt,
});

export const createTherapistProfile = async (userId: string, input: TherapistProfileInput) => {
	await assertTherapistUser(userId);
	const user = await db.user.findUnique({ where: { id: userId }, select: { id: true, name: true, firstName: true, lastName: true, createdAt: true, updatedAt: true } });
	if (!user) throw new AppError('User not found', 404);

	const displayName = String(user.name || `${user.firstName} ${user.lastName}`.trim()).trim();

	const data = {
		userId: user.id,
		displayName,
		bio: input.bio || null,
		specializations: normalizeArray(input.specializations || []),
		languages: normalizeArray(input.languages || []),
		yearsOfExperience: Number(input.yearsOfExperience || 0),
		consultationFee: Number(input.consultationFee || 0),
		availability: Array.isArray(input.availabilitySlots) ? input.availabilitySlots : [],
		averageRating: 0,
	} as any;

	const profileRows = await db.$queryRawUnsafe(
		`INSERT INTO "therapist_profiles"
			("id", "userId", "displayName", "bio", "specializations", "languages", "yearsOfExperience", "consultationFee", "availability", "averageRating", "isDeleted", "createdAt", "updatedAt")
		 VALUES
			($1, $2, $3, $4, $5::text[], $6::text[], $7, $8, $9::jsonb, $10, false, NOW(), NOW())
		 ON CONFLICT ("userId") DO UPDATE SET
			"displayName" = EXCLUDED."displayName",
			"bio" = EXCLUDED."bio",
			"specializations" = EXCLUDED."specializations",
			"languages" = EXCLUDED."languages",
			"yearsOfExperience" = EXCLUDED."yearsOfExperience",
			"consultationFee" = EXCLUDED."consultationFee",
			"availability" = EXCLUDED."availability",
			"updatedAt" = NOW()
		 RETURNING "id", "displayName", "bio", "specializations", "languages", "yearsOfExperience", "consultationFee", "availability", "averageRating", "createdAt", "updatedAt"`,
		randomUUID(),
		String(user.id),
		String(displayName),
		data.bio,
		Array.isArray(data.specializations) ? data.specializations : [],
		Array.isArray(data.languages) ? data.languages : [],
		Number(data.yearsOfExperience || 0),
		Number(data.consultationFee || 0),
		JSON.stringify(Array.isArray(data.availability) ? data.availability : []),
		0,
	);

	const profile = Array.isArray(profileRows) ? profileRows[0] : null;
	if (!profile) throw new AppError('Unable to persist therapist profile', 500);

	return toSafeProfile(profile as any);
};

export const getMyTherapistProfile = async (userId: string) => {
	await assertTherapistUser(userId);
	let profile: any = null;
	try {
		profile = await db.therapistProfile.findUnique({ where: { userId },
			select: {
				id: true,
				displayName: true,
				bio: true,
				specializations: true,
				languages: true,
				yearsOfExperience: true,
				consultationFee: true,
				availability: true,
				averageRating: true,
				nriPoolCertified: true,
				nriPoolCertifiedAt: true,
				nriTimezoneShifts: true,
				createdAt: true,
				updatedAt: true,
			},
		});
	} catch {
		// Older environments may miss optional columns; fall back to composed profile.
		profile = null;
	}

	if (!profile) {
		// Return a composed default if no persisted profile exists yet
		const user = await db.user.findUnique({ where: { id: userId }, select: { id: true, name: true, firstName: true, lastName: true, createdAt: true, updatedAt: true } });
		if (!user) throw new AppError('User not found', 404);

		const displayName = String(user.name || `${user.firstName} ${user.lastName}`.trim()).trim();

		const composed = {
			id: user.id,
			displayName,
			bio: null,
			specializations: [],
			languages: [],
			yearsOfExperience: 0,
			consultationFee: 0,
			availability: [],
			averageRating: 0,
			nriPoolCertified: false,
			nriPoolCertifiedAt: null,
			nriTimezoneShifts: [],
			createdAt: user.createdAt,
			updatedAt: user.updatedAt,
		} as any;

		return toSafeProfile(composed);
	}

	return toSafeProfile(profile as any);
};

export const updateMyTherapistNriPool = async (userId: string, input: TherapistNriPoolInput) => {
	await assertTherapistUser(userId);

	const normalizedShifts = Array.from(
		new Set(
			(input.nriTimezoneShifts || [])
				.map((value) => String(value || '').trim().toLowerCase())
				.filter((value) => value.length > 0),
		),
	);

	for (const shift of normalizedShifts) {
		if (!ALLOWED_NRI_SHIFTS.has(shift)) {
			throw new AppError(`Invalid NRI timezone shift: ${shift}`, 422);
		}
	}

	if (input.nriPoolCertified && normalizedShifts.length === 0) {
		throw new AppError('At least one NRI timezone shift is required when enabling NRI pool', 422);
	}

	const rows = await db.$queryRawUnsafe(
		`UPDATE "therapist_profiles"
		 SET "nri_pool_certified" = $2,
		     "nri_pool_certified_at" = CASE WHEN $2 THEN NOW() ELSE NULL END,
		     "nri_timezone_shifts" = $3::text[],
		     "updatedAt" = NOW()
		 WHERE "userId" = $1
		 RETURNING "id", "displayName", "bio", "specializations", "languages", "yearsOfExperience", "consultationFee", "availability", "averageRating", "nri_pool_certified" AS "nriPoolCertified", "nri_pool_certified_at" AS "nriPoolCertifiedAt", "nri_timezone_shifts" AS "nriTimezoneShifts", "createdAt", "updatedAt"`,
		String(userId),
		Boolean(input.nriPoolCertified),
		normalizedShifts,
	);

	const updated = Array.isArray(rows) ? rows[0] : null;
	if (!updated) {
		throw new AppError('Therapist profile not found', 404);
	}

	return toSafeProfile(updated as any);
};

export const uploadMyTherapistDocument = async (
	userId: string,
	payload: { type: 'license' | 'degree' | 'certificate' },
	file: { buffer: Buffer; mimetype: string; size: number },
) => {
	await assertTherapistUser(userId);
	void payload;
	void file;
	throw new AppError('Therapist document upload is unavailable until therapist document Prisma models are introduced', 501);
};
