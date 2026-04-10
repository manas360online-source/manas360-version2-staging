import type { Request, Response } from 'express';
import { prisma } from '../config/db';
import { AppError } from '../middleware/error.middleware';
import { logger } from '../utils/logger';

/**
 * GET /admin/invoices/swipe-items
 * List all Swipe item mappings
 */
export const listSwipeItemsController = async (req: Request, res: Response): Promise<void> => {
  const page = Number(req.query.page || 1);
  const limit = Number(req.query.limit || 50);
  const skip = (page - 1) * limit;

  const items = await prisma.swipeItemMapping.findMany({
    skip,
    take: limit,
    orderBy: { createdAt: 'asc' },
  });

  const total = await prisma.swipeItemMapping.count();

  res.status(200).json({
    success: true,
    data: items,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
    },
  });
};

/**
 * POST /admin/invoices/swipe-items/sync
 * Bulk update GetSwipe Item IDs from CSV/JSON
 * Body: { items: [{ serviceId: string, swipeItemId: string }, ...] }
 */
export const syncSwipeItemsController = async (req: Request, res: Response): Promise<void> => {
  const items = Array.isArray(req.body.items) ? req.body.items : [];

  if (items.length === 0) {
    throw new AppError('items array cannot be empty', 422);
  }

  if (items.length > 100) {
    throw new AppError('Maximum 100 items per request', 400);
  }

  const results = {
    successCount: 0,
    failedCount: 0,
    failed: [] as Array<{ serviceId: string; error: string }>,
  };

  for (const item of items) {
    try {
      const serviceId = String(item.serviceId || '').trim();
      const swipeItemId = String(item.swipeItemId || '').trim();

      if (!serviceId || !swipeItemId) {
        results.failedCount += 1;
        results.failed.push({ serviceId, error: 'serviceId and swipeItemId are required' });
        continue;
      }

      const updated = await prisma.swipeItemMapping.updateMany({
        where: { serviceId },
        data: { swipeItemId },
      });

      if (updated.count === 0) {
        results.failedCount += 1;
        results.failed.push({ serviceId, error: 'Mapping not found' });
      } else {
        results.successCount += 1;
      }
    } catch (error) {
      results.failedCount += 1;
      results.failed.push({
        serviceId: String(item.serviceId || ''),
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  logger.info('[Admin] Synced Swipe items', {
    successCount: results.successCount,
    failedCount: results.failedCount,
  });

  res.status(200).json({
    success: true,
    data: results,
    message: `Sync complete: ${results.successCount} succeeded, ${results.failedCount} failed`,
  });
};

/**
 * GET /admin/invoices/generation-stats
 * Dashboard stats for invoice generation (PDF vs SWIPE)
 */
export const getInvoiceGenerationStatsController = async (req: Request, res: Response): Promise<void> => {
  const days = Number(req.query.days || 7);
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const stats = {
    period: {
      days,
      startDate: startDate.toISOString(),
      endDate: new Date().toISOString(),
    },
    byMethod: {
      pdf: 0,
      swipe: 0,
    },
    byStatus: {
      issued: 0,
      paid: 0,
      failed: 0,
      swipeError: 0,
    },
    zohoFlowMetrics: {
      totalInvocations: 0,
      successCount: 0,
      failureCount: 0,
      successRate: 0,
    },
    topErrorCategories: {
      networkErrors: 0,
      timeoutErrors: 0,
      validationErrors: 0,
      otherErrors: 0,
    },
  };

  // Get invoice method distribution
  const methodCounts = await prisma.invoice.groupBy({
    by: ['invoiceMethod'],
    where: { createdAt: { gte: startDate } },
    _count: { id: true },
  });

  for (const count of methodCounts) {
    if (count.invoiceMethod === 'PDF') {
      stats.byMethod.pdf = count._count.id;
    } else if (count.invoiceMethod === 'SWIPE') {
      stats.byMethod.swipe = count._count.id;
    }
  }

  // Get lifecycle status distribution
  const statusCounts = await prisma.invoice.groupBy({
    by: ['lifecycleStatus'],
    where: { createdAt: { gte: startDate } },
    _count: { id: true },
  });

  for (const count of statusCounts) {
    if (count.lifecycleStatus === 'ISSUED') {
      stats.byStatus.issued = count._count.id;
    } else if (count.lifecycleStatus === 'PAID') {
      stats.byStatus.paid = count._count.id;
    } else if (count.lifecycleStatus === 'FAILED') {
      stats.byStatus.failed = count._count.id;
    }
  }

  // Count invoices with errors
  const errorInvoices = await prisma.invoice.count({
    where: {
      createdAt: { gte: startDate },
      status: 'ZOHO_FLOW_ERROR',
    },
  });
  stats.byStatus.swipeError = errorInvoices;

  // Get Zoho Flow invocation stats
  const zohoFlowEvents = await prisma.invoiceEvent.findMany({
    where: {
      eventType: 'ZOHO_FLOW_INVOKED',
      createdAt: { gte: startDate },
    },
    select: { afterState: true },
  });

  stats.zohoFlowMetrics.totalInvocations = zohoFlowEvents.length;

  for (const event of zohoFlowEvents) {
    const state = event.afterState as Record<string, unknown> | null;
    if (state?.zohoFlowSuccess === true) {
      stats.zohoFlowMetrics.successCount += 1;
    } else {
      stats.zohoFlowMetrics.failureCount += 1;
      const error = String(state?.zohoFlowError || 'unknown');
      if (error.includes('timeout') || error.includes('ECONNREFUSED')) {
        stats.topErrorCategories.networkErrors += 1;
      } else if (error.includes('timeout')) {
        stats.topErrorCategories.timeoutErrors += 1;
      } else if (error.includes('validation') || error.includes('required')) {
        stats.topErrorCategories.validationErrors += 1;
      } else {
        stats.topErrorCategories.otherErrors += 1;
      }
    }
  }

  if (stats.zohoFlowMetrics.totalInvocations > 0) {
    stats.zohoFlowMetrics.successRate =
      (stats.zohoFlowMetrics.successCount / stats.zohoFlowMetrics.totalInvocations) * 100;
  }

  res.status(200).json({
    success: true,
    data: stats,
  });
};

/**
 * GET /admin/invoices/swipe-errors
 * List failed Swipe invoice attempts for admin follow-up
 */
export const getSwipeErrorsController = async (req: Request, res: Response): Promise<void> => {
  const page = Number(req.query.page || 1);
  const limit = Number(req.query.limit || 20);
  const skip = (page - 1) * limit;

  const errors = await prisma.invoice.findMany({
    where: {
      status: 'ZOHO_FLOW_ERROR',
    },
    select: {
      id: true,
      invoiceNumber: true,
      customerName: true,
      amountMinor: true,
      metadata: true,
      createdAt: true,
    },
    orderBy: { createdAt: 'desc' },
    skip,
    take: limit,
  });

  const total = await prisma.invoice.count({
    where: { status: 'ZOHO_FLOW_ERROR' },
  });

  res.status(200).json({
    success: true,
    data: errors,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
    },
  });
};
