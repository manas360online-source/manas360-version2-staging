
import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { env } from './env';

const connectionString = process.env.DATABASE_URL || '';

const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool as any);

export const prisma = new PrismaClient({ adapter });

let isConnected = false;

export const connectDatabase = async (): Promise<void> => {
	if (isConnected) return;
	// Prisma connects lazily; a simple test query ensures the client can connect
	if (env.databaseUrl) {
		await prisma.$connect();
	}
	isConnected = true;
};

export const disconnectDatabase = async (): Promise<void> => {
	if (!isConnected) return;
	await prisma.$disconnect();
	isConnected = false;
};

export const getDatabaseStatus = (): { isConnected: boolean } => ({ isConnected });

export default prisma;

