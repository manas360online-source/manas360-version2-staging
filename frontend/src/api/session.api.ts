import client from './client';

let cbtTemplatesUnavailable = false;

const isRouteMissing = (error: any): boolean => {
	const status = Number(error?.response?.status || 0);
	const message = String(error?.response?.data?.message || '').toLowerCase();
	return status === 404 || message.includes('route not found');
};

export const listTemplateVersions = async (templateId: string) => {
	if (cbtTemplatesUnavailable) {
		return { success: true, items: [], message: 'Template history endpoint not available' };
	}
	try {
		const res = await client.get(`/v1/cbt-sessions/templates/${templateId}/history`);
		return res.data;
	} catch (error) {
		if (!isRouteMissing(error)) throw error;
		cbtTemplatesUnavailable = true;
		return { success: true, items: [], message: 'Template history endpoint not available' };
	}
};

export const duplicateTemplateVersion = async (templateId: string, versionId: string, publish = false) => {
	if (cbtTemplatesUnavailable) {
		return { success: false, duplicated: false, message: 'Template duplicate endpoint not available' };
	}
	try {
		const res = await client.post(`/v1/cbt-sessions/templates/${templateId}/versions/${versionId}/duplicate`, { publish });
		return res.data;
	} catch (error) {
		if (!isRouteMissing(error)) throw error;
		cbtTemplatesUnavailable = true;
		return { success: false, duplicated: false, message: 'Template duplicate endpoint not available' };
	}
};

export const compareTemplateVersions = async (templateId: string, v1: number, v2: number) => {
	if (cbtTemplatesUnavailable) {
		return { success: false, differences: [], message: 'Template compare endpoint not available' };
	}
	try {
		const res = await client.get(`/v1/cbt-sessions/templates/${templateId}/versions/compare?v1=${v1}&v2=${v2}`);
		return res.data;
	} catch (error) {
		if (!isRouteMissing(error)) throw error;
		cbtTemplatesUnavailable = true;
		return { success: false, differences: [], message: 'Template compare endpoint not available' };
	}
};

export const listLibrary = async (params: { q?: string; tags?: string[]; visibility?: string; page?: number; limit?: number }) => {
	const qp = [] as string[];
	if (params.q) qp.push(`q=${encodeURIComponent(params.q)}`);
	if (params.tags && params.tags.length) qp.push(`tags=${encodeURIComponent(params.tags.join(','))}`);
	if (params.visibility) qp.push(`visibility=${encodeURIComponent(params.visibility)}`);
	if (params.page) qp.push(`page=${params.page}`);
	if (params.limit) qp.push(`limit=${params.limit}`);
	const url = `/v1/cbt-sessions/library${qp.length ? '?' + qp.join('&') : ''}`;
	if (cbtTemplatesUnavailable) {
		return {
			success: true,
			items: [],
			total: 0,
			page: Number(params.page || 1),
			limit: Number(params.limit || 20),
			message: 'Template library endpoint not available',
		};
	}
	try {
		const res = await client.get(url);
		return res.data;
	} catch (error) {
		if (!isRouteMissing(error)) throw error;
		cbtTemplatesUnavailable = true;
		return {
			success: true,
			items: [],
			total: 0,
			page: Number(params.page || 1),
			limit: Number(params.limit || 20),
			message: 'Template library endpoint not available',
		};
	}
};

export const cloneLibraryTemplate = async (templateId: string, opts?: { makePrivate?: boolean; title?: string }) => {
	if (cbtTemplatesUnavailable) {
		return { success: false, cloned: false, message: 'Template clone endpoint not available' };
	}
	try {
		const res = await client.post('/v1/cbt-sessions/library/clone', { templateId, ...opts });
		return res.data;
	} catch (error) {
		if (!isRouteMissing(error)) throw error;
		cbtTemplatesUnavailable = true;
		return { success: false, cloned: false, message: 'Template clone endpoint not available' };
	}
};
