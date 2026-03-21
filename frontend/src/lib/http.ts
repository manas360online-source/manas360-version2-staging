import axios, { AxiosInstance, AxiosResponse } from 'axios';

const defaultApiBaseUrl = typeof window === 'undefined'
	? 'http://localhost:3000/api'
	: '/api';

const rawBaseUrl =
	import.meta.env.VITE_API_BASE_URL?.trim() ||
	import.meta.env.VITE_API_URL?.trim() ||
	defaultApiBaseUrl;

const configuredBaseUrl = (() => {
	if (typeof window === 'undefined') {
		return rawBaseUrl;
	}

	// Avoid mixed-content when frontend is HTTPS and API URL is HTTP.
	if (window.location.protocol === 'https:' && rawBaseUrl.startsWith('http://')) {
		return rawBaseUrl.replace(/^http:\/\//, 'https://');
	}

	return rawBaseUrl;
})();

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

let httpInstance: AxiosInstance | any;
if (axios && typeof (axios as any).create === 'function') {
	httpInstance = (axios as any).create({
		baseURL: configuredBaseUrl,
		withCredentials: true,
		headers: {
			'Content-Type': 'application/json',
		},
	});
} else if (axios) {
    // In test mocks axios may be an object with get/post helpers but no create function.
    // Fall back to using the axios object directly so tests can mock `get`.
    httpInstance = axios as any;
} else {
    httpInstance = {} as any;
}

export const http = httpInstance as AxiosInstance;

const isExpectedAuthFailure = (status: number | undefined, url: string): boolean => {
	if (!status) return false;
	if (status === 401 && url.includes('/auth/me')) return true;
	if ((status === 401 || status === 403) && url.includes('/v1/admin/pricing')) return true;
	return false;
};

if (http && http.interceptors && http.interceptors.response && typeof http.interceptors.response.use === 'function') {
	http.interceptors.response.use(
 		(response: AxiosResponse) => response,
 		async (error: any) => {
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
 					return http(originalRequest as any);
 				} catch {
 					// Let the original 401 bubble up when refresh is unavailable/expired.
 				}
 			}

 			return Promise.reject(error);
 		},
 	);
}
