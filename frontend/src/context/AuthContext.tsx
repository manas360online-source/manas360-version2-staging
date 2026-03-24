import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import {
  login as loginApi,
  logout as logoutApi,
  me as meApi,
  register as registerApi,
  type AuthUser,
} from '../api/auth';

export type AppRole = 'patient' | 'therapist' | 'psychiatrist' | 'psychologist' | 'coach' | 'admin';

const normalizeRole = (value: unknown): AppRole | null => {
  if (typeof value !== 'string') {
    return null;
  }

  const normalized = value.toLowerCase();
  if (
    normalized === 'patient' ||
    normalized === 'therapist' ||
    normalized === 'psychiatrist' ||
    normalized === 'psychologist' ||
    normalized === 'coach' ||
    normalized === 'admin'
  ) {
    return normalized;
  }

  return null;
};

export const getDefaultRouteForRole = (role: unknown): string => {
  const normalizedRole = normalizeRole(role);
  if (normalizedRole === 'psychologist') return '/provider/dashboard';
  if (normalizedRole === 'admin') return '/admin/dashboard';
  if (normalizedRole === 'psychiatrist') return '/provider/dashboard';
  if (normalizedRole === 'therapist' || normalizedRole === 'coach') return '/provider/dashboard';
  return '/patient/dashboard';
};

const isProviderRole = (role: unknown): boolean => {
  const normalizedRole = normalizeRole(role);
  return normalizedRole === 'therapist' || normalizedRole === 'psychiatrist' || normalizedRole === 'psychologist' || normalizedRole === 'coach';
};

const toBoolean = (value: unknown): boolean => value === true || value === 'true' || value === 1 || value === '1';

export const hasCorporateAccess = (user: AuthUser | null | undefined): boolean => {
  if (!user) return false;

  const explicitAdminFlag = toBoolean(user.isCompanyAdmin) || toBoolean(user.is_company_admin);
  if (explicitAdminFlag) return true;

  // Fallback for legacy payloads that expose company key but not the boolean flag.
  const companyKey = user.companyKey ?? user.company_key;
  return typeof companyKey === 'string' && companyKey.trim().length > 0;
};

export const isPlatformAdminUser = (user: AuthUser | null | undefined): boolean => {
  if (!user) return false;
  return normalizeRole(user.role) === 'admin' && !hasCorporateAccess(user);
};

export const getPostLoginRoute = (user: AuthUser | null | undefined): string => {
  if (!user) return '/patient/dashboard';

  if (hasCorporateAccess(user)) {
    return '/corporate/dashboard';
  }

  if (isPlatformAdminUser(user)) {
    return '/admin/dashboard';
  }

  if (isProviderRole(user.role)) {
    // Dev/testing bypass only: never allow onboarding skip in production builds.
    const isProductionBuild = import.meta.env.PROD === true || String(import.meta.env.MODE || '').toLowerCase() === 'production';
    const skipFlagEnabled = (import.meta.env.VITE_SKIP_ONBOARDING || '').toString() === 'true';
    const skipOnboarding = import.meta.env.DEV === true || (!isProductionBuild && skipFlagEnabled);
    if (skipOnboarding) return '/provider/dashboard';
    const onboardingStatus = String(user.onboardingStatus || '').toUpperCase();

    if (onboardingStatus !== 'COMPLETED') {
      return '/onboarding/provider-setup';
    }
    if (!user.isTherapistVerified) {
      return '/provider/verification-pending';
    }
    return '/provider/dashboard';
  }

  return getDefaultRouteForRole(user.role);
};

type AuthContextValue = {
  user: AuthUser | null;
  loading: boolean;
  isAuthenticated: boolean;
  login: (identifier: string, password: string) => Promise<AuthUser>;
  register: (email: string, password: string, name: string, role: 'patient' | 'therapist' | 'psychiatrist' | 'coach') => Promise<void>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
};

type AuthContextGlobal = typeof globalThis & {
  __MANAS360_AUTH_CONTEXT__?: React.Context<AuthContextValue | null>;
};

const authContextGlobal = globalThis as AuthContextGlobal;

// Keep a single context instance across Vite HMR updates.
const AuthContext = authContextGlobal.__MANAS360_AUTH_CONTEXT__ ?? createContext<AuthContextValue | null>(null);
if (!authContextGlobal.__MANAS360_AUTH_CONTEXT__) {
  authContextGlobal.__MANAS360_AUTH_CONTEXT__ = AuthContext;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const hasCheckedInitialAuthRef = useRef(false);
  const authProbeBlockKey = 'manas360.auth.probe.blocked';

  const hasSessionHint = useCallback((): boolean => {
    if (typeof document === 'undefined') {
      return false;
    }

    if (typeof window !== 'undefined' && window.sessionStorage.getItem(authProbeBlockKey) === '1') {
      return false;
    }

    const csrfCookieName = (import.meta.env.VITE_CSRF_COOKIE_NAME || 'csrf_token').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return new RegExp(`(?:^|; )${csrfCookieName}=`).test(document.cookie);
  }, [authProbeBlockKey]);

  const clearSessionHint = useCallback((): void => {
    if (typeof document === 'undefined') {
      return;
    }

    const csrfCookieName = import.meta.env.VITE_CSRF_COOKIE_NAME || 'csrf_token';
    document.cookie = `${csrfCookieName}=; Max-Age=0; path=/`;
    document.cookie = `${csrfCookieName}=; Max-Age=0; path=/api`;

    if (typeof window !== 'undefined') {
      window.sessionStorage.removeItem(authProbeBlockKey);
    }
  }, [authProbeBlockKey]);

  const checkAuth = useCallback(async () => {
    if (!hasSessionHint()) {
      setUser(null);
      setLoading(false);
      return;
    }

    try {
      const currentUser = await meApi();
      setUser(currentUser);
    } catch (error: any) {
      setUser(null);
      clearSessionHint();
      if (typeof window !== 'undefined' && error?.response?.status === 401) {
        window.sessionStorage.setItem(authProbeBlockKey, '1');
      }
    } finally {
      setLoading(false);
    }
	}, [hasSessionHint, clearSessionHint, authProbeBlockKey]);

  useEffect(() => {
    if (hasCheckedInitialAuthRef.current) {
      return;
    }

    hasCheckedInitialAuthRef.current = true;
    void checkAuth();
  }, [checkAuth]);

  const login = useCallback(async (identifier: string, password: string) => {
    await loginApi({ identifier, password });

    // Confirm session cookies are accepted by browser before marking user as authenticated.
    try {
      const currentUser = await meApi();
      setUser(currentUser);
      if (typeof window !== 'undefined') {
        window.sessionStorage.removeItem(authProbeBlockKey);
      }
      return currentUser;
    } catch (error: any) {
      setUser(null);
      clearSessionHint();
      throw new Error(
        'Login succeeded but session could not be established. Please enable cookies and retry.',
      );
    }
  }, [authProbeBlockKey]);

  const register = useCallback(async (email: string, password: string, name: string, role: 'patient' | 'therapist' | 'psychiatrist' | 'coach') => {
    await registerApi({ email, password, name, role });
  }, []);

  const logout = useCallback(async () => {
    try {
      await logoutApi();
    } catch {
      // keep frontend state consistent even if backend session already expired
    } finally {
      setUser(null);
      clearSessionHint();
    }
  }, [clearSessionHint]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      loading,
      isAuthenticated: !!user,
      login,
      register,
      logout,
      checkAuth,
    }),
    [user, loading, login, register, logout, checkAuth],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

export default AuthProvider;
