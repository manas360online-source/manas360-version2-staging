"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.uploadMyTherapistDocument = exports.getMyTherapistProfile = exports.createTherapistProfile = void 0;
const db_1 = require("../config/db");
const error_middleware_1 = require("../middleware/error.middleware");
const db = db_1.prisma;
const normalizeArray = (values) => {
    const normalized = values
        .map((value) => value.trim())
        .filter((value) => value.length > 0);
    return Array.from(new Set(normalized));
};
const minuteToTime = (minute) => {
    const hours = Math.floor(minute / 60)
        .toString()
        .padStart(2, '0');
    const mins = (minute % 60).toString().padStart(2, '0');
    return `${hours}:${mins}`;
};
const assertTherapistUser = async (userId) => {
    const user = await db.user.findUnique({
        where: { id: userId },
        select: { id: true, role: true, firstName: true, lastName: true },
    });
    if (!user) {
        throw new error_middleware_1.AppError('User not found', 404);
    }
    if (String(user.role) !== 'THERAPIST') {
        throw new error_middleware_1.AppError('Therapist role required', 403);
    }
    return user;
};
const toSafeProfile = (profile) => ({
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
const createTherapistProfile = async (userId, input) => {
    await assertTherapistUser(userId);
    const user = await db.user.findUnique({ where: { id: userId }, select: { id: true, name: true, firstName: true, lastName: true, createdAt: true, updatedAt: true } });
    if (!user)
        throw new error_middleware_1.AppError('User not found', 404);
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
    };
    const profile = await db.therapistProfile.upsert({
        where: { userId: user.id },
        update: data,
        create: data,
    });
    return toSafeProfile(profile);
};
exports.createTherapistProfile = createTherapistProfile;
const getMyTherapistProfile = async (userId) => {
    await assertTherapistUser(userId);
    const profile = await db.therapistProfile.findUnique({ where: { userId },
        include: { user: { select: { createdAt: true, updatedAt: true } } },
    });
    if (!profile) {
        // Return a composed default if no persisted profile exists yet
        const user = await db.user.findUnique({ where: { id: userId }, select: { id: true, name: true, firstName: true, lastName: true, createdAt: true, updatedAt: true } });
        if (!user)
            throw new error_middleware_1.AppError('User not found', 404);
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
        };
        return toSafeProfile(composed);
    }
    return toSafeProfile(profile);
};
exports.getMyTherapistProfile = getMyTherapistProfile;
const uploadMyTherapistDocument = async (userId, payload, file) => {
    await assertTherapistUser(userId);
    void payload;
    void file;
    throw new error_middleware_1.AppError('Therapist document upload is unavailable until therapist document Prisma models are introduced', 501);
};
exports.uploadMyTherapistDocument = uploadMyTherapistDocument;
