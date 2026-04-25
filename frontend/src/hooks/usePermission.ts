import { useMemo } from 'react';
import { useAuth } from '../context/AuthContext';

export function usePermission() {
	const { user, isReady } = useAuth();

	const granted = useMemo(() => new Set((user?.permissions || []).map((perm) => String(perm))), [user?.permissions]);
	const policies = user?.adminPolicies || {};

	const can = (permission: string): boolean => granted.has(String(permission));
	const canAny = (permissions: string[]): boolean => permissions.some((perm) => can(perm));
	const canPolicy = (policyKey: string): boolean => {
		const required = policies[policyKey] || [];
		if (required.length === 0) return false;
		return canAny(required);
	};

	return {
		isReady,
		permissions: granted,
		can,
		canAny,
		canPolicy,
	};
}
