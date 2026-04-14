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

	const inspirationalQuotes = useMemo(
		() => [
			{
				text: 'Everything has beauty, but not everyone sees it.',
				author: 'Confucius',
			},
			{
				text: 'My mission in life is not merely to survive, but to thrive; and to do so with some passion, some compassion, some humor, and some style.',
				author: 'Maya Angelou',
			},
			{
				text: 'Whoever is happy will make others happy too.',
				author: 'Anne Frank',
			},
			{
				text: 'The best time to plant a tree was 20 years ago. The second best time is now.',
				author: 'Chinese Proverb',
			},
			{
				text: 'Success is not final, failure is not fatal: it is the courage to continue that counts.',
				author: 'Winston Churchill',
			},
			{
				text: 'Do what you can, with what you have, where you are.',
				author: 'Theodore Roosevelt',
			},
			{
				text: 'You miss 100% of the shots you do not take.',
				author: 'Wayne Gretzky',
			},
			{
				text: 'Believe you can and you are halfway there.',
				author: 'Theodore Roosevelt',
			},
			{
				text: 'Happiness depends upon ourselves.',
				author: 'Aristotle',
			},
			{
				text: 'Act as if what you do makes a difference. It does.',
				author: 'William James',
			},
			{
				text: 'Turn your wounds into wisdom.',
				author: 'Oprah Winfrey',
			},
			{
				text: 'If you can dream it, you can do it.',
				author: 'Walt Disney',
			},
			{
				text: 'Difficulties in life are intended to make us better, not bitter.',
				author: 'Dan Reeves',
			},
			{
				text: 'In the middle of every difficulty lies opportunity.',
				author: 'Albert Einstein',
			},
			{
				text: 'A journey of a thousand miles begins with a single step.',
				author: 'Lao Tzu',
			},
			{
				text: 'The secret of getting ahead is getting started.',
				author: 'Mark Twain',
			},
			{
				text: 'Start where you are. Use what you have. Do what you can.',
				author: 'Arthur Ashe',
			},
			{
				text: 'The future depends on what you do today.',
				author: 'Mahatma Gandhi',
			},
			{
				text: 'It always seems impossible until it is done.',
				author: 'Nelson Mandela',
			},
			{
				text: 'What lies behind us and what lies before us are tiny matters compared to what lies within us.',
				author: 'Ralph Waldo Emerson',
			},
			{
				text: 'Do not wait. The time will never be just right.',
				author: 'Napoleon Hill',
			},
			{
				text: 'You become what you believe.',
				author: 'Oprah Winfrey',
			},
			{
				text: 'Hardships often prepare ordinary people for an extraordinary destiny.',
				author: 'C. S. Lewis',
			},
			{
				text: 'The only way to do great work is to love what you do.',
				author: 'Steve Jobs',
			},
			{
				text: 'Your present circumstances do not determine where you can go; they merely determine where you start.',
				author: 'Nido Qubein',
			},
			{
				text: 'Keep your face always toward the sunshine and shadows will fall behind you.',
				author: 'Walt Whitman',
			},
			{
				text: 'No matter how you feel, get up, dress up, show up, and never give up.',
				author: 'Regina Brett',
			},
			{
				text: 'Well done is better than well said.',
				author: 'Benjamin Franklin',
			},
			{
				text: 'Be yourself; everyone else is already taken.',
				author: 'Oscar Wilde',
			},
		],
		[],
	);
	const selectedQuote = useMemo(() => {
		const index = Math.floor(Math.random() * inspirationalQuotes.length);
		return inspirationalQuotes[index] || inspirationalQuotes[0];
	}, [inspirationalQuotes]);
	const loginBackgroundUrl = useMemo(() => {
		const backgroundImages = [
			'/bg_img/anastasiya-romanova-zyLQdpu4XHk-unsplash.webp',
			'/bg_img/clara-metivier-beukes-a73hUXlL9V0-unsplash.webp',
			'/bg_img/fermin-rodriguez-penelas-b8kEUZqMNoQ-unsplash.webp',
			'/bg_img/gustav-schwiering-sWk_wiHCCf4-unsplash.webp',
			'/bg_img/jensen-ragoonath-oh2iXAXWHt8-unsplash.webp',
			'/bg_img/jeremy-hynes-T-eIwyf0Xds-unsplash.webp',
			'/bg_img/keegan-houser--Q_t4SCN8c4-unsplash.webp',
			'/bg_img/kevin-oetiker-Y5MuIllbUG4-unsplash.webp',
			'/bg_img/kevin-oetiker-gwaXgnf3pE4-unsplash.webp',
			'/bg_img/kevin-oetiker-v17IhTzLICs-unsplash.webp',
			'/bg_img/leonard-cotte-c1Jp-fo53U8-unsplash.webp',
			'/bg_img/michael-N23MvbnG2BA-unsplash.webp',
			'/bg_img/moses-londo-iCds42Otudg-unsplash.webp',
			'/bg_img/niklas-jonasson-hg05ZMKDvSk-unsplash.webp',
			'/bg_img/nikolai-lehmann-agEBTnS_Nuc-unsplash.webp',
			'/bg_img/rhythm-goyal-_-Ofoh09q_o-unsplash.webp',
			'/bg_img/roman-qDS20PClmPg-unsplash.webp',
			'/bg_img/saurav-mahto-ijWb7URJQyo-unsplash.webp',
			'/bg_img/tamara-malaniy-0UxRTGI4OYg-unsplash.webp',
			'/bg_img/zhangzui-Pf23Y30hD68-unsplash.webp',
		];

		const randomIndex = Math.floor(Math.random() * backgroundImages.length);
		return backgroundImages[randomIndex] || backgroundImages[0];
	}, []);

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
			const guestGameToken = localStorage.getItem('guest_game_token') || undefined;
			const result = await verifyPhoneSignupOtp(phone.trim(), otp.trim(), undefined, guestGameToken);
			if (guestGameToken) {
				localStorage.removeItem('guest_game_token');
			}
			// Force a session probe after OTP verify so auth state updates immediately.
			await checkAuth({ force: true });

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
					backgroundImage: `linear-gradient(rgba(0, 35, 101, 0.30), rgba(0, 35, 101, 0.30)), url('${loginBackgroundUrl}')`,
				}}
			/>
			<div className="absolute inset-0 bg-[#002365]/30" />
			<div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.28),transparent_32%),radial-gradient(circle_at_bottom_right,rgba(92,107,192,0.10),transparent_30%)]" />

			<div className="relative z-10 mx-auto flex min-h-screen w-full max-w-7xl items-center px-4 py-6 sm:px-6 lg:px-8">
				<div className="grid w-full items-stretch gap-6 lg:grid-cols-[1.08fr_0.92fr] lg:gap-12">
					<section className="hidden lg:flex lg:flex-col lg:justify-center lg:animate-fadeIn">
						<div>
							<blockquote className="max-w-2xl text-3xl font-semibold leading-tight text-white">
								"{selectedQuote.text}"
							</blockquote>
							<p className="mt-4 text-lg text-white/90">{selectedQuote.author}</p>
						</div>
						<p className="mt-8 max-w-sm text-base italic text-white/90 animate-fadeInUp">Choose growth, one step at a time.</p>
					</section>

					<section className="mx-auto w-full max-w-lg justify-self-center rounded-[24px] border border-white/70 bg-white/80 p-5 shadow-[0_18px_48px_rgba(16,24,40,0.14)] backdrop-blur-xl sm:p-8 lg:justify-self-end lg:animate-scaleIn">
						<div className="mb-3 flex items-center justify-between">
							<Link to="/" className="text-sm text-calm-sage underline underline-offset-2 hover:text-wellness-text">
								Back to Home
							</Link>
						</div>

						<div className="mb-3 inline-flex items-center gap-2 rounded-full border border-calm-sage/20 bg-white/75 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-wellness-muted lg:hidden">
							<span className="h-2 w-2 rounded-full bg-calm-sage" />
							{selectedQuote.author}
						</div>
						<p className="mb-3 text-sm italic text-wellness-muted lg:hidden">"{selectedQuote.text}"</p>
						<h1 className="text-2xl font-semibold text-wellness-text sm:text-3xl">Welcome back</h1>
						<p className="mt-2 text-sm text-wellness-muted sm:text-base">Continue your wellness journey</p>

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
