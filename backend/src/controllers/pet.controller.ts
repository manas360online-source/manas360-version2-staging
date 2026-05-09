import type { Request, Response } from 'express';
import { prisma } from '../config/db';
import { redis } from '../config/redis';
import { AppError } from '../middleware/error.middleware';
import { sendSuccess } from '../utils/response';

type PetType = 'koi' | 'pup' | 'owl';
type CompanionMood = 'CALMING' | 'PLAYFUL' | 'FOCUSED';

const DEFAULT_SELECTED_PET: PetType = 'koi';
const PET_STATE_CACHE_TTL_SECONDS = 120;

const buildPetStateCacheKey = (userId: string): string => `pet:state:${userId}`;

const getAuthUserId = (req: Request): string => {
  const userId = req.auth?.userId;
  if (!userId) {
    throw new AppError('Authentication required', 401);
  }
  return userId;
};

const normalizePetType = (value: unknown): PetType => {
  const normalized = String(value || '').trim().toLowerCase();
  if (normalized === 'koi' || normalized === 'pup' || normalized === 'owl') {
    return normalized;
  }
  return DEFAULT_SELECTED_PET;
};

const clampVitality = (value: unknown): number => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return 0;
  return Math.max(0, Math.min(100, Math.round(parsed)));
};

const normalizeUnlockedItems = (value: unknown): string[] => {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => String(item || '').trim())
    .filter((item) => item.length > 0 && item.length <= 120)
    .slice(0, 20);
};

const deriveCompanionMood = (
  selectedPet: PetType,
  latestDailyCheckIns: Array<{ mood: number | null; stressLevel: number | null }>,
  latestMoodValue: number | null,
): CompanionMood => {
  const hasHighStress = latestDailyCheckIns.some((row) => Number(row.stressLevel || 0) >= 4);
  const hasLowMood = latestDailyCheckIns.some((row) => Number(row.mood || 0) <= 2) || Number(latestMoodValue || 0) <= 2;

  if (hasHighStress || hasLowMood) return 'CALMING';
  if (selectedPet === 'owl') return 'FOCUSED';
  return 'PLAYFUL';
};

export const getMyPetStateController = async (req: Request, res: Response): Promise<void> => {
  const userId = getAuthUserId(req);
  const cacheKey = buildPetStateCacheKey(userId);

  try {
    const cached = await redis.get(cacheKey);
    if (cached) {
      const parsed = JSON.parse(cached) as {
        selectedPet: PetType;
        vitality: number;
        unlockedItems: string[];
        isPremium: boolean;
        companionMood: CompanionMood;
        nudges: Array<{ key: string; label: string; done: boolean }>;
      };

      sendSuccess(res, parsed, 'Pet state fetched');
      return;
    }
  } catch {
    // Continue with DB query when cache read/parse fails.
  }

  const [petRowsRaw, todayCheckInsRaw, moodRowsRaw] = await Promise.all([
    prisma.$queryRawUnsafe('SELECT selected_pet AS "selectedPet", vitality, unlocked_items AS "unlockedItems", is_premium AS "isPremium", companion_mood AS "companionMood" FROM user_pets WHERE user_id = $1 LIMIT 1', userId),
    prisma.$queryRawUnsafe('SELECT mood, stress_level AS "stressLevel", sleep, context FROM daily_checkins WHERE patient_id = $1 AND date::date = CURRENT_DATE', userId),
    prisma.$queryRawUnsafe('SELECT mood_value AS "moodValue" FROM mood_logs WHERE user_id = $1 ORDER BY logged_at DESC LIMIT 1', userId),
  ]);

  const petRows = petRowsRaw as Array<{
    selectedPet: string;
    vitality: number;
    unlockedItems: unknown;
    isPremium: boolean;
    companionMood: string | null;
  }>;
  const todayCheckIns = todayCheckInsRaw as Array<{ mood: number | null; stressLevel: number | null; sleep: number | null; context: string[] | null }>;
  const moodRows = moodRowsRaw as Array<{ moodValue: number | null }>;

  const existing = petRows[0];
  const selectedPet = normalizePetType(existing?.selectedPet);
  const vitality = clampVitality(existing?.vitality ?? 24);
  const unlockedItems = normalizeUnlockedItems(existing?.unlockedItems);
  const isPremium = Boolean(existing?.isPremium);
  const companionMood = deriveCompanionMood(selectedPet, todayCheckIns, moodRows[0]?.moodValue ?? null);

  const medsDone = todayCheckIns.some((row) =>
    Array.isArray(row.context) && row.context.some((tag) => {
      const normalizedTag = String(tag || '').toLowerCase();
      return normalizedTag.includes('med') || normalizedTag.includes('medicine');
    }),
  );

  const payload = {
    selectedPet,
    vitality,
    unlockedItems,
    isPremium,
    companionMood,
    nudges: [
      { key: 'mood', label: 'Mood Check-in', done: todayCheckIns.some((row) => row.mood !== null) },
      { key: 'sleep', label: 'Sleep Check-in', done: todayCheckIns.some((row) => row.sleep !== null) },
      { key: 'meds', label: 'Meds Check-in', done: medsDone },
    ],
  };

  try {
    await redis.set(cacheKey, JSON.stringify(payload), PET_STATE_CACHE_TTL_SECONDS);
  } catch {
    // Best-effort cache write; response should not fail.
  }

  sendSuccess(res, payload, 'Pet state fetched');
};

export const upsertMyPetStateController = async (req: Request, res: Response): Promise<void> => {
  const userId = getAuthUserId(req);
  const cacheKey = buildPetStateCacheKey(userId);
  const selectedPet = normalizePetType(req.body?.selectedPet);
  const vitality = clampVitality(req.body?.vitality);
  const unlockedItems = normalizeUnlockedItems(req.body?.unlockedItems);
  const isPremium = Boolean(req.body?.isPremium);

  await prisma.$executeRawUnsafe(
    `
      INSERT INTO user_pets (user_id, selected_pet, vitality, unlocked_items, is_premium, companion_mood, created_at, updated_at)
      VALUES ($1, $2, $3, $4::jsonb, $5, $6, NOW(), NOW())
      ON CONFLICT (user_id)
      DO UPDATE SET
        selected_pet = EXCLUDED.selected_pet,
        vitality = EXCLUDED.vitality,
        unlocked_items = EXCLUDED.unlocked_items,
        is_premium = EXCLUDED.is_premium,
        companion_mood = EXCLUDED.companion_mood,
        updated_at = NOW()
    `,
    userId,
    selectedPet,
    vitality,
    JSON.stringify(unlockedItems),
    isPremium,
    null,
  );

  try {
    await redis.del(cacheKey);
  } catch {
    // Best-effort invalidation only.
  }

  sendSuccess(
    res,
    {
      selectedPet,
      vitality,
      unlockedItems,
      isPremium,
    },
    'Pet state updated',
  );
};
