import { useEffect, useMemo, useState } from 'react';
import { getAdminMetrics, getAdminUserById, getAdminUsers, type AdminMetrics, type AdminUser, type AdminUserDetail, type AdminUserRole, type AdminUsersMeta } from '../../api/admin.api';

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
	const [users, setUsers] = useState<AdminUser[]>([]);
	const [meta, setMeta] = useState<AdminUsersMeta>(DEFAULT_META);
	const [metrics, setMetrics] = useState<AdminMetrics | null>(null);
	const [roleFilter, setRoleFilter] = useState<'' | AdminUserRole>('');
	const [statusFilter, setStatusFilter] = useState<'active' | 'deleted'>('active');
	const [search, setSearch] = useState('');
	const [isLoading, setIsLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [selectedUser, setSelectedUser] = useState<AdminUserDetail | null>(null);
	const [detailLoading, setDetailLoading] = useState(false);

	const loadUsers = async (nextPage: number, nextRole = roleFilter, nextStatus = statusFilter): Promise<void> => {
		setIsLoading(true);
		setError(null);

		try {
			const [{ data: usersData }, { data: metricsData }] = await Promise.all([
				getAdminUsers({ page: nextPage, limit: meta.limit, role: nextRole || undefined, status: nextStatus }),
				getAdminMetrics(),
			]);

			setUsers(usersData.data);
			setMeta(usersData.meta);
			setMetrics(metricsData);
		} catch (err) {
			setError(err instanceof Error ? err.message : 'Unable to load users.');
		} finally {
			setIsLoading(false);
		}
	};

	useEffect(() => {
		void loadUsers(1);
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	const filteredUsers = useMemo(() => {
		const query = search.trim().toLowerCase();
		if (!query) return users;

		return users.filter((user) => {
			const fullName = `${user.firstName} ${user.lastName}`.toLowerCase();
			return fullName.includes(query) || user.email.toLowerCase().includes(query) || user.id.toLowerCase().includes(query);
		});
	}, [search, users]);

	const handleApplyFilters = async (): Promise<void> => {
		setSelectedUser(null);
		await loadUsers(1);
	};

	const handleOpenUser = async (userId: string): Promise<void> => {
		setDetailLoading(true);
		setError(null);
		try {
			const response = await getAdminUserById(userId);
			setSelectedUser(response.data);
		} catch (err) {
			setError(err instanceof Error ? err.message : 'Unable to load user details.');
		} finally {
			setDetailLoading(false);
		}
	};

	const handlePageChange = async (nextPage: number): Promise<void> => {
		if (nextPage < 1) return;
		await loadUsers(nextPage);
	};

	return (
		<div className="space-y-4">
			<div className="rounded-xl border border-ink-100 bg-white p-5">
				<div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
					<div>
						<h2 className="font-display text-xl font-bold text-ink-800">All Users</h2>
						<p className="mt-1 text-sm text-ink-600">Operational view of platform accounts with role/status filters and user-level profile inspection.</p>
					</div>
					<div className="grid grid-cols-1 gap-2 sm:grid-cols-4">
						<input
							value={search}
							onChange={(event) => setSearch(event.target.value)}
							placeholder="Search current page"
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
						<button
							onClick={() => {
								void handleApplyFilters();
							}}
							className="rounded-lg bg-sage-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-sage-700"
						>
							Apply
						</button>
					</div>
				</div>
			</div>

			<div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
				<StatCard label="Total Users" value={numberFormat.format(metrics?.totalUsers ?? meta.totalItems)} />
				<StatCard label="Therapists" value={numberFormat.format(metrics?.totalTherapists ?? 0)} />
				<StatCard label="Verified Therapists" value={numberFormat.format(metrics?.verifiedTherapists ?? 0)} />
				<StatCard label="Active Subscriptions" value={numberFormat.format(metrics?.activeSubscriptions ?? 0)} />
			</div>

			{error ? <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div> : null}

			<div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.55fr_1fr]">
				<div className="overflow-hidden rounded-xl border border-ink-100 bg-white">
					<div className="overflow-x-auto">
						<table className="min-w-full divide-y divide-ink-100">
							<thead className="bg-ink-50">
								<tr>
									<th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-ink-500">User</th>
									<th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-ink-500">Role</th>
									<th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-ink-500">Created</th>
									<th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-ink-500">Action</th>
								</tr>
							</thead>
							<tbody className="divide-y divide-ink-100 bg-white">
								{isLoading ? (
									<tr>
										<td colSpan={4} className="px-4 py-8 text-center text-sm text-ink-500">Loading users...</td>
									</tr>
								) : filteredUsers.length === 0 ? (
									<tr>
										<td colSpan={4} className="px-4 py-8 text-center text-sm text-ink-500">No users found for this filter.</td>
									</tr>
								) : (
									filteredUsers.map((user) => {
										const fullName = `${user.firstName} ${user.lastName}`.trim();
										return (
											<tr key={user.id} className="align-top">
												<td className="px-4 py-3">
													<p className="text-sm font-semibold text-ink-800">{fullName || 'Unnamed user'}</p>
													<p className="text-xs text-ink-500">{user.email}</p>
													<p className="mt-1 text-[11px] text-ink-400">ID: {user.id.slice(0, 8)}...</p>
												</td>
												<td className="px-4 py-3">
													<span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${roleBadgeClass[user.role]}`}>
														{user.role}
													</span>
												</td>
												<td className="px-4 py-3 text-xs text-ink-600">{formatDateTime(user.createdAt)}</td>
												<td className="px-4 py-3">
													<button
														onClick={() => {
															void handleOpenUser(user.id);
														}}
														className="rounded-md border border-ink-200 px-2.5 py-1.5 text-xs font-medium text-ink-700 transition hover:bg-ink-50"
													>
														View
													</button>
												</td>
											</tr>
										);
									})
								)}
							</tbody>
						</table>
					</div>

					<div className="flex items-center justify-between border-t border-ink-100 px-4 py-3 text-sm">
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
				</div>

				<div className="rounded-xl border border-ink-100 bg-white p-4">
					<h3 className="font-display text-base font-bold text-ink-800">User Profile Inspector</h3>
					<p className="mt-1 text-xs text-ink-500">Click any user row to inspect role, timestamps, and identity details.</p>

					{detailLoading ? <p className="mt-6 text-sm text-ink-500">Loading user detail...</p> : null}

					{!detailLoading && selectedUser ? (
						<div className="mt-4 space-y-3 text-sm">
							<DetailRow label="User ID" value={selectedUser.id} />
							<DetailRow label="Name" value={`${selectedUser.firstName} ${selectedUser.lastName}`.trim() || 'Unnamed user'} />
							<DetailRow label="Email" value={selectedUser.email} />
							<DetailRow label="Role" value={selectedUser.role} capitalize />
							<DetailRow label="Created" value={formatDateTime(selectedUser.createdAt)} />
							<DetailRow label="Updated" value={formatDateTime(selectedUser.updatedAt)} />
						</div>
					) : null}

					{!detailLoading && !selectedUser ? (
						<div className="mt-6 rounded-lg border border-dashed border-ink-200 px-3 py-6 text-center text-sm text-ink-500">No user selected yet.</div>
					) : null}
				</div>
			</div>
		</div>
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
