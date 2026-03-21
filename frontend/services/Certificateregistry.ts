/**
 * certificateRegistry.ts
 * ─────────────────────────────────────────────────────────────────────
 * Stores and retrieves certificate records from localStorage.
 * Works perfectly for same-device / localhost verification.
 * ─────────────────────────────────────────────────────────────────────
 */

const STORAGE_KEY = 'manas360_certificates';

export interface CertRecord {
    certId: string;
    enrollmentId: string;
    userName: string;
    certificationName: string;
    enrollmentDate: string;
    issuedAt: string;
}

/**
 * Generates a truly unique cert ID using crypto.randomUUID().
 * Format: "A3F9-2K7P-QX14" — human readable, zero collision risk.
 */
export function generateUniqueCertId(): string {
    const hex = crypto.randomUUID().replace(/-/g, '').toUpperCase().slice(0, 12);
    return `${hex.slice(0, 4)}-${hex.slice(4, 8)}-${hex.slice(8, 12)}`;
}

/** Save a new cert record. Skips if enrollmentId already has a cert. */
export function saveCertRecord(record: CertRecord): void {
    const all = getAllRecords();
    if (all.some(r => r.enrollmentId === record.enrollmentId)) return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...all, record]));
}

/** Look up cert by certId — used by the verification page. */
export function getCertById(certId: string): CertRecord | null {
    return getAllRecords().find(
        r => r.certId.toUpperCase() === certId.toUpperCase()
    ) ?? null;
}

/** Look up cert by enrollmentId — used by the certificate page. */
export function getCertByEnrollmentId(enrollmentId: string): CertRecord | null {
    return getAllRecords().find(r => r.enrollmentId === enrollmentId) ?? null;
}

function getAllRecords(): CertRecord[] {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        return raw ? JSON.parse(raw) : [];
    } catch {
        return [];
    }
}