type Resp<T> = { data: T };

export class ApiClientError extends Error {
	status: number;
	url: string;
	isExpectedAuthFailure: boolean;

	constructor(message: string, status: number, url: string, isExpectedAuthFailure: boolean) {
		super(message);
		this.name = 'ApiClientError';
		this.status = status;
		this.url = url;
		this.isExpectedAuthFailure = isExpectedAuthFailure;
	}
}

const defaultApiBase = typeof window === 'undefined'
	? 'http://localhost:3000/api'
	: `${window.location.protocol}//${window.location.hostname}:3000/api`;

const configuredBase =
	import.meta.env.VITE_API_BASE_URL?.trim() ||
	import.meta.env.VITE_API_URL?.trim() ||
	defaultApiBase;

const normalizeBaseUrl = (url: string): string => {
	let normalized = url.trim();
	if (normalized.startsWith('https://manas360.com')) {
		normalized = normalized.replace('https://manas360.com', 'https://www.manas360.com');
	}

	if (typeof window !== 'undefined' && /^https:\/\/(www\.)?manas360\.com\/api(\/v1)?/i.test(normalized)) {
		// Keep API calls on the same origin as the loaded app so cookies are always sent reliably.
		const path = normalized.includes('/api/v1') ? '/api/v1' : '/api';
		return `${window.location.origin}${path}`;
	}

	return normalized.replace(/\/+$/, '');
};

const normalizeApiPath = (baseUrl: string, path: string): string => {
	if (!path.startsWith('/v1/')) {
		return path;
	}

	return baseUrl.endsWith('/api/v1') ? path.replace(/^\/v1/, '') : path;
};

const normalizedBase = normalizeBaseUrl(configuredBase);

const joinUrl = (path: string): string => {
	if (path.startsWith('http://') || path.startsWith('https://')) return path;
	const normalizedPath = normalizeApiPath(normalizedBase, path);
	if (normalizedBase.endsWith('/') && normalizedPath.startsWith('/')) return `${normalizedBase.slice(0, -1)}${normalizedPath}`;
	if (!normalizedBase.endsWith('/') && !normalizedPath.startsWith('/')) return `${normalizedBase}/${normalizedPath}`;
	return `${normalizedBase}${normalizedPath}`;
};

const isExpectedAuthFailure = (status: number, url: string): boolean => {
	if (status === 401 && url.includes('/auth/me')) return true;
	if ((status === 401 || status === 403) && url.includes('/v1/admin/pricing')) return true;
	return false;
};

const parseResponse = async <T = any>(res: Response): Promise<Resp<T>> => {
	const data = await res.json().catch(() => ({}));
	if (!res.ok) {
		const message = data?.message || data?.error || `Request failed with status ${res.status}`;
		throw new ApiClientError(message, res.status, res.url, isExpectedAuthFailure(res.status, res.url));
	}
	return { data } as Resp<T>;
};

const client = {
	async get<T = any>(url: string) {
		const res = await fetch(joinUrl(url), { credentials: 'include' });
		return parseResponse<T>(res);
	},
	async post<T = any>(url: string, body?: any) {
		const res = await fetch(joinUrl(url), { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
		return parseResponse<T>(res);
	},
	async patch<T = any>(url: string, body?: any) {
		const res = await fetch(joinUrl(url), {
			method: 'PATCH',
			credentials: 'include',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(body ?? {}),
		});
		return parseResponse<T>(res);
	},
	async put<T = any>(url: string, body?: any) {
		const res = await fetch(joinUrl(url), {
			method: 'PUT',
			credentials: 'include',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(body ?? {}),
		});
		return parseResponse<T>(res);
	},
};

export default client;
