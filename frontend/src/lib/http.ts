import axios from 'axios';

const configuredBaseUrl =
	import.meta.env.VITE_API_BASE_URL?.trim() ||
	import.meta.env.VITE_API_URL?.trim() ||
	'http://localhost:3000/api';

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
	(error) => {
		const status: number | undefined = error?.response?.status;
		const baseUrl = error?.config?.baseURL || '';
		const relativeUrl = error?.config?.url || '';
		const fullUrl = `${baseUrl}${relativeUrl}`;

		(error as any).isExpectedAuthFailure = isExpectedAuthFailure(status, fullUrl);
		return Promise.reject(error);
	},
);
