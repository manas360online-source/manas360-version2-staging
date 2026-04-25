const APP_API_BASE_URL = 'https://www.manas360.com/api';

const getWindowOrigin = (): string => {
  if (typeof window === 'undefined') {
    return 'https://www.manas360.com';
  }

  return window.location.origin;
};

const stripTrailingApiSegment = (value: string): string => value.replace(/\/api\/?$/i, '');

const getDefaultWebsocketUrl = (): string => {
  const origin = getWindowOrigin();
  let wsUrl = origin.replace(/^https:/i, 'wss:').replace(/^http:/i, 'ws:');
  
  if (import.meta.env.DEV && wsUrl.includes('localhost')) {
    wsUrl = wsUrl.replace(/:\d+$/, ':5001');
  }
  
  return wsUrl;
};

const toWebsocketOrigin = (value: string): string => value.replace(/^https:/i, 'wss:').replace(/^http:/i, 'ws:');

export const API_BASE = '/api';

export const API_MDC_BASE = '/api/mdc';

export const FRONTEND_URL = import.meta.env.VITE_FRONTEND_URL?.trim() || getWindowOrigin();

export const WS_BASE = import.meta.env.VITE_WS_URL?.trim() || getDefaultWebsocketUrl();

export const AI_ENGINE_WS_URL = import.meta.env.VITE_AI_ENGINE_WS_URL?.trim() || `${toWebsocketOrigin(stripTrailingApiSegment(FRONTEND_URL))}/ai-engine`;

const getWindowCapacitor = (): any => {
  if (typeof window === 'undefined') {
    return null;
  }
  return (window as any).Capacitor || null;
};

export const isNativeApp = (): boolean => {
  if (typeof window === 'undefined') {
    return false;
  }

  const protocol = String(window.location.protocol || '').toLowerCase();
  if (protocol === 'capacitor:') {
    return true;
  }

  const capacitor = getWindowCapacitor();
  if (!capacitor) {
    return false;
  }

  if (typeof capacitor.isNativePlatform === 'function') {
    return Boolean(capacitor.isNativePlatform());
  }

  if (typeof capacitor.getPlatform === 'function') {
    const platform = String(capacitor.getPlatform() || '').toLowerCase();
    return platform === 'android' || platform === 'ios';
  }

  return false;
};

export const getApiBaseUrl = (): string => {
  const appEnv = String(import.meta.env.VITE_APP_ENV || '').trim().toLowerCase();
  if (import.meta.env.DEV || appEnv === 'development') {
    return '/api';
  }

  const envBase = import.meta.env.VITE_API_BASE_URL?.trim();
  if (envBase) {
    return envBase;
  }

  const envApi = import.meta.env.VITE_API_URL?.trim();
  if (envApi) {
    return envApi;
  }

  if (isNativeApp()) {
    return APP_API_BASE_URL;
  }

  return '/api';
};
