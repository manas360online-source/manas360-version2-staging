import { Request, Response } from 'express';
import { AppError } from '../middleware/error.middleware';
import { exportQueue } from '../jobs/export.worker';

const getAuthUserId = (req: Request): string => {
  const userId = req.auth?.userId;
  if (!userId) {
    throw new AppError('Authentication required', 401);
  }
  return userId;
};

export const getExportStatusController = async (req: Request, res: Response): Promise<void> => {
  const userId = getAuthUserId(req);
  const jobId = String(req.params.jobId);

  try {
    const job = await exportQueue.getJob(jobId as any);
    if (!job) {
      res.status(404).json({ success: false, error: 'Job not found' });
      return;
    }

    const jobData: any = job.data || {};
    if (jobData.requestorId && jobData.requestorId !== userId) {
      res.status(403).json({ success: false, error: 'Forbidden' });
      return;
    }

    const state = await job.getState();
    res.json({
      success: true,
      job: {
        id: job.id,
        state,
        progress: job.progress,
        result: (job.returnvalue as any) || null,
        failedReason: (job as any).failedReason || null,
      },
    });
    return;
  } catch (err) {
    res.status(500).json({ success: false, error: (err as Error).message });
    return;
  }
};

export default { getExportStatusController };
