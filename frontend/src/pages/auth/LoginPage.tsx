import { useEffect, useMemo, useState } from 'react';
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

	const calmingQuotes = useMemo(
		() => [
			'Small steps every day.',
			'You are not alone.',
			'Healing begins with showing up for yourself.',
		],
		[],
	);
	const selectedQuote = useMemo(() => {
		const index = Math.floor(Math.random() * calmingQuotes.length);
		return calmingQuotes[index] || 'Small steps every day.';
	}, [calmingQuotes]);
	const loginBackgroundUrl = String(import.meta.env.VITE_LOGIN_BG_URL || '').trim();

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
		<div className="relative min-h-screen overflow-hidden">
			<div
				className="absolute inset-0 scale-[1.02] bg-cover bg-center blur-[1px]"
				style={{
					backgroundImage: loginBackgroundUrl
						? `linear-gradient(rgba(240, 248, 245, 0.6), rgba(240, 248, 245, 0.6)), url('${loginBackgroundUrl}')`
						: 'linear-gradient(135deg, rgba(211, 233, 226, 0.94), rgba(233, 242, 249, 0.92), rgba(250, 247, 240, 0.9))',
				}}
			/>
			<div className="absolute inset-0 bg-gradient-to-br from-[#e4f2ee]/70 via-[#edf7f4]/65 to-[#e8f0f6]/70" />
			<div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.28),transparent_32%),radial-gradient(circle_at_bottom_right,rgba(92,107,192,0.10),transparent_30%)]" />

			<div className="relative z-10 mx-auto flex min-h-screen w-full max-w-7xl items-center px-4 py-6 sm:px-6 lg:px-8">
				<div className="grid w-full items-stretch gap-6 lg:grid-cols-[1.08fr_0.92fr] lg:gap-12">
					<section className="hidden lg:flex lg:flex-col lg:justify-center lg:animate-fadeIn">
						<div>
							<p className="text-sm font-semibold uppercase tracking-[0.18em] text-white/85">MANAS360</p>
							<h2 className="mt-8 max-w-lg text-4xl font-semibold leading-tight text-white">
								Your mental well-being matters.
							</h2>
							<p className="mt-4 max-w-md text-lg text-white/85">
								Take a step toward a calmer, healthier you.
							</p>
						</div>
						<p className="mt-8 max-w-sm text-base italic text-white/90 animate-fadeInUp">"{selectedQuote}"</p>
					</section>

					<section className="mx-auto w-full max-w-lg justify-self-center rounded-[24px] border border-white/70 bg-white/80 p-5 shadow-[0_18px_48px_rgba(16,24,40,0.14)] backdrop-blur-xl sm:p-8 lg:justify-self-end lg:animate-scaleIn">
						<div className="mb-3 flex items-center justify-between">
							<Link to="/" className="text-sm text-calm-sage underline underline-offset-2 hover:text-wellness-text">
								Back to Home
							</Link>
						</div>

						<div className="mb-3 inline-flex items-center gap-2 rounded-full border border-calm-sage/20 bg-white/75 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-wellness-muted lg:hidden">
							<span className="h-2 w-2 rounded-full bg-calm-sage" />
							{selectedQuote}
						</div>
						<h1 className="text-2xl font-semibold text-wellness-text sm:text-3xl">Welcome back</h1>
						<p className="mt-2 text-sm text-wellness-muted sm:text-base">Continue your wellness journey</p>
						<p className="mt-1 text-xs text-wellness-muted">
							Universal login - patients, doctors, and staff use the same access.
						</p>

						<div className="mt-6 space-y-4">
							<Input
								id="login-phone"
								label="Phone Number"
								type="tel"
								autoComplete="tel"
								placeholder="+919876543210"
								helperText="Use your phone number to continue"
								value={phone}
								onChange={(event) => setPhone(event.target.value)}
								required
							/>

							{otpSent ? (
								<Input
									id="login-otp"
									label="One-Time Code"
									inputMode="numeric"
									pattern="\\d{6}"
									maxLength={6}
									autoComplete="one-time-code"
									placeholder="6-digit OTP"
									helperText="We'll send you a one-time code"
									value={otp}
									onChange={(event) => setOtp(event.target.value.replace(/\D/g, '').slice(0, 6))}
									required
								/>
							) : null}

							{!otpSent ? (
								<Button
									type="button"
									fullWidth
									loading={loading}
									className="min-h-[48px] rounded-2xl bg-gradient-to-r from-[#87a799] to-[#6f9c94] text-white shadow-soft-md hover:shadow-soft-lg focus:ring-2 focus:ring-calm-sage/30"
									onClick={requestOtp}
								>
									{loading ? 'Preparing...' : 'Continue'}
								</Button>
							) : (
								<Button
									type="button"
									fullWidth
									loading={loading}
									className="min-h-[48px] rounded-2xl bg-gradient-to-r from-[#87a799] to-[#6f9c94] text-white shadow-soft-md hover:shadow-soft-lg focus:ring-2 focus:ring-calm-sage/30"
									onClick={verifyOtp}
								>
									{loading ? 'Verifying...' : 'Continue to wellness'}
								</Button>
							)}
						</div>

						<p className="mt-3 rounded-2xl bg-wellness-aqua/70 px-4 py-3 text-xs font-medium text-wellness-text/80">
							🔒 Your data is secure and confidential.
						</p>

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

						<p className="mt-4 text-center text-sm text-wellness-muted">
							Need to create an account?{' '}
							<Link to="/auth/signup" className="text-calm-sage underline underline-offset-2 hover:text-wellness-text">
								Register here
							</Link>
						</p>
					</section>
				</div>
			</div>
		</div>
	);
}
