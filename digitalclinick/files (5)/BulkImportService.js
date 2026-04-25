// ═══════════════════════════════════════════════════════════════
// MyDigitalClinic — Bulk Patient Import Service
// Path: backend/src/services/mydigitalclinic/BulkImportService.js
// Dependencies: Prisma, multer (file upload), csv-parse
// ═══════════════════════════════════════════════════════════════

const { parse } = require('csv-parse/sync');
const prisma = require('../../lib/prisma');

const REQUIRED_COLUMNS = ['name', 'phone'];
const OPTIONAL_COLUMNS = ['email', 'age', 'gender', 'issue', 'status'];
const MAX_ROWS = 500;

class BulkImportService {

  /**
   * Parse and validate CSV buffer. Returns structured rows + errors.
   * Does NOT write to DB — call importRows() after user confirms.
   */
  static parseCSV(buffer, clinicId) {
    const text = buffer.toString('utf-8');
    let records;

    try {
      records = parse(text, {
        columns: true,
        skip_empty_lines: true,
        trim: true,
        relax_column_count: true,
      });
    } catch (err) {
      throw new Error(`CSV parsing failed: ${err.message}`);
    }

    if (records.length === 0) throw new Error('CSV is empty — needs at least 1 data row');
    if (records.length > MAX_ROWS) throw new Error(`Too many rows (${records.length}). Maximum is ${MAX_ROWS}.`);

    // Normalize header keys to lowercase
    const normalized = records.map(row => {
      const clean = {};
      Object.keys(row).forEach(k => { clean[k.toLowerCase().trim()] = row[k]; });
      return clean;
    });

    // Validate required columns exist
    const headers = Object.keys(normalized[0]);
    const missing = REQUIRED_COLUMNS.filter(r => !headers.includes(r));
    if (missing.length > 0) throw new Error(`Missing required columns: ${missing.join(', ')}`);

    // Validate each row
    const validRows = [];
    const errorRows = [];

    normalized.forEach((row, idx) => {
      const rowNum = idx + 2; // 1-indexed + header row
      const errors = [];

      // Name validation
      const name = row.name?.trim();
      if (!name) errors.push('Missing name');

      // Phone validation — must be Indian mobile (10 digits or +91 prefix)
      let phone = row.phone?.trim().replace(/[\s\-\(\)]/g, '');
      if (!phone) {
        errors.push('Missing phone');
      } else {
        // Normalize to +91XXXXXXXXXX
        if (phone.startsWith('+91')) phone = phone;
        else if (phone.startsWith('91') && phone.length === 12) phone = '+' + phone;
        else if (phone.length === 10 && /^[6-9]/.test(phone)) phone = '+91' + phone;
        else errors.push(`Invalid phone format: ${row.phone}`);
      }

      // Split name into first/last
      const nameParts = name ? name.split(/\s+/) : [];
      const firstName = nameParts[0] || '';
      const lastName = nameParts.slice(1).join(' ') || null;

      // Gender normalization
      let gender = row.gender?.trim().toUpperCase();
      if (gender === 'MALE' || gender === 'M') gender = 'M';
      else if (gender === 'FEMALE' || gender === 'F') gender = 'F';
      else if (gender === 'TRANSGENDER' || gender === 'T') gender = 'T';
      else if (gender === 'OTHER' || gender === 'O') gender = 'Other';
      else gender = null;

      if (errors.length > 0) {
        errorRows.push({ rowNumber: rowNum, rawData: row, errors });
      } else {
        validRows.push({
          rowNumber: rowNum,
          rawData: row,
          parsed: {
            firstName,
            lastName,
            phone,
            email: row.email?.trim() || null,
            dateOfBirth: row.age ? null : null, // age→DOB conversion deferred
            gender,
            primaryConcern: row.issue?.trim() || null,
            isActive: (row.status?.toLowerCase() || 'active') !== 'inactive',
          }
        });
      }
    });

    return { validRows, errorRows, totalRows: records.length };
  }

