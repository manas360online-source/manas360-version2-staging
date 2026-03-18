import axios from 'axios';

const defaultApiBaseUrl = typeof window === 'undefined'
	? 'http://localhost:3000/api'
	: `${window.location.protocol}//${window.location.hostname}:3000/api`;

const configuredBaseUrl =
	import.meta.env.VITE_API_BASE_URL?.trim() ||
	import.meta.env.VITE_API_URL?.trim() ||
	defaultApiBaseUrl;

const getCookieValue = (cookieName: string): string | null => {
	if (typeof document === 'undefined') {
		return null;
	}

	const escaped = cookieName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
	const match = document.cookie.match(new RegExp(`(?:^|; )${escaped}=([^;]*)`));
	return match ? decodeURIComponent(match[1]) : null;
};

let refreshPromise: Promise<void> | null = null;

const isAuthRoute = (url: string): boolean => (
	url.includes('/auth/login')
	|| url.includes('/auth/logout')
	|| url.includes('/auth/refresh')
	|| url.includes('/auth/register')
	|| url.includes('/auth/password/')
);

const refreshAccessToken = async (): Promise<void> => {
	if (refreshPromise) {
		return refreshPromise;
	}

	refreshPromise = (async () => {
		const csrfCookieName = import.meta.env.VITE_CSRF_COOKIE_NAME || 'csrf_token';
		const csrfToken = getCookieValue(csrfCookieName);

		await axios.post(
			`${configuredBaseUrl}/auth/refresh`,
			{},
			{
				withCredentials: true,
				headers: csrfToken ? { 'x-csrf-token': csrfToken } : undefined,
			},
		);
	})();

	try {
		await refreshPromise;
	} finally {
		refreshPromise = null;
	}
};

export const http = axios.create({
	baseURL: configuredBaseUrl,
	withCredentials: true,
	headers: {
		'Content-Type': 'application/json',
	},
});

const isExpectedAuthFailure = (status: number | undefined, url: string): boolean => {
	if (!status) return false;
	if (status === 401 && url.includes('/auth/me')) return true;
	if ((status === 401 || status === 403) && url.includes('/v1/admin/pricing')) return true;
	return false;
};

http.interceptors.response.use(
	(response) => response,
	async (error) => {
		const status: number | undefined = error?.response?.status;
		const baseUrl = error?.config?.baseURL || '';
		const relativeUrl = error?.config?.url || '';
		const fullUrl = `${baseUrl}${relativeUrl}`;

		(error as any).isExpectedAuthFailure = isExpectedAuthFailure(status, fullUrl);

		const originalRequest = error?.config as (typeof error.config & { _retry?: boolean }) | undefined;
		if (status === 401 && originalRequest && !originalRequest._retry && !isAuthRoute(fullUrl)) {
			originalRequest._retry = true;
			try {
				await refreshAccessToken();
				return http(originalRequest);
			} catch {
				// Let the original 401 bubble up when refresh is unavailable/expired.
			}
		}

		return Promise.reject(error);
	},
);
