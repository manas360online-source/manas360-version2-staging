import axios from 'axios';
import { prisma as db } from '../config/db';
import { logger } from '../utils/logger';
import { env } from '../config/env';

export type VerificationResult = {
  status: 'verified' | 'flagged' | 'rejected' | 'pending';
  checks: Array<{ check: string; passed: boolean; detail?: string; [key: string]: any }>;
  flagReasons: string[];
  verifiedAt?: string | null;
};

const NMC_API = env.nmcApiUrl || process.env.NMC_API_URL || 'https://www.nmc.org.in/MCIRest/open/getDataFromService?service=searchDoctor';
const TIMEOUT_MS = Number(env.verificationTimeoutMs || process.env.VERIFICATION_TIMEOUT_MS || 10000);

function normalizeName(s: string) {
  return String(s || '')
    .toLowerCase()
    .replace(/\bdr\.?\s*/g, '')
    .replace(/[^a-z\s]/g, '')
    .trim();
}

function fuzzyNameMatch(input: string, registered: string) {
  const a = normalizeName(input);
  const b = normalizeName(registered);
  if (a === b) return { score: 1.0 };
  const aLast = a.split(' ').pop() || '';
  const bLast = b.split(' ').pop() || '';
  if (aLast && aLast === bLast) return { score: 0.85 };
  const aTokens = new Set(a.split(' ').filter(Boolean));
  const bTokens = new Set(b.split(' ').filter(Boolean));
  const overlap = [...aTokens].filter((t) => bTokens.has(t)).length;
  const maxTokens = Math.max(aTokens.size || 1, bTokens.size || 1);
  return { score: overlap / maxTokens };
}

function validateLicenseFormat(license: string, type?: string) {
  if (!license || license.length < 3) return false;
  if (type === 'NMC') return /^[A-Z0-9\-\/]+$/i.test(license);
  if (type === 'RCI') return /^[A-Z]{1,3}\d{4,}/i.test(license);
  return license.length >= 4;
}

