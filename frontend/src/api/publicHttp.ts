import axios, { AxiosInstance } from 'axios';
import { getApiBaseUrl } from '../lib/runtimeEnv';

/**
 * Public HTTP client for unauthenticated API endpoints.
 * Does NOT send auth credentials or attempt token refresh.
 * Safe for public endpoints like /v1/group-therapy/public/sessions
 */

const baseURL = getApiBaseUrl();

const publicHttpInstance: AxiosInstance = axios.create({
  baseURL,
  withCredentials: false, // Do NOT send cookies/auth
  headers: {
    'Content-Type': 'application/json',
    'Authorization': '', // Explicitly empty to override any default auth
    'x-csrf-token': '', // Explicitly empty CSRF token
  },
  timeout: 30000,
});

// Add interceptor to ensure no auth headers are sent
publicHttpInstance.interceptors.request.use((config: any) => {
  // Remove any Authorization header that might have been added
  delete config.headers.Authorization;
  delete config.headers['x-csrf-token'];
  delete config.headers['x-auth-token'];

  // Ensure credentials are not sent
  config.withCredentials = false;

  return config;
});

export const publicHttp = publicHttpInstance;