  /**
   * Create import record + row records, then batch-insert patients.
   * Uses a transaction for atomicity.
   */
  static async importRows(clinicId, fileName, validRows, errorRows) {
    return await prisma.$transaction(async (tx) => {
      // 1. Create import record
      const importRecord = await tx.mdcPatientImport.create({
        data: {
          clinicId,
          fileName,
          totalRows: validRows.length + errorRows.length,
          status: 'processing',
        }
      });

      // 2. Insert error rows
      if (errorRows.length > 0) {
        await tx.mdcImportRow.createMany({
          data: errorRows.map(er => ({
            importId: importRecord.id,
            rowNumber: er.rowNumber,
            rawData: er.rawData,
            status: 'error',
            errorMessage: er.errors.join('; '),
          }))
        });
      }

      // 3. Batch-insert valid patients + track rows
      let importedCount = 0;
      let skippedCount = 0;

      for (const row of validRows) {
        try {
          // Check for duplicate phone in this clinic
          const existing = await tx.mdcPatient.findFirst({
            where: { clinicId, phone: row.parsed.phone }
          });

          if (existing) {
            await tx.mdcImportRow.create({
              data: {
                importId: importRecord.id,
                rowNumber: row.rowNumber,
                rawData: row.rawData,
                status: 'skipped',
                errorMessage: `Duplicate phone — patient already exists: ${existing.firstName} ${existing.lastName || ''}`,
              }
            });
            skippedCount++;
            continue;
          }

          // Insert patient
          const patient = await tx.mdcPatient.create({
            data: {
              clinicId,
              firstName: row.parsed.firstName,
              lastName: row.parsed.lastName,
              phone: row.parsed.phone,
              email: row.parsed.email,
              gender: row.parsed.gender,
              primaryConcern: row.parsed.primaryConcern,
              isActive: row.parsed.isActive,
              consentGiven: false, // DPDPA: consent collected separately
            }
          });

          await tx.mdcImportRow.create({
            data: {
              importId: importRecord.id,
              rowNumber: row.rowNumber,
              rawData: row.rawData,
              patientId: patient.id,
              status: 'imported',
            }
          });
          importedCount++;

        } catch (err) {
          await tx.mdcImportRow.create({
            data: {
              importId: importRecord.id,
              rowNumber: row.rowNumber,
              rawData: row.rawData,
              status: 'error',
              errorMessage: err.message,
            }
          });
        }
      }

      // 4. Update import record with final counts
      await tx.mdcPatientImport.update({
        where: { id: importRecord.id },
        data: {
          importedCount,
          skippedCount,
          errorCount: errorRows.length + (validRows.length - importedCount - skippedCount),
          status: 'completed',
          completedAt: new Date(),
        }
      });

      // 5. Audit log
      await tx.mdcAuditLog.create({
        data: {
          clinicId,
          userId: null, // set by middleware
          action: 'bulk_patient_import',
          entityType: 'patient_import',
          entityId: importRecord.id,
          details: { fileName, imported: importedCount, skipped: skippedCount, errors: errorRows.length },
        }
      });

      return {
        importId: importRecord.id,
        totalRows: validRows.length + errorRows.length,
        imported: importedCount,
        skipped: skippedCount,
        errors: errorRows.length,
      };
    });
  }

  /**
   * Get import status with row-level details
   */
  static async getImportStatus(importId, clinicId) {
    const record = await prisma.mdcPatientImport.findFirst({
      where: { id: importId, clinicId },
      include: {
        rows: {
          orderBy: { rowNumber: 'asc' },
          select: {
            rowNumber: true,
            status: true,
            errorMessage: true,
            rawData: true,
          }
        }
      }
    });
    if (!record) throw new Error('Import not found');
    return record;
  }
}

module.exports = BulkImportService;
