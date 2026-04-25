import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
	getAdminMetrics,
	getAdminUserById,
	getAdminUsers,
	updateAdminUsersBulkStatus,
	type AdminMetrics,
	type AdminUser,
	type AdminUserDetail,
	type AdminUserRole,
	type AdminUsersMeta,
} from '../../api/admin.api';
import AdminPageLayout from '../../components/admin/AdminPageLayout';
import ActionBar from '../../components/admin/ActionBar';
import AdminTable from '../../components/admin/AdminTable';
import { usePermission } from '../../hooks/usePermission';

const DEFAULT_META: AdminUsersMeta = {
	page: 1,
	limit: 10,
	totalItems: 0,
	totalPages: 0,
	hasNextPage: false,
	hasPrevPage: false,
};

const roleBadgeClass: Record<AdminUserRole, string> = {
	admin: 'bg-red-100 text-red-700',
	complianceofficer: 'bg-sky-100 text-sky-700',
	therapist: 'bg-blue-100 text-blue-700',
	psychiatrist: 'bg-violet-100 text-violet-700',
	coach: 'bg-amber-100 text-amber-700',
	patient: 'bg-emerald-100 text-emerald-700',
};

const numberFormat = new Intl.NumberFormat('en-IN');

type PendingAction = {
	userIds: string[];
	status: 'ACTIVE' | 'SUSPENDED';
	reason: string;
};

const formatDateTime = (value: string): string => {
	const date = new Date(value);
	if (Number.isNaN(date.getTime())) return '-';
	return date.toLocaleString('en-IN', {
		day: '2-digit',
		month: 'short',
		year: 'numeric',
		hour: '2-digit',
		minute: '2-digit',
	});
};

