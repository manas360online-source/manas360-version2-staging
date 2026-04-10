import { AlertCircle, Bell, ChevronDown, LogOut, Menu, Search, Settings, User } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { searchAdminEntities, type AdminGlobalSearchResult } from '../../api/admin.api';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';

type NavItem = { to: string; label: string; shortLabel: string };
type AdminDomain = {
	key: 'control' | 'identity' | 'tenants' | 'operations' | 'intelligence' | 'governance' | 'support' | 'system';
	label: string;
	items: NavItem[];
};
type AdminPersona = 'superadmin' | 'financemanager' | 'clinicaldirector' | 'complianceofficer' | 'admin';

const ADMIN_DOMAINS: AdminDomain[] = [
	{
		key: 'control',
		label: 'Control Center',
		items: [
			{ to: '/admin/control/dashboard', label: 'Dashboard', shortLabel: 'Dash' },
			{ to: '/admin/control/platform-health', label: 'Platform Health', shortLabel: 'PH' },
		],
	},
	{
		key: 'identity',
		label: 'Identity & Access',
		items: [
			{ to: '/admin/identity/users', label: 'Users', shortLabel: 'U' },
			{ to: '/admin/identity/approvals', label: 'Approvals', shortLabel: 'Ap' },
			{ to: '/admin/identity/therapists', label: 'Therapists', shortLabel: 'Th' },
			{ to: '/admin/identity/roles', label: 'Roles', shortLabel: 'Rl' },
		],
	},
	{
		key: 'tenants',
		label: 'Tenants & Billing',
		items: [
			{ to: '/admin/billing/companies', label: 'Companies', shortLabel: 'Co' },
			{ to: '/admin/billing/company-subscriptions', label: 'Subscriptions', shortLabel: 'Sub' },
			{ to: '/admin/billing/company-reports', label: 'Company Reports', shortLabel: 'Rep' },
			{ to: '/admin/billing/revenue', label: 'Revenue', shortLabel: 'Rev' },
			{ to: '/admin/billing/pricing', label: 'Pricing', shortLabel: 'Prc' },
			{ to: '/admin/billing/offers', label: 'Offer Marquee', shortLabel: 'Off' },
			{ to: '/admin/billing/payouts', label: 'Payouts', shortLabel: 'Pay' },
		],
	},
	{
		key: 'operations',
		label: 'Operations',
		items: [
			{ to: '/admin/operations/sessions', label: 'Sessions', shortLabel: 'Ses' },
			{ to: '/admin/operations/templates', label: 'Screening Framework', shortLabel: 'Tpl' },
			{ to: '/admin/operations/groups', label: 'Group Therapy', shortLabel: 'Grp' },
			{ to: '/admin/operations/qr', label: 'QR Codes', shortLabel: 'QR' },
			{ to: '/admin/operations/crisis', label: 'Crisis Console', shortLabel: 'Crs' },
		],
	},
	{
		key: 'intelligence',
		label: 'Intelligence',
		items: [
			{ to: '/admin/intelligence/platform-analytics', label: 'Platform Analytics', shortLabel: 'PA' },
			{ to: '/admin/intelligence/user-growth', label: 'User Growth', shortLabel: 'UG' },
			{ to: '/admin/intelligence/session-analytics', label: 'Session Analytics', shortLabel: 'SA' },
			{ to: '/admin/intelligence/provider-performance', label: 'Provider Performance', shortLabel: 'PP' },
		],
	},
	{
		key: 'governance',
		label: 'Governance',
		items: [
			{ to: '/admin/governance/center', label: 'Governance Center', shortLabel: 'Gov' },
			{ to: '/admin/governance/audit', label: 'Audit Trail', shortLabel: 'Aud' },
			{ to: '/admin/governance/privacy', label: 'Data Privacy Hub', shortLabel: 'Dph' },
			{ to: '/admin/governance/legal', label: 'Legal Documents', shortLabel: 'Leg' },
			{ to: '/admin/governance/compliance', label: 'Compliance', shortLabel: 'Cmp' },
		],
	},
	{
		key: 'support',
		label: 'Support',
		items: [
			{ to: '/admin/support/tickets', label: 'Tickets', shortLabel: 'Tkt' },
			{ to: '/admin/support/feedback', label: 'Feedback', shortLabel: 'Fb' },
		],
	},
	{
		key: 'system',
		label: 'System',
		items: [
			{ to: '/admin/system/settings', label: 'Settings', shortLabel: 'Set' },
			{ to: '/admin/system/platform-config', label: 'Platform Config', shortLabel: 'Cfg' },
		],
	},
];

