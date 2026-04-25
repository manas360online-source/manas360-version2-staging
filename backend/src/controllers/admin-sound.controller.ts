import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { sendSuccess } from '../utils/response';
import { AppError } from '../middleware/error.middleware';

const prisma = new PrismaClient();

export const getAllTracks = async (req: Request, res: Response) => {
  const tracks = await prisma.soundTherapyTrack.findMany({
    orderBy: { createdAt: 'desc' },
  });
  sendSuccess(res, tracks, 'Fetched all sound therapy tracks');
};

export const getPublicTracks = async (req: Request, res: Response) => {
  const tracks = await prisma.soundTherapyTrack.findMany({
    where: { isActive: true },
    orderBy: { createdAt: 'desc' },
  });
  sendSuccess(res, tracks, 'Fetched active sound therapy tracks');
};

export const createTrack = async (req: Request, res: Response) => {
  const { title, genre, description, embedCode, frequency, duration } = req.body;

  if (!title || !genre || !embedCode) {
    throw new AppError('Title, genre, and embed code are required', 400);
  }

  const track = await prisma.soundTherapyTrack.create({
    data: {
      title,
      genre,
      description,
      embedCode,
      frequency,
      duration,
    },
  });

  sendSuccess(res, track, 'Track created successfully', 201);
};

export const deleteTrack = async (req: Request, res: Response) => {
  const { id } = req.params;

  await prisma.soundTherapyTrack.delete({
    where: { id },
  });

  sendSuccess(res, null, 'Track deleted successfully');
};
