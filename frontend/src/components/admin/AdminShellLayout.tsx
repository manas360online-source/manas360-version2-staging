import { AlertCircle, Bell, ChevronDown, LogOut, Menu, Search, Settings, User } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';

type NavItem = { to: string; label: string; section: string; shortLabel: string };

const navItems: NavItem[] = [
	// OVERVIEW
	{ to: '/admin/dashboard', label: 'Dashboard', shortLabel: 'Dash', section: 'OVERVIEW' },
	{ to: '/admin/platform-health', label: 'Platform Health', shortLabel: 'PH', section: 'OVERVIEW' },
	// USER MANAGEMENT
	{ to: '/admin/users', label: 'One View', shortLabel: 'U', section: 'USER MANAGEMENT' },
	{ to: '/admin/user-approvals', label: 'User Approvals', shortLabel: 'UA', section: 'USER MANAGEMENT' },
	{ to: '/admin/therapist-verification', label: 'Therapist Verification', shortLabel: 'TV', section: 'USER MANAGEMENT' },
	{ to: '/admin/roles', label: 'Role Management', shortLabel: 'RB', section: 'USER MANAGEMENT' },
	// CORPORATE
	{ to: '/admin/companies', label: 'Companies', shortLabel: 'Co', section: 'CORPORATE' },
	{ to: '/admin/company-subscriptions', label: 'Subscriptions', shortLabel: 'Sub', section: 'CORPORATE' },
	{ to: '/admin/company-reports', label: 'Reports', shortLabel: 'Rep', section: 'CORPORATE' },
	// OPERATIONS
	{ to: '/admin/live-sessions', label: 'Sessions', shortLabel: 'Ses', section: 'OPERATIONS' },
	{ to: '/admin/templates', label: 'Screening Framework Modification', shortLabel: 'Tpl', section: 'OPERATIONS' },
	{ to: '/admin/groups', label: 'Group Therapy Management', shortLabel: 'Grp', section: 'OPERATIONS' },
	{ to: '/admin/crisis-console', label: 'Crisis Console', shortLabel: 'CRC', section: 'OPERATIONS' },
	// FINANCE
	{ to: '/admin/revenue', label: 'Revenue', shortLabel: 'Rev', section: 'FINANCE' },
	{ to: '/admin/pricing-subscriptions', label: 'Pricing & Subscriptions', shortLabel: 'PS', section: 'FINANCE' },
	{ to: '/admin/offer-marquee', label: 'Offer Marquee', shortLabel: 'OM', section: 'FINANCE' },
	{ to: '/admin/payouts', label: 'Payouts', shortLabel: 'Pyt', section: 'FINANCE' },
	{ to: '/admin/invoices', label: 'Invoices', shortLabel: 'Inv', section: 'FINANCE' },
	{ to: '/admin/payment-reliability', label: 'Payment Reliability', shortLabel: 'PR', section: 'FINANCE' },
	// ANALYTICS
	{ to: '/admin/platform-analytics', label: 'Platform Analytics', shortLabel: 'PA', section: 'ANALYTICS' },
	{ to: '/admin/user-growth', label: 'User Growth', shortLabel: 'UG', section: 'ANALYTICS' },
	{ to: '/admin/session-analytics', label: 'Session Analytics', shortLabel: 'SA', section: 'ANALYTICS' },
	{ to: '/admin/therapist-performance', label: 'Providers Performance', shortLabel: 'TP', section: 'ANALYTICS' },
	// SUPPORT
	{ to: '/admin/zoho-desk', label: 'Tickets', shortLabel: 'Tkt', section: 'SUPPORT' },
	{ to: '/admin/feedback', label: 'Feedback', shortLabel: 'Fb', section: 'SUPPORT' },
	// SECURITY
	{ to: '/admin/audit-trail', label: 'Audit Trail', shortLabel: 'AT', section: 'SECURITY' },
	{ to: '/admin/audit-logs', label: 'System Logs', shortLabel: 'AL', section: 'SECURITY' },
	{ to: '/admin/data-requests', label: 'Data Requests', shortLabel: 'DR', section: 'SECURITY' },
	{ to: '/admin/data-privacy-hub', label: 'Data Privacy Hub', shortLabel: 'DP', section: 'SECURITY' },
	{ to: '/admin/legal-documents', label: 'Legal Documents', shortLabel: 'LD', section: 'SECURITY' },
	{ to: '/admin/ai-monitoring', label: 'AI Monitoring', shortLabel: 'AI', section: 'SECURITY' },
	// SYSTEM
	{ to: '/admin/settings', label: 'Settings', shortLabel: 'Set', section: 'SYSTEM' },
];