const mobileBottomNav = [
	{ to: '/admin/control/dashboard', label: 'Dashboard' },
	{ to: '/admin/identity/users', label: 'Users' },
	{ to: '/admin/intelligence/session-analytics', label: 'Analytics' },
	{ to: '/admin/support/tickets', label: 'Tickets' },
	{ to: '/admin/system/settings', label: 'Settings' },
];

const normalizeRoleValue = (value: unknown): string =>
	String(value || '')
		.toLowerCase()
		.replace(/[^a-z0-9]/g, '');

const resolveAdminPersona = (user: any): AdminPersona => {
	const normalizedRole = normalizeRoleValue(user?.role);
	if (normalizedRole === 'superadmin') return 'superadmin';
	if (normalizedRole === 'financemanager') return 'financemanager';
	if (normalizedRole === 'clinicaldirector') return 'clinicaldirector';
	if (normalizedRole === 'complianceofficer') return 'complianceofficer';
	return 'admin';
};

export default function AdminShellLayout() {
	const location = useLocation();
	const navigate = useNavigate();
	const { user, logout } = useAuth();

	const userName = [user?.firstName, user?.lastName].filter(Boolean).join(' ').trim() || user?.email || 'Admin';
	const userRole: AdminPersona = resolveAdminPersona(user);

	const roleLabel = useMemo(() => {
		switch (userRole) {
			case 'superadmin':
				return 'Super Admin';
			case 'financemanager':
				return 'Finance Manager';
			case 'clinicaldirector':
				return 'Clinical Director';
			case 'complianceofficer':
				return 'Compliance Officer';
			default:
				return 'Admin';
		}
	}, [userRole]);

	const domainAllowlist = useMemo(() => {
		if (userRole === 'financemanager') {
			return new Set(['control', 'tenants', 'intelligence']);
		}

		if (userRole === 'clinicaldirector') {
			return new Set(['control', 'identity', 'operations', 'intelligence', 'support']);
		}

		if (userRole === 'complianceofficer') {
			return new Set(['control', 'governance', 'support']);
		}

		return null;
	}, [userRole]);

	const initials = userName
		.split(' ')
		.filter(Boolean)
		.slice(0, 2)
		.map((part: string) => part[0]?.toUpperCase())
		.join('') || 'MA';

	const [mobileOpen, setMobileOpen] = useState(false);
	const [profileMenuOpen, setProfileMenuOpen] = useState(false);
	const [activeCrisis, setActiveCrisis] = useState<any>(null);
	const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
	const [commandQuery, setCommandQuery] = useState('');
	const [searchResults, setSearchResults] = useState<AdminGlobalSearchResult>({ users: [], payments: [], sessions: [] });
	const [searchLoading, setSearchLoading] = useState(false);
	const profileMenuRef = useRef<HTMLDivElement | null>(null);

	useEffect(() => {
		setMobileOpen(false);
		setProfileMenuOpen(false);
	}, [location.pathname]);

	useEffect(() => {
		const onResize = () => {
			if (window.innerWidth >= 1024) {
				setMobileOpen(false);
			}
		};

		window.addEventListener('resize', onResize);
		return () => window.removeEventListener('resize', onResize);
	}, []);

	const sections = useMemo(() => {
		return ADMIN_DOMAINS
			.filter((domain) => (domainAllowlist ? domainAllowlist.has(domain.key) : true))
			.map((domain) => [domain.label, domain.items] as [string, NavItem[]]);
	}, [domainAllowlist]);



	const allNavItems = useMemo(() => ADMIN_DOMAINS.flatMap((domain) => domain.items), []);

	const activeNavItem = useMemo(() => {
		const exactMatch = allNavItems.find((item) => item.to === location.pathname);
		if (exactMatch) return exactMatch;

		// Match nested routes like /admin/users/123 to the closest configured nav item.
		const nestedMatch = allNavItems.find((item) => location.pathname.startsWith(`${item.to}/`));
		if (nestedMatch) return nestedMatch;

		return null;
	}, [allNavItems, location.pathname]);

	const headerTitle = useMemo(() => {
		if (activeNavItem) return activeNavItem.label;

		if (location.pathname.startsWith('/admin/')) {
			const segments = location.pathname.split('/').filter(Boolean);
			const lastSegment = segments.length > 0 ? segments[segments.length - 1] : undefined;
			if (lastSegment) {
				return lastSegment
					.split('-')
					.map((part: string) => part.charAt(0).toUpperCase() + part.slice(1))
					.join(' ');
			}
		}

		return 'Admin Dashboard';
	}, [activeNavItem, location.pathname]);

	const activeSectionLabel = useMemo(() => {
		if (!activeNavItem) return null;
		const match = ADMIN_DOMAINS.find((domain) => domain.items.some((item) => item.to === activeNavItem.to));
		return match?.label ?? null;
	}, [activeNavItem]);

	const headerSubtitle = activeNavItem
		? `${activeSectionLabel ?? 'Admin'} · Platform command center`
		: 'Platform command center · All systems normal';

	const onLogout = async () => {
		await logout();
		navigate('/auth/login', { replace: true });
	};

	const { socket } = useSocket();

	useEffect(() => {
		if (!socket) return;

		const handleCrisisAlert = (alert: any) => {
			setActiveCrisis(alert);
			// Optional: play alert sound
			try {
				const audio = new Audio('/sounds/emergency-alert.mp3');
				audio.play().catch(() => {});
			} catch (e) {}
		};

		socket.on('crisis-alert', handleCrisisAlert);
		return () => {
			socket.off('crisis-alert', handleCrisisAlert);
		};
	}, [socket]);

	useEffect(() => {
		if (!profileMenuOpen) return;

		const onKeyDown = (event: KeyboardEvent) => {
			if (event.key === 'Escape') {
				setProfileMenuOpen(false);
			}
		};

		const onPointerDown = (event: MouseEvent) => {
			if (!profileMenuRef.current) return;
			if (!profileMenuRef.current.contains(event.target as Node)) {
				setProfileMenuOpen(false);
			}
		};

		document.addEventListener('keydown', onKeyDown);
		document.addEventListener('mousedown', onPointerDown);

		return () => {
			document.removeEventListener('keydown', onKeyDown);
			document.removeEventListener('mousedown', onPointerDown);
		};
	}, [profileMenuOpen]);

	useEffect(() => {
		const onKeyDown = (event: KeyboardEvent) => {
			if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
				event.preventDefault();
				setIsCommandPaletteOpen((prev) => !prev);
			}
		};

		document.addEventListener('keydown', onKeyDown);
		return () => document.removeEventListener('keydown', onKeyDown);
	}, []);

	useEffect(() => {
		if (!isCommandPaletteOpen || commandQuery.trim().length < 2) {
			setSearchResults({ users: [], payments: [], sessions: [] });
			return;
		}

		let mounted = true;
		setSearchLoading(true);
		const timer = window.setTimeout(() => {
			void searchAdminEntities(commandQuery, 6)
				.then((response) => {
					if (mounted) setSearchResults(response.data);
				})
				.catch(() => {
					if (mounted) setSearchResults({ users: [], payments: [], sessions: [] });
				})
				.finally(() => {
					if (mounted) setSearchLoading(false);
				});
		}, 250);

		return () => {
			mounted = false;
			window.clearTimeout(timer);
		};
	}, [commandQuery, isCommandPaletteOpen]);

	const filteredMobileNav = useMemo(() => {
		return mobileBottomNav.filter((item) => {
			if (userRole === 'financemanager') {
				return ['Dashboard', 'Analytics'].includes(item.label);
			}
			if (userRole === 'clinicaldirector') {
				return ['Dashboard', 'Users', 'Analytics', 'Tickets'].includes(item.label);
			}
			if (userRole === 'complianceofficer') {
				return ['Dashboard', 'Tickets'].includes(item.label);
			}
			return true;
		});
	}, [userRole]);

	return (
		<div className="h-screen overflow-hidden bg-[#FAFAF8] text-[#1A1A1A]">
			<div className="flex h-screen">
				<div className={`fixed inset-0 z-40 bg-black/40 transition-opacity md:hidden ${mobileOpen ? 'opacity-100' : 'pointer-events-none opacity-0'}`} onClick={() => setMobileOpen(false)} />

				<aside className={`fixed left-0 top-0 z-50 h-screen w-64 bg-[#1A1A1A] transition-transform md:hidden ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}`}>
					<AdminNav sections={sections} compact={false} initials={initials} userName={userName} userRole={roleLabel} />
				</aside>

				<aside className="fixed left-0 top-0 z-40 hidden h-screen w-16 bg-[#1A1A1A] md:block lg:hidden">
					<AdminNav sections={sections} compact={true} initials={initials} userName={userName} userRole={roleLabel} />
				</aside>

				<aside className="fixed left-0 top-0 z-40 hidden h-screen w-64 bg-[#1A1A1A] lg:block">
					<AdminNav sections={sections} compact={false} initials={initials} userName={userName} userRole={roleLabel} />
				</aside>

				<div className="flex min-w-0 flex-1 flex-col md:pl-16 lg:pl-64">
					{/* Crisis Alert Banner */}
					{activeCrisis && (
						<div className="bg-rose-600 text-white px-4 py-3 flex items-center justify-between sticky top-0 z-[60] shadow-lg animate-pulse">
							<div className="flex items-center gap-3">
								<AlertCircle className="h-6 w-6" />
								<div>
									<p className="text-sm font-bold">CRISIS ALERT [{activeCrisis.severity}]: {activeCrisis.type}</p>
									<p className="text-xs opacity-90">{activeCrisis.userName} is in potential risk: {activeCrisis.message}</p>
								</div>
							</div>
							<div className="flex items-center gap-2">
								<button 
									onClick={() => navigate('/admin/operations/crisis')}
									className="px-3 py-1 bg-white text-rose-600 rounded text-xs font-bold hover:bg-rose-50"
								>
									Take Action
								</button>
								<button 
									onClick={() => setActiveCrisis(null)}
									className="p-1 hover:bg-rose-700 rounded"
								>
									<LogOut className="h-4 w-4 rotate-90" />
								</button>
							</div>
						</div>
					)}

					<header className="sticky top-0 z-30 h-16 border-b border-ink-100 bg-white/90 backdrop-blur">
						<div className="flex h-full items-center px-4 lg:px-6">
							<button className="mr-3 rounded-lg p-2 hover:bg-ink-50 md:hidden" onClick={() => setMobileOpen((prev) => !prev)}>
								<Menu className="h-5 w-5 text-ink-600" />
							</button>
							<div>
								<h1 className="font-display text-lg font-bold text-ink-800">{headerTitle}</h1>
								<p className="hidden text-[11px] text-ink-400 sm:block">{headerSubtitle}</p>
							</div>
							<div className="ml-auto flex items-center gap-2 sm:gap-4">
								<div className="hidden items-center gap-2 rounded-lg bg-ink-50 px-3 py-2 md:flex">
									<Search className="h-4 w-4 text-ink-400" />
									<input
										placeholder="Search users, tickets... (Ctrl+K)"
										className="w-44 bg-transparent text-sm outline-none placeholder:text-ink-400"
										onFocus={() => setIsCommandPaletteOpen(true)}
									/>
								</div>
								<button className="relative rounded-lg p-2 hover:bg-ink-50">
									<Bell className="h-5 w-5 text-ink-500" />
									<span className="absolute right-1 top-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white">8</span>
								</button>
								<div ref={profileMenuRef} className="relative">
									<button
										type="button"
										onClick={() => setProfileMenuOpen((prev) => !prev)}
										className="flex items-center gap-2 rounded-lg border border-ink-100 bg-white px-2 py-1 hover:bg-ink-50"
										aria-label="Open admin profile menu"
									>
										<div className="flex h-7 w-7 items-center justify-center rounded-full bg-ink-800 text-xs font-bold text-white">{initials}</div>
										<ChevronDown className="h-4 w-4 text-ink-500" />
									</button>

									{profileMenuOpen ? (
										<div className="absolute right-0 mt-2 w-52 rounded-xl border border-ink-100 bg-white p-1 shadow-soft-sm">
											<div className="px-3 py-2">
												<p className="truncate text-sm font-semibold text-ink-800">{userName}</p>
												<p className="text-[11px] text-ink-500">Platform Admin</p>
											</div>
											<NavLink
												to="/admin/control/dashboard"
												onClick={() => setProfileMenuOpen(false)}
												className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-ink-700 hover:bg-ink-50"
											>
												<User className="h-4 w-4" />
												My Dashboard
											</NavLink>
											<NavLink
												to="/admin/system/settings"
												onClick={() => setProfileMenuOpen(false)}
												className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-ink-700 hover:bg-ink-50"
											>
												<Settings className="h-4 w-4" />
												Settings
											</NavLink>
											<button
												type="button"
												onClick={() => void onLogout()}
												className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-rose-700 hover:bg-rose-50"
											>
												<LogOut className="h-4 w-4" />
												Logout
											</button>
										</div>
									) : null}
								</div>
							</div>
						</div>
					</header>

					<main className="flex-1 overflow-y-auto px-4 pb-20 pt-4 lg:px-6 lg:pb-6">
						<Outlet />
					</main>

					<nav className="fixed bottom-0 left-0 right-0 z-30 border-t border-ink-100 bg-white md:hidden">
						<div className="flex justify-around">
							{filteredMobileNav.map((item) => (
								<NavLink key={item.to} to={item.to} className={({ isActive }) => `flex-1 px-1 py-2 text-center text-[11px] ${isActive ? 'text-sage-700' : 'text-ink-500'}`}>
									{item.label}
								</NavLink>
							))}
						</div>
					</nav>

					{isCommandPaletteOpen ? (
						<div className="fixed inset-0 z-[70] flex items-start justify-center bg-black/30 p-4 pt-20" onClick={() => setIsCommandPaletteOpen(false)}>
							<div className="w-full max-w-2xl rounded-xl border border-ink-100 bg-white p-3 shadow-soft-lg" onClick={(event) => event.stopPropagation()}>
								<div className="flex items-center gap-2 rounded-lg bg-ink-50 px-3 py-2">
									<Search className="h-4 w-4 text-ink-400" />
									<input
										autoFocus
										value={commandQuery}
										onChange={(event) => setCommandQuery(event.target.value)}
										placeholder="Search pages and actions"
										className="w-full bg-transparent text-sm outline-none placeholder:text-ink-400"
									/>
								</div>
								<div className="mt-3 space-y-1">
									{[
										{ label: 'Go to Users', to: '/admin/identity/users' },
										{ label: 'Go to Pricing', to: '/admin/billing/pricing' },
										{ label: 'Go to QR Codes', to: '/admin/operations/qr' },
										{ label: 'Go to Audit', to: '/admin/governance/audit' },
										{ label: 'Action: Suspend selected users', to: '/admin/identity/users' },
										{ label: 'Action: Create pricing plan', to: '/admin/billing/pricing' },
										{ label: 'Action: Generate QR', to: '/admin/operations/qr' },
									]
										.filter((item) => item.label.toLowerCase().includes(commandQuery.toLowerCase()))
										.map((item) => (
											<button
												key={item.to}
												onClick={() => {
													navigate(item.to);
													setIsCommandPaletteOpen(false);
												}}
												className="block w-full rounded-lg px-3 py-2 text-left text-sm text-ink-700 hover:bg-ink-50"
											>
												{item.label}
											</button>
										))}

									{searchLoading ? <p className="px-3 py-2 text-xs text-ink-500">Searching...</p> : null}

									{searchResults.users.map((user) => (
										<button
											key={`user-${user.id}`}
											onClick={() => {
												navigate(`/admin/identity/users/${user.id}`);
												setIsCommandPaletteOpen(false);
											}}
											className="block w-full rounded-lg px-3 py-2 text-left text-sm text-ink-700 hover:bg-ink-50"
										>
											User: {user.name} ({user.email})
										</button>
									))}

									{searchResults.payments.map((payment) => (
										<button
											key={`payment-${payment.id}`}
											onClick={() => {
												navigate('/admin/billing/payment-reliability');
												setIsCommandPaletteOpen(false);
											}}
											className="block w-full rounded-lg px-3 py-2 text-left text-sm text-ink-700 hover:bg-ink-50"
										>
											Payment: {payment.id.slice(0, 8)}... ({payment.status})
										</button>
									))}

									{searchResults.sessions.map((session) => (
										<button
											key={`session-${session.id}`}
											onClick={() => {
												navigate('/admin/operations/sessions');
												setIsCommandPaletteOpen(false);
											}}
											className="block w-full rounded-lg px-3 py-2 text-left text-sm text-ink-700 hover:bg-ink-50"
										>
											Session: {session.id.slice(0, 8)}... ({session.status})
										</button>
									))}
								</div>
							</div>
						</div>
					) : null}
				</div>
			</div>
		</div>
	);
}

