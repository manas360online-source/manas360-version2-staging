import { prisma } from '../config/db';
import crypto from 'crypto';

export interface SystemStatus {
  id: number;
  isLive: boolean;
  launchedBy?: string | null;
  launchedAt?: Date | null;
}

export const getSystemStatus = async (): Promise<SystemStatus> => {
  let status = await prisma.systemStatus.findUnique({
    where: { id: 1 }
  });

  if (!status) {
    status = await prisma.systemStatus.create({
      data: { id: 1, isLive: false }
    });
  }

  return status;
};

export const activateSystem = async (pin: string, signature: string, actor: string): Promise<SystemStatus> => {
  const status = await getSystemStatus();
  
  if (status.isLive) {
    return status;
  }

  // Secret PIN validation (e.g., 360360)
  if (pin !== '360360') {
    throw new Error('Invalid Clinical Activation Key');
  }

  // SHA-256 "Meat Grinder" logic for signature validation
  // Expecting signature to be sha256(pin + 'MANAS360_LAUNCH')
  const expectedSignature = crypto
    .createHash('sha256')
    .update(`${pin}_MANAS360_LAUNCH`)
    .digest('hex');

  if (signature !== expectedSignature) {
    throw new Error('Launch signal signature mismatch');
  }

  return await prisma.systemStatus.update({
    where: { id: 1 },
    data: {
      isLive: true,
      launchedBy: actor,
      launchedAt: new Date()
    }
  });
};
