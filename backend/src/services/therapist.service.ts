import { prisma } from '../config/db';
import { AppError } from '../middleware/error.middleware';

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

	const profile = await db.therapistProfile.upsert({
		where: { userId: user.id },
		update: data,
		create: data,
	});

	return toSafeProfile(profile as any);
};

export const getMyTherapistProfile = async (userId: string) => {
	await assertTherapistUser(userId);
	const profile = await db.therapistProfile.findUnique({ where: { userId },
		include: { user: { select: { createdAt: true, updatedAt: true } } },
	});

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
			createdAt: user.createdAt,
			updatedAt: user.updatedAt,
		} as any;

		return toSafeProfile(composed);
	}

	return toSafeProfile(profile as any);
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