function AdminNav({ sections, compact, initials, userName, userRole }: { sections: Array<[string, NavItem[]]>; compact: boolean; initials?: string; userName?: string; userRole?: string }) {
	return (
		<div className="flex h-full flex-col">
			<div className="flex h-16 items-center gap-3 border-b border-white/10 px-4">
				<div className="flex h-8 w-8 items-center justify-center rounded-lg bg-sage-500 text-sm font-bold text-white">M</div>
				{!compact ? (
					<>
						<span className="font-display text-lg font-bold text-white">MANAS360</span>
						<span className="ml-auto rounded-full bg-red-500/20 px-2 py-0.5 text-[10px] font-medium text-red-400">Admin</span>
					</>
				) : null}
			</div>

			<nav className="flex-1 overflow-y-auto px-2 py-4">
				{!compact ? (
					<div className="mb-4 rounded-lg border border-white/10 bg-white/5 p-3">
						<p className="text-[10px] uppercase tracking-[0.14em] text-white/45">Context</p>
						<p className="mt-1 text-xs text-white/85">Workspace: MANAS360</p>
						<p className="text-xs text-white/85">Tenant: All</p>
						<p className="text-xs text-white/85">Role: {userRole || 'Admin'}</p>
					</div>
				) : null}

				{!compact ? (
					<div className="mb-4 space-y-1">
						<p className="px-2 text-[10px] uppercase tracking-[0.14em] text-white/45">Quick Actions</p>
						<NavLink to="/admin/identity/approvals" className="block rounded-lg bg-sage-600 px-3 py-2 text-xs font-semibold text-white hover:bg-sage-500">+ Create User</NavLink>
						<NavLink to="/admin/billing/pricing" className="block rounded-lg bg-sage-700 px-3 py-2 text-xs font-semibold text-white hover:bg-sage-600">+ Create Pricing Plan</NavLink>
						<NavLink to="/admin/operations/qr" className="block rounded-lg bg-sage-800 px-3 py-2 text-xs font-semibold text-white hover:bg-sage-700">+ Generate QR</NavLink>
					</div>
				) : null}

				{sections.map(([section, items]) => (
					<div key={section} className="mb-4">
						{!compact ? <p className="mb-2 px-3 text-[10px] font-semibold tracking-[0.15em] text-ink-400">{section}</p> : null}
						<div className="space-y-1">
							{items.map((item) => (
								<NavLink
									key={item.to}
									to={item.to}
									title={compact ? item.label : undefined}
									className={({ isActive }) =>
										[
											'block rounded-lg text-sm transition',
											compact ? 'px-1 py-2.5 text-center' : 'px-3 py-2.5',
											isActive ? 'bg-sage-600 font-semibold text-white' : 'text-white/65 hover:bg-white/10 hover:text-white',
										].join(' ')
									}
								>
									{compact ? item.shortLabel : item.label}
								</NavLink>
							))}
						</div>
					</div>
				))}
			</nav>

			{!compact ? (
				<div className="border-t border-white/10 p-4">
					<div className="flex items-center gap-3">
						<div className="flex h-9 w-9 items-center justify-center rounded-full bg-sage-500 text-sm font-bold text-white">{initials || 'MA'}</div>
						<div>
							<p className="text-sm font-semibold text-white">{userName || 'Admin'}</p>
							<p className="text-[11px] text-white/40">{userRole || 'Super Admin'}</p>
						</div>
					</div>
				</div>
			) : null}
		</div>
	);
}
