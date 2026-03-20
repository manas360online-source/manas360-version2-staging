import { PrismaClient } from '@prisma/client';
import { env } from './env';

export const prisma = new PrismaClient({
  datasources: {
    db: {
      url: env.databaseUrl,
    },
  },
});

let isConnected = false;

export const connectDatabase = async (): Promise<void> => {
  if (isConnected) return;

  await prisma.$connect();
  isConnected = true;
};

export const disconnectDatabase = async (): Promise<void> => {
  if (!isConnected) return;

  await prisma.$disconnect();
  isConnected = false;
};

export const getDatabaseStatus = (): { isConnected: boolean } => ({
  isConnected,
});

export default prisma;
