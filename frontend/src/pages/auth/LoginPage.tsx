import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { getApiErrorMessage, me as fetchMe, signupWithPhone, verifyPhoneSignupOtp } from '../../api/auth';
import { patientApi } from '../../api/patient';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import { getPostLoginRoute, hasCorporateAccess, useAuth } from '../../context/AuthContext';

const isSubscriptionActive = (subscription: any): boolean => {
	if (!subscription) return false;

	const status = String(subscription?.status || '').toLowerCase();
	if (status === 'active' || status === 'trialing') return true;
	if (subscription?.isActive === true || subscription?.active === true) return true;

	return false;
};

export default function LoginPage() {
	const { user, isAuthenticated, checkAuth } = useAuth();
	const navigate = useNavigate();
	const location = useLocation();
	const from = (location.state as { from?: string; afterLogin?: string } | null)?.from;
	const afterLogin = (location.state as { from?: string; afterLogin?: string } | null)?.afterLogin;
	const next = new URLSearchParams(location.search).get('next');

	const [phone, setPhone] = useState('');
	const [otp, setOtp] = useState('');
	const [otpSent, setOtpSent] = useState(false);
	const [devOtp, setDevOtp] = useState<string | null>(null);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const adminPortalLogin = '/admin-portal/login';

	const hasSessionCookieHint = (): boolean => {
		if (typeof document === 'undefined') return false;
		const csrfCookieName = (import.meta.env.VITE_CSRF_COOKIE_NAME || 'csrf_token').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
		return new RegExp(`(?:^|; )${csrfCookieName}=`).test(document.cookie);
	};

	const resolvePostLoginRouteWithSubscription = async (candidate: string | null, role: string | undefined, userOverride?: any) => {
		const effectiveUser = userOverride || user;

		if (hasCorporateAccess(effectiveUser)) {
			return '/corporate/dashboard';
		}

		if (!candidate || candidate.startsWith('/auth/')) {
			return getPostLoginRoute(effectiveUser);
		}

		const normalizedRole = String(role || '').toLowerCase();
		const isPricingTarget = candidate.startsWith('/plans');
		if (normalizedRole !== 'patient' || !isPricingTarget) {
			return candidate;
		}

		try {
			const subscriptionResponse = await patientApi.getSubscription();
			const subscriptionPayload = (subscriptionResponse as any)?.data ?? subscriptionResponse;
			if (isSubscriptionActive(subscriptionPayload)) {
				return '/patient/dashboard';
			}
		} catch {
			// Keep original target when subscription lookup fails.
		}

		return candidate;
	};

	useEffect(() => {
		if (!isAuthenticated || !user) {
			return;
		}

		const candidate = from || afterLogin || next || null;
		void (async () => {
			const postLoginRoute = await resolvePostLoginRouteWithSubscription(candidate, user.role, user);
			navigate(postLoginRoute, { replace: true });
		})();
	}, [afterLogin, from, isAuthenticated, navigate, next, user]);

	const requestOtp = async () => {
		setError(null);
		setLoading(true);
		setDevOtp(null);
		try {
			const result = await signupWithPhone(phone.trim());
			setOtpSent(true);
			setDevOtp(result.devOtp || null);
		} catch (err) {
			setError(getApiErrorMessage(err, 'Failed to send OTP'));
		} finally {
			setLoading(false);
		}
	};

	const verifyOtp = async () => {
		setError(null);
		setLoading(true);
		try {
			const result = await verifyPhoneSignupOtp(phone.trim(), otp.trim());
			await checkAuth();

			// Use canonical auth user (from /auth/me) for routing, as OTP response may omit corporate flags.
			let resolvedUser = result.user;
			if (hasSessionCookieHint()) {
				try {
					resolvedUser = await fetchMe();
				} catch {
					// Keep OTP response user as fallback.
				}
			}
			
			// Check corporate access first - corporate admins bypass subscription checks
			if (hasCorporateAccess(resolvedUser)) {
				navigate('/corporate/dashboard', { replace: true });
				return;
			}
			
			// Redirect patients without subscription to plans
			if ((resolvedUser as any)?.requiresSubscription) {
				let hasActiveSubscription = false;
				try {
					const subscriptionResponse = await patientApi.getSubscription();
					const subscriptionPayload = (subscriptionResponse as any)?.data ?? subscriptionResponse;
					hasActiveSubscription = isSubscriptionActive(subscriptionPayload);
				} catch {
					hasActiveSubscription = false;
				}

				if (hasActiveSubscription) {
					const candidate = from || afterLogin || next || null;
					const postLoginRoute = await resolvePostLoginRouteWithSubscription(candidate, resolvedUser?.role, resolvedUser);
					navigate(postLoginRoute, { replace: true });
					return;
				}

				const candidate = from || afterLogin || next || null;
				const returnTo = candidate || '/';
				navigate(`/plans?returnTo=${encodeURIComponent(returnTo)}`, { replace: true });
				return;
			}
			const candidate = from || afterLogin || next || null;
			const postLoginRoute = await resolvePostLoginRouteWithSubscription(candidate, resolvedUser?.role, resolvedUser);
			navigate(postLoginRoute, { replace: true });
		} catch (err: any) {
			const message = String(err?.response?.data?.message || '');
			if (Number(err?.response?.status) === 422 && message.toLowerCase().includes('accept terms')) {
				navigate(`/auth/signup?phone=${encodeURIComponent(phone.trim())}`, { replace: true });
				return;
			}
			setError(getApiErrorMessage(err, 'OTP verification failed'));
		} finally {
			setLoading(false);
		}
	};

	return (
		<div className="responsive-page">
			<div className="responsive-container py-6 sm:py-10">
				<div className="mx-auto w-full max-w-lg rounded-3xl border border-calm-sage/20 bg-wellness-surface p-5 shadow-soft-md sm:p-8">
					<div className="mb-3">
						<Link to="/" className="text-sm text-calm-sage underline underline-offset-2 hover:text-wellness-text">
							Back to Home
						</Link>
					</div>
					<h1 className="text-2xl font-semibold text-wellness-text sm:text-3xl">Welcome back</h1>
					<p className="mt-2 text-sm text-wellness-muted sm:text-base">Login with your phone number and OTP.</p>

					<div className="mt-6 space-y-4">
						<Input
							id="login-phone"
							label="Phone Number"
							type="tel"
							autoComplete="tel"
							placeholder="+919876543210"
							value={phone}
							onChange={(event) => setPhone(event.target.value)}
							required
						/>

						{otpSent ? (
							<Input
								id="login-otp"
								label="OTP"
								inputMode="numeric"
								pattern="\\d{6}"
								maxLength={6}
								autoComplete="one-time-code"
								placeholder="6-digit OTP"
								value={otp}
								onChange={(event) => setOtp(event.target.value.replace(/\D/g, '').slice(0, 6))}
								required
							/>
						) : null}

						{!otpSent ? (
							<Button type="button" fullWidth loading={loading} className="min-h-[48px]" onClick={requestOtp}>
								{loading ? 'Sending OTP...' : 'Send OTP'}
							</Button>
						) : (
							<Button type="button" fullWidth loading={loading} className="min-h-[48px]" onClick={verifyOtp}>
								{loading ? 'Verifying OTP...' : 'Verify OTP and Login'}
							</Button>
						)}
					</div>

					{devOtp ? (
						<p className="mt-3 text-xs text-wellness-muted">
							Development OTP: <span className="font-semibold text-wellness-text">{devOtp}</span>
						</p>
					) : null}

					{error ? (
						<p role="alert" aria-live="polite" className="mt-3 text-sm text-red-600">
							{error}
						</p>
					) : null}

					<p className="mt-2 text-center text-sm text-wellness-muted">
						Need to create an account?{' '}
						<Link to="/auth/signup" className="text-calm-sage underline underline-offset-2 hover:text-wellness-text">
							Register here
						</Link>
					</p>

					<div className="mt-3 text-center">
						<button
							type="button"
							className="text-calm-sage underline underline-offset-2 hover:text-wellness-text text-sm"
							onClick={() => {
								// Navigate to a corporate-specific hash for corporate login flows
								window.location.hash = '/corporate';
							}}
						>
							Corporate login
						</button>
					</div>

					<div className="mt-10 pt-6 border-t border-gray-100">
						<p className="text-[10px] uppercase font-bold text-gray-400 mb-4 text-center tracking-widest">
							Developer Sandbox — Quick Admin Login
						</p>
						<div className="grid grid-cols-1 gap-2">
							<Button 
								variant="soft" 
								size="sm"
				className="text-xs py-2 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border-emerald-100"
								onClick={() => navigate(adminPortalLogin, {
									state: { identifier: 'superadmin@manas360.com', password: 'Admin@123' },
								})}
							>
								🚀 Login as Super Admin
							</Button>
							<div className="grid grid-cols-2 gap-2">
								<Button 
									variant="soft" 
									size="sm"
									className="text-[10px] py-1.5"
									onClick={() => navigate(adminPortalLogin, {
										state: { identifier: 'finance@manas360.com', password: 'Admin@123' },
									})}
								>
									💳 Finance Manager
								</Button>
								<Button 
									variant="soft" 
									size="sm"
									className="text-[10px] py-1.5"
									onClick={() => navigate(adminPortalLogin, {
										state: { identifier: 'clinical@manas360.com', password: 'Admin@123' },
									})}
								>
									🏥 Clinical Director
								</Button>
							</div>
						</div>
						<p className="mt-2 text-[9px] text-gray-400 text-center italic">
							Note: Click a role then click "Verify and Login". Uses dev bypass.
						</p>
					</div>
				</div>
			</div>
		</div>
	);
}