export default function AdminUsersPage() {
	const navigate = useNavigate();
	const { id: selectedUserId } = useParams<{ id?: string }>();
	const { canPolicy, isReady } = usePermission();
	const canManageUsers = canPolicy('users.moderate');

	const [users, setUsers] = useState<AdminUser[]>([]);
	const [meta, setMeta] = useState<AdminUsersMeta>(DEFAULT_META);
	const [metrics, setMetrics] = useState<AdminMetrics | null>(null);
	const [roleFilter, setRoleFilter] = useState<'' | AdminUserRole>('');
	const [statusFilter, setStatusFilter] = useState<'active' | 'deleted'>('active');
	const [search, setSearch] = useState('');
	const [dateFilter, setDateFilter] = useState('');
	const [sortBy, setSortBy] = useState<'createdAt' | 'email' | 'role'>('createdAt');
	const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
	const [isLoading, setIsLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [selectedUser, setSelectedUser] = useState<AdminUserDetail | null>(null);
	const [detailLoading, setDetailLoading] = useState(false);
	const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
	const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
	const [pendingAction, setPendingAction] = useState<PendingAction | null>(null);

	const loadUsers = async (nextPage: number, nextRole = roleFilter, nextStatus = statusFilter): Promise<void> => {
		setIsLoading(true);
		setError(null);

		try {
			const [{ data: usersData }, { data: metricsData }] = await Promise.all([
				getAdminUsers({
					page: nextPage,
					limit: meta.limit,
					role: nextRole || undefined,
					status: nextStatus,
					sortBy,
					sortOrder,
				}),
				getAdminMetrics(),
			]);

			setUsers(usersData.data);
			setMeta(usersData.meta);
			setMetrics(metricsData);
			setSelectedIds(new Set());
		} catch (err) {
			setError(err instanceof Error ? err.message : 'Unable to load users.');
		} finally {
			setIsLoading(false);
		}
	};

	useEffect(() => {
		void loadUsers(1);
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [sortBy, sortOrder]);

	useEffect(() => {
		const hydrateInspector = async (): Promise<void> => {
			if (!selectedUserId) {
				setSelectedUser(null);
				return;
			}
			setDetailLoading(true);
			try {
				const response = await getAdminUserById(selectedUserId);
				setSelectedUser(response.data);
			} catch (err) {
				setError(err instanceof Error ? err.message : 'Unable to load user details.');
			} finally {
				setDetailLoading(false);
			}
		};

		void hydrateInspector();
	}, [selectedUserId]);

	const filteredUsers = useMemo(() => {
		const query = search.trim().toLowerCase();
		const source = !query
			? users
			: users.filter((user) => {
				const fullName = `${user.firstName} ${user.lastName}`.toLowerCase();
				return fullName.includes(query) || user.email.toLowerCase().includes(query) || user.id.toLowerCase().includes(query);
			});

		if (!dateFilter) return source;

		const pivot = new Date(dateFilter);
		if (Number.isNaN(pivot.getTime())) return source;

		return source.filter((user) => {
			const created = new Date(user.createdAt);
			return !Number.isNaN(created.getTime()) && created >= pivot;
		});
	}, [dateFilter, search, users]);

	const allVisibleSelected = filteredUsers.length > 0 && filteredUsers.every((user) => selectedIds.has(user.id));

	const getComputedStatus = (user: AdminUser): 'ACTIVE' | 'SUSPENDED' => {
		const rawStatus = String((user as AdminUser & { status?: string }).status || 'ACTIVE').toUpperCase();
		return rawStatus === 'SUSPENDED' ? 'SUSPENDED' : 'ACTIVE';
	};

	const toggleSelected = (userId: string): void => {
		setSelectedIds((prev) => {
			const next = new Set(prev);
			if (next.has(userId)) {
				next.delete(userId);
			} else {
				next.add(userId);
			}
			return next;
		});
	};

	const toggleAllVisible = (): void => {
		if (allVisibleSelected) {
			setSelectedIds(new Set());
			return;
		}
		setSelectedIds(new Set(filteredUsers.map((user) => user.id)));
	};

	const askForStatusUpdate = (userIds: string[], status: 'ACTIVE' | 'SUSPENDED'): void => {
		if (!canManageUsers) {
			toast.error('You do not have permission to manage users.');
			return;
		}
		if (userIds.length === 0) {
			toast.error('Select at least one user first.');
			return;
		}
		setPendingAction({ userIds, status, reason: '' });
	};

	const executeStatusUpdate = async (): Promise<void> => {
		if (!pendingAction) return;
		if (pendingAction.status === 'SUSPENDED' && pendingAction.reason.trim().length < 3) {
			toast.error('Enter a reason with at least 3 characters.');
			return;
		}

		const prevUsers = users;
		const targetIds = new Set(pendingAction.userIds);
		setUsers((current) =>
			current.map((user) =>
				targetIds.has(user.id)
					? ({ ...user, status: pendingAction.status.toLowerCase() } as AdminUser)
					: user,
			),
		);

		setIsUpdatingStatus(true);
		setError(null);

		try {
			const response = await updateAdminUsersBulkStatus(
				pendingAction.userIds,
				pendingAction.status,
				pendingAction.reason || undefined,
			);

			if (response.data.failedIds.length > 0) {
				const failedSet = new Set(response.data.failedIds);
				setUsers((current) =>
					current.map((user) => {
						if (!failedSet.has(user.id)) return user;
						const previous = prevUsers.find((prevUser) => prevUser.id === user.id);
						return previous ?? user;
					}),
				);
			}

			if (response.data.failedCount > 0) {
				toast(`Updated ${response.data.successCount} users, ${response.data.failedCount} failed.`);
			} else {
				toast.success(`Updated ${response.data.successCount} user${response.data.successCount > 1 ? 's' : ''} to ${pendingAction.status}.`);
			}

			setPendingAction(null);
			await loadUsers(meta.page, roleFilter, statusFilter);
		} catch (err) {
			setUsers(prevUsers);
			const message = err instanceof Error ? err.message : 'Unable to update user status.';
			setError(message);
			toast.error(message);
		} finally {
			setIsUpdatingStatus(false);
		}
	};

	const exportUsersCsv = (): void => {
		const exportRows = filteredUsers.filter((user) => selectedIds.size === 0 || selectedIds.has(user.id));
		if (exportRows.length === 0) {
			toast.error('No users available to export.');
			return;
		}

		const csv = [
			['Name', 'Email', 'Role', 'Status', 'Created At', 'User ID'],
			...exportRows.map((user) => [
				`${user.firstName} ${user.lastName}`.trim() || 'Unnamed user',
				user.email,
				user.role,
				getComputedStatus(user),
				user.createdAt,
				user.id,
			]),
		]
			.map((row) => row.map((value) => `"${String(value).split('"').join('""')}"`).join(','))
			.join('\n');

		const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
		const url = URL.createObjectURL(blob);
		const anchor = document.createElement('a');
		anchor.href = url;
		anchor.download = `admin-users-${new Date().toISOString().slice(0, 10)}.csv`;
		anchor.click();
		URL.revokeObjectURL(url);
		toast.success('Users exported successfully.');
	};

	const handleOpenUser = (userId: string): void => {
		navigate(`/admin/identity/users/${userId}`);
	};

	const closeInspector = (): void => {
		navigate('/admin/identity/users');
	};

	const handlePageChange = async (nextPage: number): Promise<void> => {
		if (nextPage < 1) return;
		await loadUsers(nextPage);
	};

	const handleApplyFilters = async (): Promise<void> => {
		await loadUsers(1);
	};

	const handleSortChange = (nextSortKey: string): void => {
		const casted = nextSortKey as 'createdAt' | 'email' | 'role';
		if (casted === sortBy) {
			setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'));
			return;
		}
		setSortBy(casted);
		setSortOrder('asc');
	};

	const columns = useMemo(
		() => [
			{
				key: 'select',
				head: 'Select',
				render: (user: AdminUser) => (
					<input
						type="checkbox"
						checked={selectedIds.has(user.id)}
						onChange={() => toggleSelected(user.id)}
						aria-label={`Select ${user.email}`}
					/>
				),
			},
			{
				key: 'user',
				head: 'User',
				sortable: true,
				sortKey: 'email',
				render: (user: AdminUser) => {
					const fullName = `${user.firstName} ${user.lastName}`.trim();
					return (
						<div>
							<p className="text-sm font-semibold text-ink-800">{fullName || 'Unnamed user'}</p>
							<p className="text-xs text-ink-500">{user.email}</p>
							<p className="mt-1 text-[11px] text-ink-400">ID: {user.id.slice(0, 8)}...</p>
						</div>
					);
				},
			},
			{
				key: 'role',
				head: 'Role',
				sortable: true,
				sortKey: 'role',
				render: (user: AdminUser) => (
					<span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${roleBadgeClass[user.role]}`}>
						{user.role}
					</span>
				),
			},
			{
				key: 'status',
				head: 'Status',
				render: (user: AdminUser) => (
					<span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${getComputedStatus(user) === 'ACTIVE' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
						{getComputedStatus(user)}
					</span>
				),
			},
			{
				key: 'created',
				head: 'Created',
				sortable: true,
				sortKey: 'createdAt',
				render: (user: AdminUser) => <span className="text-xs text-ink-600">{formatDateTime(user.createdAt)}</span>,
			},
			{
				key: 'actions',
				head: 'Actions',
				render: (user: AdminUser) => (
					<div className="flex flex-wrap gap-2">
						<button
							onClick={() => {
								handleOpenUser(user.id);
							}}
							className="rounded-md border border-ink-200 px-2.5 py-1.5 text-xs font-medium text-ink-700 transition hover:bg-ink-50"
						>
							View
						</button>
						<button
							disabled={!canManageUsers || isUpdatingStatus}
							title={!canManageUsers ? "You don't have permission" : undefined}
							onClick={() => askForStatusUpdate([user.id], 'SUSPENDED')}
							className="rounded-md border border-rose-200 bg-rose-50 px-2.5 py-1.5 text-xs font-medium text-rose-700 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-50"
						>
							Suspend
						</button>
						<button
							disabled={!canManageUsers || isUpdatingStatus}
							title={!canManageUsers ? "You don't have permission" : undefined}
							onClick={() => askForStatusUpdate([user.id], 'ACTIVE')}
							className="rounded-md border border-emerald-200 bg-emerald-50 px-2.5 py-1.5 text-xs font-medium text-emerald-700 transition hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-50"
						>
							Activate
						</button>
					</div>
				),
			},
		],
		[canManageUsers, isUpdatingStatus, selectedIds],
	);

	if (!isReady) {
		return null;
	}

	return (
		<AdminPageLayout
			title="Users"
			description="Action-oriented identity operations with bulk controls, deep links, and moderation confirmation."
			actions={
				<>
					<input
						value={search}
						onChange={(event) => setSearch(event.target.value)}
						placeholder="Search users"
						className="rounded-lg border border-ink-100 bg-white px-3 py-2 text-sm text-ink-700 outline-none ring-sage-500 transition focus:ring-2"
					/>
					<select
						value={roleFilter}
						onChange={(event) => setRoleFilter(event.target.value as '' | AdminUserRole)}
						className="rounded-lg border border-ink-100 bg-white px-3 py-2 text-sm text-ink-700 outline-none ring-sage-500 transition focus:ring-2"
					>
						<option value="">All roles</option>
						<option value="admin">Admin</option>
						<option value="therapist">Therapist</option>
						<option value="psychiatrist">Psychiatrist</option>
						<option value="coach">Coach</option>
						<option value="patient">Patient</option>
					</select>
					<select
						value={statusFilter}
						onChange={(event) => setStatusFilter(event.target.value as 'active' | 'deleted')}
						className="rounded-lg border border-ink-100 bg-white px-3 py-2 text-sm text-ink-700 outline-none ring-sage-500 transition focus:ring-2"
					>
						<option value="active">Active</option>
						<option value="deleted">Deleted</option>
					</select>
					<input
						type="date"
						value={dateFilter}
						onChange={(event) => setDateFilter(event.target.value)}
						className="rounded-lg border border-ink-100 bg-white px-3 py-2 text-sm text-ink-700 outline-none ring-sage-500 transition focus:ring-2"
					/>
					<button
						onClick={() => {
							void handleApplyFilters();
						}}
						className="rounded-lg bg-sage-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-sage-700"
					>
						Apply
					</button>
				</>
			}
		>
			<ActionBar>
				<div className="rounded-md bg-ink-50 px-2 py-1 text-xs text-ink-600">Selected: {selectedIds.size}</div>
				<button
					onClick={toggleAllVisible}
					className="rounded-md border border-ink-200 px-3 py-1.5 text-xs font-medium text-ink-700 transition hover:bg-ink-50"
				>
					{allVisibleSelected ? 'Clear Selection' : 'Select Visible'}
				</button>
				<button
					disabled={!canManageUsers || isUpdatingStatus || selectedIds.size === 0}
					title={!canManageUsers ? "You don't have permission" : undefined}
					onClick={() => askForStatusUpdate(Array.from(selectedIds), 'SUSPENDED')}
					className="rounded-md border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-medium text-rose-700 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-50"
				>
					Suspend Selected
				</button>
				<button
					disabled={!canManageUsers || isUpdatingStatus || selectedIds.size === 0}
					title={!canManageUsers ? "You don't have permission" : undefined}
					onClick={() => askForStatusUpdate(Array.from(selectedIds), 'ACTIVE')}
					className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-700 transition hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-50"
				>
					Activate Selected
				</button>
				<button
					onClick={exportUsersCsv}
					className="rounded-md border border-ink-200 px-3 py-1.5 text-xs font-medium text-ink-700 transition hover:bg-ink-50"
				>
					Export Selected
				</button>
				{isUpdatingStatus ? <div className="text-xs text-sage-700">Processing {pendingAction?.userIds.length ?? selectedIds.size} users...</div> : null}
			</ActionBar>

			<div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
				<StatCard label="Total Users" value={numberFormat.format(metrics?.totalUsers ?? meta.totalItems)} />
				<StatCard label="Therapists" value={numberFormat.format(metrics?.totalTherapists ?? 0)} />
				<StatCard label="Verified Therapists" value={numberFormat.format(metrics?.verifiedTherapists ?? 0)} />
				<StatCard label="Active Subscriptions" value={numberFormat.format(metrics?.activeSubscriptions ?? 0)} />
			</div>

			{error ? <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div> : null}

			{meta.totalItems === 0 && !isLoading ? (
				<div className="rounded-xl border border-dashed border-ink-200 bg-white p-8 text-center">
					<h3 className="font-display text-lg font-bold text-ink-800">No users yet</h3>
					<p className="mt-2 text-sm text-ink-500">Create your first user to start onboarding tenant admins and operations owners.</p>
					<button
						onClick={() => navigate('/admin/identity/approvals')}
						className="mt-4 rounded-lg bg-sage-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-sage-700"
					>
						Go To Approvals
					</button>
				</div>
			) : null}

			<AdminTable
				columns={columns}
				rows={filteredUsers}
				rowKey={(row) => row.id}
				loading={isLoading}
				emptyText="No users found for this filter."
				loadingText="Loading users..."
				sortBy={sortBy}
				sortOrder={sortOrder}
				onSortChange={handleSortChange}
			/>

			<div className="mt-2 flex items-center justify-between rounded-xl border border-ink-100 bg-white px-4 py-3 text-sm">
				<p className="text-ink-500">
					Page <span className="font-semibold text-ink-700">{meta.page}</span> of <span className="font-semibold text-ink-700">{meta.totalPages || 1}</span>
				</p>
				<div className="flex gap-2">
					<button
						disabled={!meta.hasPrevPage || isLoading}
						onClick={() => {
							void handlePageChange(meta.page - 1);
						}}
						className="rounded-md border border-ink-200 px-3 py-1.5 text-xs font-medium text-ink-700 transition hover:bg-ink-50 disabled:cursor-not-allowed disabled:opacity-50"
					>
						Previous
					</button>
					<button
						disabled={!meta.hasNextPage || isLoading}
						onClick={() => {
							void handlePageChange(meta.page + 1);
						}}
						className="rounded-md border border-ink-200 px-3 py-1.5 text-xs font-medium text-ink-700 transition hover:bg-ink-50 disabled:cursor-not-allowed disabled:opacity-50"
					>
						Next
					</button>
				</div>
			</div>

			{selectedUser ? (
				<aside className="fixed right-0 top-0 z-40 h-full w-full max-w-md border-l border-ink-100 bg-white p-5 shadow-soft-lg">
					<div className="flex items-start justify-between">
						<div>
							<h3 className="font-display text-lg font-bold text-ink-800">User Inspector</h3>
							<p className="text-xs text-ink-500">URL: /admin/identity/users/{selectedUser.id}</p>
						</div>
						<button
							onClick={closeInspector}
							className="rounded-md border border-ink-200 px-2 py-1 text-xs text-ink-600 hover:bg-ink-50"
						>
							Close
						</button>
					</div>

					{detailLoading ? <p className="mt-6 text-sm text-ink-500">Loading user detail...</p> : null}

					{!detailLoading ? (
						<div className="mt-4 space-y-3 text-sm">
							<DetailRow label="User ID" value={selectedUser.id} />
							<DetailRow label="Name" value={`${selectedUser.firstName} ${selectedUser.lastName}`.trim() || 'Unnamed user'} />
							<DetailRow label="Email" value={selectedUser.email} />
							<DetailRow label="Role" value={selectedUser.role} capitalize />
							<DetailRow label="Created" value={formatDateTime(selectedUser.createdAt)} />
							<DetailRow label="Updated" value={formatDateTime(selectedUser.updatedAt)} />
							<div className="mt-4 flex gap-2">
								<button
									disabled={!canManageUsers || isUpdatingStatus}
									title={!canManageUsers ? "You don't have permission" : undefined}
									onClick={() => askForStatusUpdate([selectedUser.id], 'SUSPENDED')}
									className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-medium text-rose-700 hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-50"
								>
									Suspend User
								</button>
								<button
									disabled={!canManageUsers || isUpdatingStatus}
									title={!canManageUsers ? "You don't have permission" : undefined}
									onClick={() => askForStatusUpdate([selectedUser.id], 'ACTIVE')}
									className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-700 hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-50"
								>
									Activate User
								</button>
							</div>
						</div>
					) : null}
				</aside>
			) : null}

			{pendingAction ? (
				<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
					<div className="w-full max-w-lg rounded-xl border border-ink-100 bg-white p-5 shadow-soft-lg">
						<h3 className="font-display text-lg font-bold text-ink-800">Confirm Action</h3>
						<p className="mt-1 text-sm text-ink-600">
							Are you sure you want to set {pendingAction.userIds.length} user{pendingAction.userIds.length > 1 ? 's' : ''} to {pendingAction.status}?
						</p>
						<textarea
							value={pendingAction.reason}
							onChange={(event) =>
								setPendingAction((prev) => (prev ? { ...prev, reason: event.target.value } : prev))
							}
							placeholder="Reason (required for suspension)"
							className="mt-3 min-h-24 w-full rounded-lg border border-ink-100 px-3 py-2 text-sm text-ink-700 outline-none ring-sage-500 transition focus:ring-2"
						/>
						<div className="mt-4 flex justify-end gap-2">
							<button
								onClick={() => setPendingAction(null)}
								className="rounded-md border border-ink-200 px-3 py-2 text-xs font-medium text-ink-700 hover:bg-ink-50"
							>
								Cancel
							</button>
							<button
								disabled={isUpdatingStatus}
								onClick={() => {
									void executeStatusUpdate();
								}}
								className="rounded-md bg-sage-600 px-3 py-2 text-xs font-semibold text-white hover:bg-sage-700 disabled:cursor-not-allowed disabled:opacity-50"
							>
								Confirm
							</button>
						</div>
					</div>
				</div>
			) : null}
		</AdminPageLayout>
	);
}

function StatCard({ label, value }: { label: string; value: string }) {
	return (
		<div className="rounded-xl border border-ink-100 bg-white p-4">
			<p className="text-[11px] font-semibold uppercase tracking-wide text-ink-500">{label}</p>
			<p className="mt-1 font-display text-xl font-bold text-ink-800">{value}</p>
		</div>
	);
}

function DetailRow({ label, value, capitalize = false }: { label: string; value: string; capitalize?: boolean }) {
	return (
		<div>
			<p className="text-[11px] uppercase tracking-wide text-ink-500">{label}</p>
			<p className={`mt-0.5 text-sm text-ink-800 ${capitalize ? 'capitalize' : ''}`}>{value}</p>
		</div>
	);
}
