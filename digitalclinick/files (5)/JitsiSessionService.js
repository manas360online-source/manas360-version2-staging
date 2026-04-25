// ═══════════════════════════════════════════════════════════════
// MyDigitalClinic — Jitsi Session Room Service
// Path: backend/src/services/mydigitalclinic/JitsiSessionService.js
// Dependencies: Prisma, crypto
// Jitsi: meet.jit.si (public) or self-hosted Jitsi instance
// ═══════════════════════════════════════════════════════════════

const crypto = require('crypto');
const prisma = require('../../lib/prisma');

// Configure: use meet.jit.si for MVP, self-hosted for production
const JITSI_DOMAIN = process.env.JITSI_DOMAIN || 'meet.jit.si';

class JitsiSessionService {

  /**
   * Create a Jitsi room for an existing mdc_session.
   * Returns a URL the therapist can share with the patient.
   */
  static async createRoom(sessionId, clinicId, { mode = 'audio', therapistName }) {
    // Verify session exists and belongs to clinic
    const session = await prisma.mdcSession.findFirst({
      where: { id: sessionId, clinicId },
      include: {
        patient: { select: { firstName: true, lastName: true } }
      }
    });
    if (!session) throw new Error('Session not found');
    if (session.jitsiRoomId) throw new Error('Session already has an active room');

    // Generate unique room ID (prefix with clinic code for namespacing)
    const clinic = await prisma.mdcClinic.findUnique({
      where: { id: clinicId },
      select: { clinicCode: true }
    });
    const suffix = crypto.randomBytes(4).toString('hex');
    const roomId = `mdc-${(clinic.clinicCode || 'clinic').toLowerCase().replace(/[^a-z0-9]/g, '')}-${suffix}`;

    // Build Jitsi URL with config
    const configParams = this._buildConfigParams(mode, therapistName);
    const jitsiUrl = `https://${JITSI_DOMAIN}/${roomId}${configParams}`;

    // Create room record
    const room = await prisma.mdcSessionRoom.create({
      data: {
        sessionId,
        clinicId,
        roomId,
        mode,
        jitsiUrl,
      }
    });

    // Link room to session
    await prisma.mdcSession.update({
      where: { id: sessionId },
      data: {
        jitsiRoomId: room.id,
        sessionType: mode, // audio or video
        status: 'in_progress',
      }
    });

    // Audit log
    await prisma.mdcAuditLog.create({
      data: {
        clinicId,
        userId: null, // set by middleware
        action: 'session_room_created',
        entityType: 'session_room',
        entityId: room.id,
        details: { sessionId, roomId, mode, patientName: `${session.patient.firstName} ${session.patient.lastName || ''}` },
      }
    });

    return {
      roomId: room.id,
      jitsiRoomName: roomId,
      jitsiUrl,
      mode,
      patientName: `${session.patient.firstName} ${session.patient.lastName || ''}`.trim(),
      // Patient link (no display name pre-set, no config overrides)
      patientUrl: `https://${JITSI_DOMAIN}/${roomId}#config.prejoinPageEnabled=false&config.startWithVideoMuted=${mode === 'audio'}&config.startAudioOnly=${mode === 'audio'}`,
    };
  }

  /**
   * Build Jitsi URL config fragment based on session mode
   */
  static _buildConfigParams(mode, therapistName) {
    const params = [
      'config.prejoinPageEnabled=false',
      'config.disableDeepLinking=true',
      'config.enableClosePage=false',
    ];

    if (mode === 'audio') {
      params.push(
        'config.startWithVideoMuted=true',
        'config.startAudioOnly=true',
        'config.disableVideoBackground=true',
        // Toolbar: mic, hangup, chat, recording, settings — no camera toggle
        'interfaceConfig.TOOLBAR_BUTTONS=["microphone","hangup","chat","recording","settings","raisehand","tileview"]',
        'interfaceConfig.FILM_STRIP_MAX_HEIGHT=0',
      );
    } else {
      params.push(
        'config.startWithVideoMuted=false',
        'config.startWithAudioMuted=false',
      );
    }

    // Set therapist display name
    if (therapistName) {
      params.push(`userInfo.displayName=${encodeURIComponent(therapistName)}`);
    }

    return '#' + params.join('&');
  }

  /**
   * Mark session room as started (therapist joined)
   */
  static async startRoom(roomId, clinicId) {
    const room = await prisma.mdcSessionRoom.findFirst({
      where: { id: roomId, clinicId }
    });
    if (!room) throw new Error('Room not found');

    return await prisma.mdcSessionRoom.update({
      where: { id: roomId },
      data: { startedAt: new Date() }
    });
  }

  /**
   * End session room — records end time, calculates duration
   */
  static async endRoom(roomId, clinicId) {
    const room = await prisma.mdcSessionRoom.findFirst({
      where: { id: roomId, clinicId }
    });
    if (!room) throw new Error('Room not found');

    const endedAt = new Date();
    const durationSeconds = room.startedAt
      ? Math.round((endedAt.getTime() - room.startedAt.getTime()) / 1000)
      : 0;

    // Update room
    await prisma.mdcSessionRoom.update({
      where: { id: roomId },
      data: { endedAt, durationSeconds }
    });

    // Update parent session status to completed
    await prisma.mdcSession.update({
      where: { id: room.sessionId },
      data: { status: 'completed' }
    });

    // Audit log
    await prisma.mdcAuditLog.create({
      data: {
        clinicId,
        userId: null,
        action: 'session_room_ended',
        entityType: 'session_room',
        entityId: roomId,
        details: { durationSeconds, mode: room.mode },
      }
    });

    return { roomId, durationSeconds, endedAt };
  }

  /**
   * Get room details for a session
   */
  static async getRoom(sessionId, clinicId) {
    return await prisma.mdcSessionRoom.findFirst({
      where: { sessionId, clinicId },
      select: {
        id: true,
        roomId: true,
        mode: true,
        jitsiUrl: true,
        startedAt: true,
        endedAt: true,
        durationSeconds: true,
      }
    });
  }
}

module.exports = JitsiSessionService;
