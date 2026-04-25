// ═══════════════════════════════════════════════════════════════
// MyDigitalClinic — API Routes (Express)
// Path: backend/src/routes/mydigitalclinic/features.js
// Mount: app.use('/api/mdc', require('./routes/mydigitalclinic/features'))
// Auth: JWT middleware required on all routes (clinicId from token)
// ═══════════════════════════════════════════════════════════════

const express = require('express');
const router = express.Router();
const multer = require('multer');
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } }); // 5MB max

const BulkImportService = require('../services/BulkImportService');
const MultiTherapistService = require('../services/MultiTherapistService');
const JitsiSessionService = require('../services/JitsiSessionService');

// Middleware: extract clinicId from JWT (set by auth middleware)
const requireClinic = (req, res, next) => {
  if (!req.clinicId) return res.status(403).json({ error: 'Clinic context required' });
  next();
};

// ═══════════════════════════════════════
// 1. BULK PATIENT IMPORT
// ═══════════════════════════════════════

/**
 * POST /api/mdc/patients/import/parse
 * Upload CSV, parse and validate. Returns preview (no DB writes).
 * Body: multipart/form-data with field "file"
 */
router.post('/patients/import/parse', requireClinic, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
    if (!req.file.originalname.endsWith('.csv')) return res.status(400).json({ error: 'Only .csv files accepted' });

    const result = BulkImportService.parseCSV(req.file.buffer, req.clinicId);
    res.json({
      fileName: req.file.originalname,
      totalRows: result.totalRows,
      validCount: result.validRows.length,
      errorCount: result.errorRows.length,
      validRows: result.validRows.slice(0, 10).map(r => ({ // preview first 10
        rowNumber: r.rowNumber,
        name: `${r.parsed.firstName} ${r.parsed.lastName || ''}`.trim(),
        phone: r.parsed.phone,
        email: r.parsed.email,
        gender: r.parsed.gender,
        issue: r.parsed.primaryConcern,
      })),
      errorRows: result.errorRows.slice(0, 10).map(r => ({
        rowNumber: r.rowNumber,
        errors: r.errors,
        rawData: r.rawData,
      })),
      // Store full parsed data in session/cache for the confirm step
      _parseToken: Buffer.from(JSON.stringify({
        validRows: result.validRows,
        errorRows: result.errorRows,
        fileName: req.file.originalname,
      })).toString('base64'),
    });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

/**
 * POST /api/mdc/patients/import/confirm
 * Confirm import — writes patients to DB.
 * Body: { parseToken: string } (from parse response)
 */
router.post('/patients/import/confirm', requireClinic, async (req, res) => {
  try {
    const { parseToken } = req.body;
    if (!parseToken) return res.status(400).json({ error: 'parseToken required' });

    const parsed = JSON.parse(Buffer.from(parseToken, 'base64').toString('utf-8'));
    const result = await BulkImportService.importRows(
      req.clinicId,
      parsed.fileName,
      parsed.validRows,
      parsed.errorRows
    );

    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/mdc/patients/import/:importId
 * Get import status with row-level details
 */
router.get('/patients/import/:importId', requireClinic, async (req, res) => {
  try {
    const result = await BulkImportService.getImportStatus(req.params.importId, req.clinicId);
    res.json(result);
  } catch (err) {
    res.status(404).json({ error: err.message });
  }
});

// ═══════════════════════════════════════
// 2. MULTI-THERAPIST ACCOUNTS
// ═══════════════════════════════════════

/**
 * GET /api/mdc/therapists
 * List all therapist slots for the clinic
 */
router.get('/therapists', requireClinic, async (req, res) => {
  try {
    const result = await MultiTherapistService.getClinicTherapists(req.clinicId);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/mdc/therapists
 * Add a new therapist slot
 * Body: { displayName: string, specialization?: string }
 */
router.post('/therapists', requireClinic, async (req, res) => {
  try {
    const { displayName, specialization } = req.body;
    if (!displayName) return res.status(400).json({ error: 'displayName required' });

    const therapist = await MultiTherapistService.addTherapist(req.clinicId, { displayName, specialization });
    res.status(201).json(therapist);
  } catch (err) {
    if (err.message.includes('Maximum')) return res.status(409).json({ error: err.message });
    res.status(500).json({ error: err.message });
  }
});

/**
 * PUT /api/mdc/therapists/:therapistId
 * Update therapist name or specialization
 * Body: { displayName?: string, specialization?: string }
 */
router.put('/therapists/:therapistId', requireClinic, async (req, res) => {
  try {
    const result = await MultiTherapistService.updateTherapist(req.clinicId, req.params.therapistId, req.body);
    res.json(result);
  } catch (err) {
    res.status(404).json({ error: err.message });
  }
});

/**
 * DELETE /api/mdc/therapists/:therapistId
 * Deactivate a therapist slot (soft-delete)
 */
router.delete('/therapists/:therapistId', requireClinic, async (req, res) => {
  try {
    await MultiTherapistService.deactivateTherapist(req.clinicId, req.params.therapistId);
    res.json({ success: true });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

/**
 * POST /api/mdc/auth/login-suffix
 * Authenticate by clinic login suffix (e.g., MDC-7A3F-02)
 * Body: { loginSuffix: string }
 * Returns: therapist context (for JWT generation)
 */
router.post('/auth/login-suffix', async (req, res) => {
  try {
    const { loginSuffix } = req.body;
    if (!loginSuffix) return res.status(400).json({ error: 'loginSuffix required' });

    const context = await MultiTherapistService.authenticateByLoginSuffix(loginSuffix.toUpperCase());
    // In production: generate JWT with clinicId + therapistId + role
    res.json(context);
  } catch (err) {
    res.status(401).json({ error: err.message });
  }
});

// ═══════════════════════════════════════
// 3. JITSI SESSION ROOMS
// ═══════════════════════════════════════

/**
 * POST /api/mdc/sessions/:sessionId/room
 * Create a Jitsi room for an existing session
 * Body: { mode: 'audio' | 'video', therapistName?: string }
 */
router.post('/sessions/:sessionId/room', requireClinic, async (req, res) => {
  try {
    const { mode, therapistName } = req.body;
    const result = await JitsiSessionService.createRoom(
      req.params.sessionId,
      req.clinicId,
      { mode: mode || 'audio', therapistName }
    );
    res.status(201).json(result);
  } catch (err) {
    if (err.message.includes('already has')) return res.status(409).json({ error: err.message });
    res.status(400).json({ error: err.message });
  }
});

/**
 * POST /api/mdc/sessions/:sessionId/room/start
 * Mark room as started (therapist joined)
 */
router.post('/sessions/:sessionId/room/start', requireClinic, async (req, res) => {
  try {
    const room = await JitsiSessionService.getRoom(req.params.sessionId, req.clinicId);
    if (!room) return res.status(404).json({ error: 'No room for this session' });
    const result = await JitsiSessionService.startRoom(room.id, req.clinicId);
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

/**
 * POST /api/mdc/sessions/:sessionId/room/end
 * End room — records duration, marks session complete
 */
router.post('/sessions/:sessionId/room/end', requireClinic, async (req, res) => {
  try {
    const room = await JitsiSessionService.getRoom(req.params.sessionId, req.clinicId);
    if (!room) return res.status(404).json({ error: 'No room for this session' });
    const result = await JitsiSessionService.endRoom(room.id, req.clinicId);
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

/**
 * GET /api/mdc/sessions/:sessionId/room
 * Get room details for a session
 */
router.get('/sessions/:sessionId/room', requireClinic, async (req, res) => {
  try {
    const room = await JitsiSessionService.getRoom(req.params.sessionId, req.clinicId);
    if (!room) return res.status(404).json({ error: 'No room for this session' });
    res.json(room);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
