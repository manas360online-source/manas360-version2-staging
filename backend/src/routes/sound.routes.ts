import { Router } from 'express';
import { env } from '../config/env';
import { requireAuth } from '../middleware/auth.middleware';
import { AppError } from '../middleware/error.middleware';
import { asyncHandler } from '../middleware/validate.middleware';
import { sendSuccess } from '../utils/response';

type FreesoundResult = {
  id: number;
  name: string;
  duration: number;
  license: string;
  tags?: string[];
  previews?: {
    'preview-hq-mp3'?: string;
    'preview-lq-mp3'?: string;
  };
};

const router = Router();

const isCc0License = (license: string): boolean => {
  const normalized = String(license || '').toLowerCase();
  return normalized.includes('cc0') || normalized.includes('creativecommons.org/publicdomain/zero');
};

const isCreativeCommonsLicense = (license: string): boolean => {
  const normalized = String(license || '').toLowerCase();
  return normalized.includes('creativecommons.org/licenses/') || isCc0License(normalized);
};

router.get(
  '/search',
  requireAuth,
  asyncHandler(async (req, res) => {
    const q = String(req.query.q || '').trim();
    const minDuration = Number(req.query.minDuration || 300);
    const limit = Number(req.query.limit || 30);
    const topicsRaw = String(req.query.topics || 'raga therapy,binaural,nature');

    if (!q) {
      throw new AppError('q is required', 422);
    }

    if (!env.freesoundApiKey) {
      sendSuccess(res, [], 'Freesound API key is not configured on server');
      return;
    }

    const topics = topicsRaw
      .split(',')
      .map((entry) => entry.trim())
      .filter(Boolean)
      .slice(0, 5);

    const requests = topics.map(async (topic) => {
      const query = `${q} ${topic}`.trim();
      const filter = `duration:[${Math.max(300, minDuration)} TO *]`;
      const url = `https://freesound.org/apiv2/search/text/?token=${encodeURIComponent(env.freesoundApiKey || '')}&query=${encodeURIComponent(query)}&filter=${encodeURIComponent(filter)}&fields=id,name,duration,license,tags,previews&page_size=12`;

      const response = await fetch(url);
      if (!response.ok) return [] as FreesoundResult[];
      const payload = await response.json();
      return (payload?.results || []) as FreesoundResult[];
    });

    const resultGroups = await Promise.all(requests);
    const merged = resultGroups.flat();

    const cc0Only = merged.filter((item) => {
      const license = String(item.license || '').toLowerCase();
      return isCc0License(license) && Number(item.duration || 0) >= Math.max(300, minDuration);
    });

    const unique = new Map<string, {
      id: string;
      title: string;
      durationSeconds: number;
      audioUrl: string;
      license: string;
      tags: string[];
    }>();

    cc0Only.forEach((item) => {
      const audioUrl = item.previews?.['preview-hq-mp3'] || item.previews?.['preview-lq-mp3'];
      if (!audioUrl) return;
      const id = `freesound_${item.id}`;
      if (unique.has(id)) return;

      unique.set(id, {
        id,
        title: item.name || `Freesound Track ${item.id}`,
        durationSeconds: Number(item.duration || 300),
        audioUrl,
        license: item.license,
        tags: Array.isArray(item.tags) ? item.tags : [],
      });
    });

    sendSuccess(res, [...unique.values()].slice(0, Math.max(1, Math.min(50, limit))), 'Sound search fetched');
  }),
);

export default router;
