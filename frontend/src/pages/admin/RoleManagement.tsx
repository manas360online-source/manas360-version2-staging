import { useEffect, useState } from 'react';
import { createPlatformAdminAccount, getRoles, updateRolePermissions } from '../../api/admin.api';
import type { Role } from '../../api/admin.api';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { toast } from 'sonner';
import { Switch } from '@/components/ui/Switch';
import { Loader2, ShieldAlert, ShieldCheck } from 'lucide-react';
import { motion } from 'framer-motion';
import { useAuth } from '../../context/AuthContext';

type PlatformAdminRole = 'admin' | 'clinicaldirector' | 'financemanager' | 'complianceofficer';

const platformAdminRoles: PlatformAdminRole[] = ['admin', 'clinicaldirector', 'financemanager', 'complianceofficer'];

const ALL_PERMISSIONS = [
	'dashboard',
	'users_read',
	'users_write',
	'manage_therapists',
	'payouts_approve',
	'pricing_edit',
	'offers_edit',
	'crisis_respond',
	'audit_read',
	'view_analytics',
	'manage_groups',
	'manage_users',
	'manage_payments',
	'manage_corporate',
	'view_system_logs',
	'manage_roles',
	'manage_permissions',
	'system_config',
];

export default function RoleManagement() {
	const { user } = useAuth();
	const [roles, setRoles] = useState<Role[]>([]);
	const [loading, setLoading] = useState(true);
	const [savingRole, setSavingRole] = useState<string | null>(null);
	const [creatingAdmin, setCreatingAdmin] = useState(false);
	const [createResult, setCreateResult] = useState<{
		name: string;
		email: string;
		role: string;
		temporaryPassword: string;
		isNewAccount: boolean;
	} | null>(null);
	const [adminForm, setAdminForm] = useState({
		email: '',
		firstName: '',
		lastName: '',
		role: 'admin' as PlatformAdminRole,
		password: '',
	});

	const normalizedRole = String(user?.role || '').toLowerCase().replace(/_/g, '');
	const isSuperAdmin = normalizedRole === 'superadmin';
	const canEditRoles = isSuperAdmin;

	// Local state to track modified permissions before saving
	const [editedRoles, setEditedRoles] = useState<Record<string, string[]>>({});

	const fetchRoles = async () => {
		try {
			setLoading(true);
			const response = await getRoles();
			if (response.success && response.data) {
				setRoles(response.data);
				const initialEdits: Record<string, string[]> = {};
				response.data.forEach((r: Role) => {
					initialEdits[r.name] = r.permissions || [];
				});
				setEditedRoles(initialEdits);
			} else {
				toast.error('Failed to load roles');
			}
		} catch (error) {
			console.error(error);
			toast.error('Could not fetch roles from server');
		} finally {
			setLoading(false);
		}
	};

	useEffect(() => {
		fetchRoles();
	}, []);

	const handlePermissionToggle = (roleName: string, permission: string) => {
		setEditedRoles(prev => {
			const currentPerms = prev[roleName] || [];
			const hasPerm = currentPerms.includes(permission);

			return {
				...prev,
				[roleName]: hasPerm
					? currentPerms.filter(p => p !== permission)
					: [...currentPerms, permission],
			};
		});
	};

	const handleSave = async (roleName: string) => {
		try {
			setSavingRole(roleName);
			const perms = editedRoles[roleName] || [];
			const response = await updateRolePermissions(roleName, perms);

			if (response.success) {
				toast.success(`Role ${roleName} updated completely.`);
				// Update canonical state
				setRoles(prev =>
					prev.map(r => (r.name === roleName ? { ...r, permissions: perms } : r))
				);
			} else {
				toast.error(`Update failed: ${response.message}`);
			}
		} catch (error) {
			console.error(error);
			toast.error(`Failed to update role ${roleName}`);
		} finally {
			setSavingRole(null);
		}
	};

	const handleCreateAdmin = async (event: React.FormEvent<HTMLFormElement>) => {
		event.preventDefault();

		if (!isSuperAdmin) {
			toast.error('Only superadmin can create platform admins.');
			return;
		}

		if (!adminForm.email.trim()) {
			toast.error('Email is required.');
			return;
		}

		setCreatingAdmin(true);
		setCreateResult(null);

		try {
			const response = await createPlatformAdminAccount({
				email: adminForm.email.trim(),
				firstName: adminForm.firstName.trim() || undefined,
				lastName: adminForm.lastName.trim() || undefined,
				role: adminForm.role,
				password: adminForm.password.trim() || undefined,
			});

			const created = response.data;
			setCreateResult({
				name: `${created.user.firstName} ${created.user.lastName}`.trim() || created.user.email || 'Platform Admin',
				email: created.user.email || adminForm.email.trim(),
				role: created.user.role,
				temporaryPassword: created.temporaryPassword,
				isNewAccount: created.isNewAccount,
			});
			toast.success('Platform admin created successfully.');
			setAdminForm((prev) => ({
				email: '',
				firstName: '',
				lastName: '',
				role: prev.role,
				password: '',
			}));
		} catch (error) {
			toast.error(error instanceof Error ? error.message : 'Unable to create platform admin.');
		} finally {
			setCreatingAdmin(false);
		}
	};

	// Helper to check if a specific role has unsaved changes
	const hasUnsavedChanges = (roleName: string) => {
		const original = roles.find(r => r.name === roleName)?.permissions || [];
		const edited = editedRoles[roleName] || [];
		
		if (original.length !== edited.length) return true;
		
		const sortedOrig = [...original].sort();
		const sortedEdit = [...edited].sort();
		
		return !sortedOrig.every((val, index) => val === sortedEdit[index]);
	};

	if (loading) {
		return (
			<div className="flex items-center justify-center min-h-[400px]">
				<Loader2 className="w-8 h-8 animate-spin text-primary" />
			</div>
		);
	}

	return (
		<div className="space-y-6">
			<div className="flex items-center justify-between">
				<div>
					<h1 className="text-3xl font-bold tracking-tight text-white mb-2">Role Management</h1>
					<p className="text-muted-foreground">
						Dynamically manage RBAC (Role-Based Access Control) across the platform.
					</p>
				</div>
				<Badge variant="secondary" className="px-4 py-2 bg-primary/10 text-primary border-primary/20">
					<ShieldCheck className="w-4 h-4 mr-2" /> Server Synced
				</Badge>
			</div>

			<Card className="overflow-hidden bg-black/40 border-white/10 backdrop-blur-xl">
				<div className="p-6">
					<div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
						<div>
							<h2 className="text-xl font-bold text-white">Invite Platform Admin</h2>
							<p className="text-sm text-muted-foreground">
								Superadmin can invite admin, clinical director, finance manager, and compliance officer accounts.
							</p>
						</div>
						<Badge variant="secondary" className="w-fit bg-white/10 text-white border-white/10">
							{isSuperAdmin ? 'Superadmin access enabled' : 'Read only'}
						</Badge>
					</div>

					{isSuperAdmin ? (
						<form onSubmit={handleCreateAdmin} className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
							<label className="space-y-1">
								<span className="text-xs font-semibold uppercase tracking-wide text-slate-300">Email</span>
								<input
									type="email"
									value={adminForm.email}
									onChange={(event) => setAdminForm((prev) => ({ ...prev, email: event.target.value }))}
									className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none placeholder:text-slate-400 focus:border-sky-400"
									placeholder="admin@manas360.com"
									required
								/>
							</label>
							<label className="space-y-1">
								<span className="text-xs font-semibold uppercase tracking-wide text-slate-300">First Name</span>
								<input
									value={adminForm.firstName}
									onChange={(event) => setAdminForm((prev) => ({ ...prev, firstName: event.target.value }))}
									className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none placeholder:text-slate-400 focus:border-sky-400"
									placeholder="First name"
								/>
							</label>
							<label className="space-y-1">
								<span className="text-xs font-semibold uppercase tracking-wide text-slate-300">Last Name</span>
								<input
									value={adminForm.lastName}
									onChange={(event) => setAdminForm((prev) => ({ ...prev, lastName: event.target.value }))}
									className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none placeholder:text-slate-400 focus:border-sky-400"
									placeholder="Last name"
								/>
							</label>
							<label className="space-y-1">
								<span className="text-xs font-semibold uppercase tracking-wide text-slate-300">Role</span>
								<select
									value={adminForm.role}
									onChange={(event) => setAdminForm((prev) => ({ ...prev, role: event.target.value as PlatformAdminRole }))}
									className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-sky-400"
								>
									{platformAdminRoles.map((role) => (
										<option key={role} value={role} className="text-slate-900">
											{role}
										</option>
									))}
								</select>
							</label>
							<label className="space-y-1">
								<span className="text-xs font-semibold uppercase tracking-wide text-slate-300">Temporary Password</span>
								<input
									value={adminForm.password}
									onChange={(event) => setAdminForm((prev) => ({ ...prev, password: event.target.value }))}
									className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none placeholder:text-slate-400 focus:border-sky-400"
									placeholder="Leave blank to auto-generate and email"
								/>
							</label>
							<div className="md:col-span-2 xl:col-span-5 flex items-center justify-end gap-3">
								<Button
									type="submit"
									disabled={creatingAdmin}
									className="min-w-[180px]"
								>
									{creatingAdmin ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Send Invite'}
								</Button>
							</div>
						</form>
					) : (
						<p className="mt-4 rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-300">
							Only the superadmin account can send platform admin invites.
						</p>
					)}

					{createResult ? (
						<div className="mt-5 rounded-lg border border-emerald-400/20 bg-emerald-500/10 p-4 text-sm text-emerald-100">
							<p className="font-semibold text-emerald-50">Invite sent successfully</p>
							<p className="mt-2">Name: {createResult.name}</p>
							<p>Email: {createResult.email}</p>
							<p>Role: {createResult.role}</p>
							<p>Account: {createResult.isNewAccount ? 'New account' : 'Updated existing account'}</p>
							<p className="mt-2 rounded-md bg-black/20 px-3 py-2 font-mono text-xs text-white">Temporary password: {createResult.temporaryPassword}</p>
						</div>
					) : null}
				</div>
			</Card>

			<div className="grid gap-6">
				{roles.map((role, idx) => {
					const isDirty = hasUnsavedChanges(role.name);
					const isSaving = savingRole === role.name;
					const currentPerms = editedRoles[role.name] || [];

					return (
						<motion.div
							initial={{ opacity: 0, y: 20 }}
							animate={{ opacity: 1, y: 0 }}
							transition={{ delay: idx * 0.1 }}
							key={role.name}
						>
							<Card className="overflow-hidden bg-black/40 border-white/10 backdrop-blur-xl">
								<div className="p-6">
									<div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 pb-6 border-b border-white/5">
										<div>
											<h3 className="text-xl font-bold text-white capitalize flex items-center gap-3">
												{role.name}
												{role.name === 'superadmin' && (
													<Badge variant="destructive" className="bg-red-500/10 text-red-500 border-red-500/20">
														<ShieldAlert className="w-3 h-3 mr-1" /> Core System Role
													</Badge>
												)}
											</h3>
											<p className="text-sm text-muted-foreground mt-1">
												{role.description || `Manage access levels for ${role.name} users.`}
											</p>
										</div>

										<div className="flex items-center gap-3">
											{isDirty && (
												<span className="text-xs text-amber-500 animate-pulse font-medium">
													Unsaved changes
												</span>
											)}
											<Button
												onClick={() => handleSave(role.name)}
												disabled={!canEditRoles || !isDirty || isSaving || role.name === 'superadmin'}
												className="min-w-[100px]"
												variant={isDirty ? 'primary' : 'secondary'}
											>
												{isSaving ? (
													<Loader2 className="w-4 h-4 animate-spin" />
												) : (
													'Save Changes'
												)}
											</Button>
										</div>
									</div>

									<div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
										{ALL_PERMISSIONS.map(permission => {
											const hasPerm = currentPerms.includes(permission);
											return (
												<div
													key={permission}
													className="flex items-center space-x-3 p-3 rounded-lg hover:bg-white/5 transition-colors border border-transparent hover:border-white/5"
												>
													<Switch
														id={`${role.name}-${permission}`}
														checked={hasPerm}
														disabled={!canEditRoles || role.name === 'superadmin' || isSaving}
														onCheckedChange={() => handlePermissionToggle(role.name, permission)}
													/>
													<label
														htmlFor={`${role.name}-${permission}`}
														className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer text-slate-200"
													>
														{permission.replace(/_/g, ' ')}
													</label>
												</div>
											);
										})}
									</div>
								</div>
							</Card>
						</motion.div>
					);
				})}
				
				{roles.length === 0 && (
					<Card className="p-12 text-center bg-black/40 border-white/10 backdrop-blur-xl">
						<ShieldAlert className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
						<h3 className="text-lg font-medium text-white mb-2">No Roles Found</h3>
						<p className="text-muted-foreground">
							The roles mapping was not found in the database.
						</p>
					</Card>
				)}
			</div>
		</div>
	);
}
