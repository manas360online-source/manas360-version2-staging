import { logger } from '../utils/logger';
import { io } from '../socket';

export type CrisisEvent = {
  id: string;
  userId: string;
  userName: string;
  type: 'SUICIDE_RISK' | 'SELF_HARM' | 'DOMESTIC_VIOLENCE' | 'OTHER';
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM';
  message: string;
  timestamp: string;
};

export const crisisService = {
  /**
   * Log and broadcast a crisis event.
   */
  async triggerAlert(event: CrisisEvent) {
    logger.warn('[CrisisAlert] High-priority event triggered!', event);
    
    // Broadcast to the socket.io admin-room for real-time frontend monitoring
    if (io) {
      io.to('admin-room').emit('crisis-alert', event);
      logger.info(`[CrisisAlert] Event emitted to admin-room: ${event.id}`);
    } else {
      logger.error('[CrisisAlert] Socket.io not initialized. Cannot broadcast alert.');
    }

    return { success: true, eventId: event.id };
  }
};
