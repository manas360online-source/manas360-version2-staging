import axios, { AxiosInstance } from 'axios';

/**
 * Public HTTP client for unauthenticated API endpoints.
 * Does NOT send auth credentials or attempt token refresh.
 * Safe for public endpoints like /v1/group-therapy/public/sessions
 */

const defaultApiBaseUrl = typeof window === 'undefined'
  ? 'http://localhost:3000/api'
  : '/api';

const rawBaseUrl =
  import.meta.env.VITE_API_BASE_URL?.trim() ||
  import.meta.env.VITE_API_URL?.trim() ||
  defaultApiBaseUrl;

const normalizeBaseUrl = (url: string): string => {
  let normalized = url.trim();
  if (
    typeof window !== 'undefined'
    && /(^|\.)manas360\.com$/i.test(window.location.hostname)
    && normalized.includes('localhost:3000')
  ) {
    return '/api';
  }
  return normalized.replace(/\/+$/, '');
};

const publicHttpInstance: AxiosInstance = axios.create({
  baseURL: normalizeBaseUrl(rawBaseUrl),
  withCredentials: false, // Do NOT send cookies/auth
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000,
});

export const publicHttp = publicHttpInstance;