const mobileBottomNav = [
	{ to: '/admin/dashboard', label: 'Dashboard' },
	{ to: '/admin/users', label: 'One View' },
	{ to: '/admin/session-analytics', label: 'Analytics' },
	{ to: '/admin/zoho-desk', label: 'Tickets' },
	{ to: '/admin/settings', label: 'Settings' },
];

export default function AdminShellLayout() {
	const location = useLocation();
	const navigate = useNavigate();
	const { user, logout } = useAuth();

	const userName = [user?.firstName, user?.lastName].filter(Boolean).join(' ').trim() || user?.email || 'Admin';
	const userRole = String(user?.role || '').toLowerCase().replace(/_/g, '');

	const complianceMenuItems: NavItem[] = useMemo(() => [
		{ to: '/admin/compliance', label: 'Dashboard', shortLabel: 'Dash', section: 'COMPLIANCE' },
		{ to: '/admin/audit-trail', label: 'Audit Trail', shortLabel: 'AT', section: 'COMPLIANCE' },
		{ to: '/admin/company-reports', label: 'Reports', shortLabel: 'Rep', section: 'COMPLIANCE' },
		{ to: '/admin/feedback', label: 'Feedback', shortLabel: 'Fb', section: 'COMPLIANCE' },
		{ to: '/admin/compliance-documents', label: 'Legal Documents', shortLabel: 'LD', section: 'COMPLIANCE' },
		{ to: '/admin/compliance-status', label: 'Compliance Status', shortLabel: 'CS', section: 'COMPLIANCE' },
	], []);

	const complianceAllowedPaths = useMemo(() => new Set([
		'/admin/compliance',
		'/admin/audit-trail',
		'/admin/company-reports',
		'/admin/feedback',
		'/admin/compliance-documents',
		'/admin/compliance-status',
	]), []);

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

	const sectionAllowlist = useMemo(() => {
		if (userRole === 'financemanager') {
			return new Set(['OVERVIEW', 'FINANCE', 'ANALYTICS']);
		}

		if (userRole === 'clinicaldirector') {
			return new Set(['OVERVIEW', 'USER MANAGEMENT', 'OPERATIONS', 'SUPPORT', 'ANALYTICS']);
		}

		if (userRole === 'complianceofficer') {
			return new Set(['OVERVIEW', 'SUPPORT', 'SECURITY']);
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
		if (userRole === 'complianceofficer') {
			return [['COMPLIANCE', complianceMenuItems]] as Array<[string, NavItem[]]>;
		}

		const grouped = new Map<string, NavItem[]>();

		for (const item of navItems) {
			const showItem = userRole === 'complianceofficer'
				? complianceAllowedPaths.has(item.to)
				: sectionAllowlist
					? sectionAllowlist.has(item.section)
					: true;

			if (showItem) {
				if (!grouped.has(item.section)) grouped.set(item.section, []);
				grouped.get(item.section)?.push(item);
			}
		}
		return Array.from(grouped.entries());
	}, [sectionAllowlist, userRole, complianceAllowedPaths, complianceMenuItems]);



	const activeNavItem = useMemo(() => {
		const exactMatch = navItems.find((item) => item.to === location.pathname);
		if (exactMatch) return exactMatch;

		// Match nested routes like /admin/users/123 to the closest configured nav item.
		const nestedMatch = navItems.find((item) => location.pathname.startsWith(`${item.to}/`));
		if (nestedMatch) return nestedMatch;

		return null;
	}, [location.pathname]);

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

	const headerSubtitle = activeNavItem
		? `${activeNavItem.section} · Platform command center`
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

	const filteredMobileNav = useMemo(() => {
		return mobileBottomNav.filter((item) => {
			if (userRole === 'financemanager') {
				return ['Dashboard', 'Analytics'].includes(item.label);
			}
			if (userRole === 'clinicaldirector') {
				return ['Dashboard', 'One View', 'Analytics', 'Tickets'].includes(item.label);
			}
			if (userRole === 'complianceofficer') {
				return ['Dashboard'].includes(item.label);
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
									onClick={() => navigate(`/admin/crisis-alerts`)}
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
									<input placeholder="Search users, tickets..." className="w-44 bg-transparent text-sm outline-none placeholder:text-ink-400" />
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
												to="/admin/dashboard"
												onClick={() => setProfileMenuOpen(false)}
												className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-ink-700 hover:bg-ink-50"
											>
												<User className="h-4 w-4" />
												My Dashboard
											</NavLink>
											<NavLink
												to="/admin/settings"
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
