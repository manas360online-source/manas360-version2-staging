import type { Request, Response } from 'express';
import { prisma } from '../config/db';
import { redis } from '../config/redis';
import { io } from '../socket'; // Using exported io from socket/index.ts
import { asyncHandler } from '../middleware/validate.middleware';
import { sendSuccess } from '../utils/response';
import { logger } from '../utils/logger';

/**
 * List all offers.
 */
export const getOffersController = asyncHandler(async (req: Request, res: Response) => {
  const offers = await prisma.marqueeOffer.findMany({
    where: { isDeleted: false },
    orderBy: { sortOrder: 'asc' }
  });
  sendSuccess(res, offers, 'Offers fetched successfully.');
});

/**
 * Create a new offer.
 */
export const createOfferController = asyncHandler(async (req: Request, res: Response) => {
  const { text, linkUrl, isActive, sortOrder } = req.body;
  
  const offer = await prisma.marqueeOffer.create({
    data: { text, linkUrl, isActive, sortOrder: sortOrder || 0 }
  });

  sendSuccess(res, offer, 'Offer created.');
});

/**
 * Update an existing offer.
 */
export const updateOfferController = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const data = req.body;

  const offer = await prisma.marqueeOffer.update({
    where: { id },
    data
  });

  sendSuccess(res, offer, 'Offer updated.');
});

/**
 * Reorder offers.
 */
export const reorderOffersController = asyncHandler(async (req: Request, res: Response) => {
  const { ids } = req.body; // Array of IDs in the desired order

  await prisma.$transaction(
    ids.map((id: string, index: number) => 
      prisma.marqueeOffer.update({
        where: { id },
        data: { sortOrder: index }
      })
    )
  );

  sendSuccess(res, null, 'Offers reordered.');
});

/**
 * Delete an offer (soft delete).
 */
export const deleteOfferController = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  await prisma.marqueeOffer.update({
    where: { id },
    data: { isDeleted: true }
  });

  sendSuccess(res, null, 'Offer deleted.');
});

/**
 * Publish offers to live site.
 */
export const publishOffersController = asyncHandler(async (req: Request, res: Response) => {
  const activeOffers = await prisma.marqueeOffer.findMany({
    where: { isActive: true, isDeleted: false },
    orderBy: { sortOrder: 'asc' }
  });

  // Push to Redis
  await redis.set('marquee_offers_live', JSON.stringify(activeOffers));

  // Log Audit (Assuming user id exists on req.user)
  const userId = (req as any).user?.id || 'system';
  logger.info(`[Audit] Offers published by ${userId}`);

  // Emit to admin-room for real-time dashboard updates
  if (io) {
    io.to('admin-room').emit('offer-published', { count: activeOffers.length });
  }

  sendSuccess(res, { publishedCount: activeOffers.length }, 'Offers published live.');
});
