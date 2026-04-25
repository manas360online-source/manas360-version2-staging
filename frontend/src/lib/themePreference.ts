export type ThemePreference = 'light' | 'dark';

export const THEME_STORAGE_KEY = 'manas360_theme_preference';

const DARK_CLASS = 'dark';
const DARK_DATA_ATTR = 'dark';
const LIGHT_DATA_ATTR = 'light';

const getSystemDarkMode = (): boolean => {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return false;
  }

  return window.matchMedia('(prefers-color-scheme: dark)').matches;
};

export const getStoredThemePreference = (): ThemePreference | null => {
  if (typeof window === 'undefined') {
    return null;
  }

  const raw = window.localStorage.getItem(THEME_STORAGE_KEY);
  if (raw === 'light' || raw === 'dark') {
    return raw;
  }

  return null;
};

export const resolveTheme = (preference: ThemePreference | null): ThemePreference => {
  if (preference) {
    return preference;
  }

  return getSystemDarkMode() ? 'dark' : 'light';
};

export const applyTheme = (theme: ThemePreference): void => {
  if (typeof document === 'undefined') {
    return;
  }

  const root = document.documentElement;
  root.dataset.theme = theme === 'dark' ? DARK_DATA_ATTR : LIGHT_DATA_ATTR;
  root.classList.toggle(DARK_CLASS, theme === 'dark');
};

export const applyThemePreference = (preference: ThemePreference | null): ThemePreference => {
  const resolved = resolveTheme(preference);
  applyTheme(resolved);
  return resolved;
};

export const persistThemePreference = (preference: ThemePreference): void => {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.setItem(THEME_STORAGE_KEY, preference);
};

export const clearThemePreference = (): void => {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.removeItem(THEME_STORAGE_KEY);
};
