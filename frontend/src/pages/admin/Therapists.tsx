import { useEffect, useMemo, useState } from 'react';
import { approveProvider, getAdminUsers, verifyAdminTherapist, type AdminUser, type AdminUserRole } from '../../api/admin.api';

const therapistRoles: AdminUserRole[] = ['therapist', 'psychiatrist', 'coach'];

export default function AdminTherapistsPage() {
	const [therapists, setTherapists] = useState<AdminUser[]>([]);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [search, setSearch] = useState('');
	const [actionId, setActionId] = useState<string | null>(null);

	const load = async () => {
		setLoading(true);
		setError(null);
		try {
			const responses = await Promise.all(therapistRoles.map((role) => getAdminUsers({ page: 1, limit: 100, role })));
			const items = responses.flatMap((response) => response.data.data);
			setTherapists(items);
		} catch (err) {
			setError(err instanceof Error ? err.message : 'Failed to load therapist list');
		} finally {
			setLoading(false);
		}
	};

	useEffect(() => {
		void load();
	}, []);

	const filtered = useMemo(() => {
		const query = search.trim().toLowerCase();
		if (!query) return therapists;
		return therapists.filter((user) => {
			const fullName = `${user.firstName} ${user.lastName}`.toLowerCase();
			return fullName.includes(query) || user.email.toLowerCase().includes(query) || user.id.toLowerCase().includes(query);
		});
	}, [search, therapists]);

	const handleVerify = async (userId: string, role: AdminUserRole) => {
		setActionId(userId);
		try {
			if (role === 'therapist') {
				await verifyAdminTherapist(userId);
			} else {
				await approveProvider(userId);
			}
			await load();
		} catch (err) {
			setError(err instanceof Error ? err.message : 'Verification failed');
		} finally {
			setActionId(null);
		}
	};

	return (
		<div className="space-y-4">
			<div className="rounded-xl border border-ink-100 bg-white p-5">
				<div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
					<div>
						<h2 className="font-display text-xl font-bold text-ink-800">Therapists</h2>
						<p className="mt-1 text-sm text-ink-600">Manage provider verification and onboarding approvals.</p>
					</div>
					<div className="flex items-center gap-2">
						<input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search therapists..." className="rounded-lg border border-ink-100 bg-white px-3 py-2 text-sm text-ink-700 outline-none focus:ring-2 focus:ring-sage-500" />
						<button onClick={() => void load()} className="rounded-lg bg-sage-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-sage-700">Refresh</button>
					</div>
				</div>
			</div>

			<div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
				<StatCard label="Providers" value={String(therapists.length)} />
				<StatCard label="Therapists" value={String(therapists.filter((user) => user.role === 'therapist').length)} />
				<StatCard label="Psychiatrists" value={String(therapists.filter((user) => user.role === 'psychiatrist').length)} />
				<StatCard label="Coaches" value={String(therapists.filter((user) => user.role === 'coach').length)} />
			</div>

			{error ? <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div> : null}

			<div className="overflow-hidden rounded-xl border border-ink-100 bg-white">
				<div className="overflow-x-auto">
					<table className="min-w-full divide-y divide-ink-100">
						<thead className="bg-ink-50">
							<tr>
								<th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-ink-500">Therapist</th>
								<th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-ink-500">Role</th>
								<th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-ink-500">Onboarding</th>
								<th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-ink-500">Joined</th>
								<th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-ink-500">Action</th>
							</tr>
						</thead>
						<tbody className="divide-y divide-ink-100 bg-white">
							{loading ? (
								<tr><td colSpan={5} className="px-4 py-8 text-center text-sm text-ink-500">Loading therapists...</td></tr>
							) : filtered.length === 0 ? (
								<tr><td colSpan={5} className="px-4 py-8 text-center text-sm text-ink-500">No therapists found.</td></tr>
							) : filtered.map((user) => {
								const isVerified = Boolean(user.isTherapistVerified);
								return (
									<tr key={user.id}>
										<td className="px-4 py-3">
											<p className="text-sm font-semibold text-ink-800">{`${user.firstName} ${user.lastName}`.trim() || 'Unnamed therapist'}</p>
											<p className="text-xs text-ink-500">{user.email}</p>
										</td>
										<td className="px-4 py-3 text-sm text-ink-700 capitalize">{user.role}</td>
										<td className="px-4 py-3">
											<span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${isVerified ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
												{isVerified ? 'Verified' : 'Pending'}
											</span>
										</td>
										<td className="px-4 py-3 text-sm text-ink-700">{new Date(user.createdAt).toLocaleDateString('en-IN')}</td>
										<td className="px-4 py-3">
											<button
												onClick={() => void handleVerify(user.id, user.role)}
												disabled={actionId === user.id}
												className="rounded-lg bg-sage-600 px-3 py-1.5 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
											>
												{actionId === user.id ? 'Working...' : user.role === 'therapist' ? 'Verify Therapist' : 'Approve Provider'}
											</button>
										</td>
									</tr>
								);
							})}
						</tbody>
					</table>
				</div>
			</div>
		</div>
	);
}

function StatCard({ label, value }: { label: string; value: string }) {
	return (
		<div className="rounded-xl border border-ink-100 bg-white p-4">
			<p className="text-xs font-semibold uppercase tracking-wide text-ink-500">{label}</p>
			<p className="mt-2 text-2xl font-bold text-ink-800">{value}</p>
		</div>
	);
}
