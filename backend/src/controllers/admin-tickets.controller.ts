import type { Request, Response } from 'express';
import { zohoDesk } from '../services/zohoDesk.service';
import { asyncHandler } from '../middleware/validate.middleware';
import { sendSuccess } from '../utils/response';
import { AppError } from '../middleware/error.middleware';

/**
 * List tickets from Zoho Desk.
 */
export const getZohoTicketsController = asyncHandler(async (req: Request, res: Response) => {
  const { department, status, priority, limit } = req.query as any;

  const tickets = await zohoDesk.listTickets({
    department: department !== 'all' ? department : undefined,
    status: status || 'Open',
    priority,
    limit: limit ? Number(limit) : 50
  });

  const formattedTickets = tickets.data.map((t: any) => ({
    id: t.ticketNumber,
    subject: t.subject,
    status: t.status,
    priority: t.priority,
    department: t.departmentId,
    blueprint_state: t.customFields?.cf_blueprint_state || 'Draft',
    assignee: t.assignee?.name || 'Unassigned',
    created: t.createdTime
  }));

  sendSuccess(res, { tickets: formattedTickets, count: formattedTickets.length }, 'Zoho Desk tickets fetched.');
});

/**
 * Add a comment to a Zoho ticket.
 */
export const addZohoCommentController = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const { content, isPublic } = req.body;

  if (!content) {
    throw new AppError('Comment content is required.', 422);
  }

  const result = await zohoDesk.addComment(id as string, content, !!isPublic);
  sendSuccess(res, result, 'Comment added to ticket.');
});

/**
 * Get blueprint status summary.
 */
export const getBlueprintStatusController = asyncHandler(async (req: Request, res: Response) => {
  const status = await zohoDesk.getBlueprintStatus();
  sendSuccess(res, status, 'Blueprint status summary fetched.');
});
