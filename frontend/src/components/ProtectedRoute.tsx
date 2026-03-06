import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

type ProtectedRouteProps = {
	children: ReactNode;
	allowedRoles?: Array<'patient' | 'therapist' | 'psychiatrist' | 'coach' | 'admin'>;
};

export default function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
	const { isAuthenticated, loading, user } = useAuth();
	const location = useLocation();
	const userRole = String(user?.role || '').toLowerCase();

	if (loading) {
		return <div className="p-6 text-center text-slate-600">Checking authentication...</div>;
	}

	if (!isAuthenticated) {
		const redirectPath = `${location.pathname}${location.search}`;
		return <Navigate to="/auth/login" replace state={{ from: redirectPath }} />;
	}

	if (allowedRoles && allowedRoles.length > 0 && !allowedRoles.includes(userRole as any)) {
		const fallback = userRole === 'admin'
			? '/admin-portal/login'
			: userRole === 'psychiatrist'
				? '/psychiatrist/dashboard'
				: userRole === 'therapist' || userRole === 'coach'
				? '/therapist/analytics'
				: '/patient/dashboard';

		return <Navigate to={fallback} replace />;
	}

	return <>{children}</>;
}
