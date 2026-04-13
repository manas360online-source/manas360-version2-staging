import { prisma } from '../config/db';

const db = prisma as any;

export const REQUIRED_LEGAL_TYPES = ['TERMS_OF_SERVICE', 'PRIVACY_POLICY', 'INFORMED_CONSENT'] as const;

export type RequiredLegalType = (typeof REQUIRED_LEGAL_TYPES)[number];

const isMissingLegalSchema = (error: unknown): boolean => {
	const message = String((error as any)?.message || '').toLowerCase();
	return message.includes('legaldocument') || message.includes('useracceptance') || message.includes('legal_documents') || message.includes('user_acceptances');
};

const toTitle = (type: string): string =>
	String(type || '')
		.toLowerCase()
		.split('_')
		.map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
		.join(' ');

const defaultContent = (type: string): string => {
	const title = toTitle(type);
	return [
		`MANAS360 ${title} (v1)`,
		'',
		'This is the canonical legal artifact for compliance tracking.',
		'Any superseding version requires re-acceptance.',
	].join('\n');
};

export const ensureCanonicalLegalDocuments = async (): Promise<void> => {
	try {
		for (const type of REQUIRED_LEGAL_TYPES) {
			const active = await db.legalDocument.findFirst({
				where: { type, isActive: true },
				select: { id: true },
			});
			if (active) continue;

			await db.legalDocument.create({
				data: {
					type,
					version: 1,
					title: toTitle(type),
					content: defaultContent(type),
					isActive: true,
					publishedAt: new Date(),
				},
			});
		}
	} catch (error) {
		if (!isMissingLegalSchema(error)) {
			throw error;
		}
	}
};

export const getActiveLegalDocuments = async () => {
	await ensureCanonicalLegalDocuments();
	try {
		return await db.legalDocument.findMany({
			where: { isActive: true },
			orderBy: [{ type: 'asc' }, { version: 'desc' }],
		});
	} catch (error) {
		if (!isMissingLegalSchema(error)) {
			throw error;
		}

		return REQUIRED_LEGAL_TYPES.map((type) => ({
			id: type,
			type,
			version: 1,
			title: toTitle(type),
			content: defaultContent(type),
			isActive: true,
			publishedAt: new Date(),
		}));
	}
};

export const getPendingLegalDocumentsForUser = async (userId: string) => {
	const docs = await getActiveLegalDocuments();
	let acceptances: any[] = [];
	try {
		acceptances = await db.userAcceptance.findMany({
			where: { userId },
			select: {
				documentId: true,
				documentVer: true,
				document: {
					select: { type: true, version: true },
				},
			},
		});
	} catch (error) {
		if (!isMissingLegalSchema(error)) {
			throw error;
		}
	}

	// Always include legacy consent records so existing users are not re-blocked
	// after migrating to the legal_documents/user_acceptances schema.
	const legacyConsents = await db.consent.findMany({
		where: {
			userId,
			status: 'GRANTED',
			consentType: { in: [...REQUIRED_LEGAL_TYPES] },
		},
		select: {
			consentType: true,
			metadata: true,
		},
	});

	const legacyAcceptances = legacyConsents.map((consent: any) => ({
		documentId: consent.consentType,
		documentVer: Number((consent.metadata as any)?.version || 1),
		document: {
			type: consent.consentType,
			version: Number((consent.metadata as any)?.version || 1),
		},
	}));

	acceptances = [...acceptances, ...legacyAcceptances];

	const acceptedByType = new Map<string, number>();
	for (const acceptance of acceptances) {
		const type = String(acceptance.document?.type || '');
		if (!type) continue;
		const current = acceptedByType.get(type) || 0;
		acceptedByType.set(type, Math.max(current, Number(acceptance.documentVer || 0)));
	}

	const requiredDocs = docs.filter((doc: any) => REQUIRED_LEGAL_TYPES.includes(String(doc.type) as RequiredLegalType));
	const pending = requiredDocs.filter((doc: any) => {
		const acceptedVersion = acceptedByType.get(String(doc.type)) || 0;
		return acceptedVersion < Number(doc.version || 0);
	});

	return {
		requiredCount: requiredDocs.length,
		pendingCount: pending.length,
		pending,
	};
};

export const hasPendingLegalAcceptance = async (userId: string): Promise<boolean> => {
	const status = await getPendingLegalDocumentsForUser(userId);
	return status.pendingCount > 0;
};

export const recordUserAcceptances = async (input: {
	userId: string;
	documentIds: string[];
	ipAddress?: string;
	userAgent?: string;
	source?: string;
}) => {
	const { userId, documentIds, ipAddress, userAgent, source } = input;
	const normalizedIds = Array.from(new Set(documentIds.filter(Boolean)));
	if (normalizedIds.length === 0) {
		return { accepted: 0 };
	}

	let docs: Array<{ id: string; type: string; version: number; publishedAt: Date }> = [];
	try {
		docs = await db.legalDocument.findMany({
			where: { id: { in: normalizedIds }, isActive: true },
			select: { id: true, type: true, version: true, publishedAt: true },
		});

		if (docs.length !== normalizedIds.length) {
			throw new Error('Some legal documents are invalid or inactive');
		}
	} catch (error) {
		if (!isMissingLegalSchema(error)) {
			throw error;
		}

		docs = normalizedIds
			.filter((id) => REQUIRED_LEGAL_TYPES.includes(String(id) as RequiredLegalType))
			.map((type) => ({
				id: type,
				type,
				version: 1,
				publishedAt: new Date(),
			}));
	}

	const acceptedAt = new Date();
	for (const doc of docs) {
		try {
			await db.userAcceptance.upsert({
				where: {
					userId_documentId: {
						userId,
						documentId: doc.id,
					},
				},
				create: {
					userId,
					documentId: doc.id,
					documentVer: Number(doc.version),
					acceptedAt,
					ipAddress: ipAddress || null,
					userAgent: userAgent || null,
					source: source || 'auth',
				},
				update: {
					documentVer: Number(doc.version),
					acceptedAt,
					ipAddress: ipAddress || null,
					userAgent: userAgent || null,
					source: source || 'auth',
				},
			});
		} catch (error) {
			if (!isMissingLegalSchema(error)) {
				throw error;
			}
		}

		// Backward compatibility mirror to existing consent table for legacy reports.
		await db.consent.create({
			data: {
				userId,
				consentType: doc.type,
				purpose: 'LEGAL_ACCEPTANCE',
				status: 'GRANTED',
				grantedAt: acceptedAt,
				metadata: {
					source: source || 'auth',
					ipAddress: ipAddress || null,
					userAgent: userAgent || null,
					version: Number(doc.version),
					documentId: doc.id,
					publishedAt: doc.publishedAt,
				},
			},
		});
	}

	return { accepted: docs.length };
};