export const verificationService = {
  async verifyProviderCredentials(providerData: any): Promise<VerificationResult> {
    const {
      userId,
      name,
      phone,
      email,
      licenseNumber,
      licenseType,
      qualification,
      specialization,
      stateCouncil,
    } = providerData;

    const result: VerificationResult = {
      status: 'pending',
      checks: [],
      flagReasons: [],
      verifiedAt: null,
    };

    // LICENSE FORMAT
    const formatValid = validateLicenseFormat(licenseNumber, licenseType);
    result.checks.push({ check: 'LICENSE_FORMAT', passed: formatValid, detail: formatValid ? 'Format valid' : 'Invalid format' });
    if (!formatValid) result.flagReasons.push('License number format invalid');

    // DATABASE LOOKUP (NMC)
    try {
      const resp = await axios.post(NMC_API, { registrationNo: licenseNumber, doctorName: name }, { timeout: TIMEOUT_MS });
      const data = resp.data || {};
      if (Number(data.totalCount || 0) === 0) {
        result.checks.push({ check: 'DATABASE_LOOKUP', passed: false, detail: 'Not found in NMC' });
        // Try State Medical Council endpoint if configured
        const smcKey = String(stateCouncil || '').toUpperCase();
        const smcUrl = env.smcApiMap && env.smcApiMap[smcKey];
        if (smcUrl) {
          try {
            const smcResp = await axios.post(smcUrl, { registrationNo: licenseNumber, doctorName: name }, { timeout: TIMEOUT_MS });
            const smcData = smcResp.data || {};
            // basic truthy check — adapt per-state adapter as needed
            if (smcData.found || Number(smcData.totalCount || 0) > 0) {
              result.checks.push({ check: 'DATABASE_LOOKUP_SMC', passed: true, detail: `Found in SMC: ${smcKey}` });
            } else {
              result.checks.push({ check: 'DATABASE_LOOKUP_SMC', passed: false, detail: `Not found in SMC: ${smcKey}` });
              result.flagReasons.push('License not found in NMC or SMC');
            }
          } catch (smcErr: any) {
            logger.warn('[Verification] SMC lookup failed', { error: smcErr?.message, state: smcKey });
            result.checks.push({ check: 'DATABASE_LOOKUP_SMC', passed: false, detail: `SMC API error: ${smcErr?.message || 'unknown'}` });
            result.flagReasons.push('License not found in NMC or SMC');
          }
        } else {
          result.flagReasons.push('License not found in NMC');
        }
      } else {
        const doctor = (data.doctors && data.doctors[0]) || {};
        // LICENSE STATUS
        const isActive = String(doctor.status || '').toLowerCase() === 'active';
        result.checks.push({ check: 'LICENSE_STATUS', passed: isActive, detail: `NMC status: ${doctor.status || 'unknown'}` });
        if (!isActive) {
          if (String(doctor.status || '').toLowerCase() === 'suspended') {
            result.status = 'rejected';
            result.flagReasons.push('License SUSPENDED — auto-rejected');
          } else {
            result.flagReasons.push(`License status: ${doctor.status}`);
          }
        }

        // NAME MATCH
        const nameMatch = fuzzyNameMatch(name || '', doctor.doctorName || '');
        result.checks.push({ check: 'NAME_MATCH', passed: nameMatch.score >= 0.8, detail: `score=${nameMatch.score}` });
        if (nameMatch.score < 0.8) result.flagReasons.push(`Name mismatch: registered as "${doctor.doctorName}"`);

        // EXPIRY
        if (doctor.expiryDate) {
          const expiry = new Date(doctor.expiryDate);
          const now = new Date();
          const daysUntilExpiry = Math.floor((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
          result.checks.push({ check: 'LICENSE_EXPIRY', passed: daysUntilExpiry > 30, detail: daysUntilExpiry > 0 ? `Expires in ${daysUntilExpiry} days` : `EXPIRED ${Math.abs(daysUntilExpiry)} days ago` });
          if (daysUntilExpiry <= 0) result.flagReasons.push('License expired');
          else if (daysUntilExpiry <= 30) result.flagReasons.push(`License expiring in ${daysUntilExpiry} days`);
        }
      }
    } catch (err: any) {
      logger.warn('[Verification] NMC API lookup failed', { error: err?.message });
      result.checks.push({ check: 'DATABASE_LOOKUP', passed: false, detail: `NMC API error: ${err?.message || 'unknown'}` });
      result.flagReasons.push('NMC API timeout — needs manual verification');
    }

    // FINAL STATUS
    if (result.status !== 'rejected') {
      if (result.flagReasons.length === 0) {
        result.status = 'verified';
        result.verifiedAt = new Date().toISOString();
      } else {
        result.status = 'flagged';
      }
    }

    // PERSIST to provider_verifications table
    try {
      await db.providerVerification.upsert({
        where: { userId: String(userId) },
        create: {
          userId: String(userId),
          license: String(licenseNumber || ''),
          licenseType: String(licenseType || ''),
          status: result.status,
          checks: result.checks as any,
          flagReasons: result.flagReasons as any,
          verifiedAt: result.verifiedAt ? new Date(result.verifiedAt) : null,
        },
        update: {
          license: String(licenseNumber || ''),
          licenseType: String(licenseType || ''),
          status: result.status,
          checks: result.checks as any,
          flagReasons: result.flagReasons as any,
          verifiedAt: result.verifiedAt ? new Date(result.verifiedAt) : null,
        }
      });

      // Update user flags
      if (result.status === 'verified') {
        await db.user.update({ where: { id: String(userId) }, data: { isTherapistVerified: true, therapistVerifiedAt: new Date(), therapistVerifiedByUserId: null } });
      }
    } catch (err: any) {
      logger.error('[Verification] Persist failed', { error: err?.message });
    }

    return result;
  }
};

export default verificationService;
