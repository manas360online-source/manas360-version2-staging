const APP_API_BASE_URL = 'https://www.manas360.com/api';

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
  if (isNativeApp()) {
    return APP_API_BASE_URL;
  }

  const envBase = import.meta.env.VITE_API_BASE_URL?.trim();
  if (envBase) {
    return envBase;
  }

  const envApi = import.meta.env.VITE_API_URL?.trim();
  if (envApi) {
    return envApi;
  }

  return '/api';
};
