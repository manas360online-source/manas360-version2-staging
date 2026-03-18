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

const joinUrl = (path: string): string => {
	if (path.startsWith('http://') || path.startsWith('https://')) return path;
	if (configuredBase.endsWith('/') && path.startsWith('/')) return `${configuredBase.slice(0, -1)}${path}`;
	if (!configuredBase.endsWith('/') && !path.startsWith('/')) return `${configuredBase}/${path}`;
	return `${configuredBase}${path}`;
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
