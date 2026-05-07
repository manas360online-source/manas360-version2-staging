import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

type ProtectedRouteProps = {
	children: ReactNode;
	allowedRoles?: Array<
		| 'patient'
		| 'learner'
		| 'therapist'
		| 'psychiatrist'
		| 'psychologist'
		| 'coach'
		| 'admin'
		| 'superadmin'
		| 'clinicaldirector'
		| 'financemanager'
		| 'complianceofficer'
	>;
};

export default function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
	const { isAuthenticated, loading, user } = useAuth();
	const location = useLocation();
	const userRole = String(user?.role || '').toLowerCase().replace(/_/g, '');
	const isProviderRole = userRole === 'learner' || userRole === 'therapist' || userRole === 'psychiatrist' || userRole === 'psychologist' || userRole === 'coach';

	if (loading) {
		return <div className="p-6 text-center text-slate-600">Checking authentication...</div>;
	}

	if (!isAuthenticated) {
		const redirectPath = `${location.pathname}${location.search}`;
		return <Navigate to="/auth/login" replace state={{ from: redirectPath }} />;
	}

	if (allowedRoles && allowedRoles.length > 0 && !allowedRoles.includes(userRole as any)) {
		const isAdminRole =
			userRole === 'admin' ||
			userRole === 'superadmin' ||
			userRole === 'clinicaldirector' ||
			userRole === 'financemanager' ||
			userRole === 'complianceofficer';

		const fallback = isAdminRole
			? '/admin-portal/login'
			: userRole === 'psychologist'
				? '/provider/dashboard'
			: userRole === 'psychiatrist'
				? '/provider/dashboard'
				: userRole === 'therapist' || userRole === 'coach'
				? '/provider/dashboard'
				: '/patient/dashboard';

		return <Navigate to={fallback} replace />;
	}

	if (isProviderRole) {
		if (userRole === 'learner') {
			return <>{children}</>;
		}

		const isProductionBuild = import.meta.env.PROD === true || String(import.meta.env.MODE || '').toLowerCase() === 'production';
		const skipFlagEnabled = (import.meta.env.VITE_SKIP_ONBOARDING || '').toString() === 'true';
		const skipOnboarding = import.meta.env.DEV === true || (!isProductionBuild && skipFlagEnabled);
		if (skipOnboarding) {
			return <>{children}</>;
		}

		const onboardingStatus = String(user?.onboardingStatus || '').toUpperCase();
		const onboardingRoute = '/onboarding/provider-setup';
		const verificationRoute = '/provider/verification-pending';
		const subscriptionRoute = '/provider/subscription';
		const verified = Boolean(user?.isTherapistVerified);

		// NEW: Enforce platform payment BEFORE onboarding
		if (!user?.platformAccessActive) {
			if (location.pathname !== subscriptionRoute) {
				return <Navigate to={subscriptionRoute} replace />;
			}
			return <>{children}</>;
		}

		if (onboardingStatus !== 'COMPLETED') {
			if (location.pathname !== onboardingRoute) {
				return <Navigate to={onboardingRoute} replace />;
			}
		} else {
			if (location.pathname === onboardingRoute) {
				return <Navigate to={verified ? '/provider/dashboard' : verificationRoute} replace />;
			}

			if (!verified && location.pathname !== verificationRoute) {
				return <Navigate to={verificationRoute} replace />;
			}
		}
	}

	return <>{children}</>;
}
