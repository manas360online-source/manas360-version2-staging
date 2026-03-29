import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { getApiErrorMessage, signupWithPhone, verifyPhoneSignupOtp } from '../../api/auth';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import { useAuth, getPostLoginRoute } from '../../context/AuthContext';

export default function SignupPage() {
	const { checkAuth } = useAuth();
	const navigate = useNavigate();

	const [name, setName] = useState('');
	const [phone, setPhone] = useState('');
	const [role, setRole] = useState<'patient' | 'therapist' | 'psychiatrist' | 'coach'>('patient');
	const [otp, setOtp] = useState('');
	const [otpSent, setOtpSent] = useState(false);
	const [devOtp, setDevOtp] = useState<string | null>(null);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const requestOtp = async () => {
		setError(null);
		setLoading(true);
		setDevOtp(null);
		try {
			const result = await signupWithPhone(phone.trim(), { name: name.trim(), role });
			setOtpSent(true);
			setDevOtp(result.devOtp || null);
		} catch (err) {
			setError(getApiErrorMessage(err, 'Failed to send OTP'));
		} finally {
			setLoading(false);
		}
	};

	const location = useLocation();

	const resolveReturnTo = (): string => {
		const qp = new URLSearchParams(location.search);
		return qp.get('returnTo') || qp.get('next') || window.location.pathname || '/';
	};

	const verifyOtp = async () => {
		setError(null);
		setLoading(true);
		try {
			const result = await verifyPhoneSignupOtp(phone.trim(), otp.trim());
			await checkAuth({ force: true });
			// If backend indicates patient requires a subscription, send to plans page
			if ((result.user as any)?.requiresSubscription) {
				const returnTo = resolveReturnTo();
				navigate(`/plans?returnTo=${encodeURIComponent(returnTo)}`, { replace: true });
				return;
			}
			const postLoginRoute = getPostLoginRoute(result.user);
			navigate(postLoginRoute, { replace: true });
		} catch (err) {
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
					<h1 className="text-2xl font-semibold text-wellness-text sm:text-3xl">Create your account</h1>
					<p className="mt-2 text-sm text-wellness-muted sm:text-base">Register using phone number and OTP.</p>

					<div className="mt-6 space-y-4">
						<Input
							id="signup-name"
							label="Full Name"
							autoComplete="name"
							placeholder="Your full name"
							value={name}
							onChange={(event) => setName(event.target.value)}
							required
						/>
						<Input
							id="signup-phone"
							label="Phone Number"
							type="tel"
							autoComplete="tel"
							placeholder="+919876543210"
							value={phone}
							onChange={(event) => setPhone(event.target.value)}
							required
						/>

						<div>
							<label htmlFor="signup-role" className="mb-2 block text-sm font-medium text-wellness-text">Role</label>
							<select
								id="signup-role"
								value={role}
								onChange={(event) => setRole(event.target.value as 'patient' | 'therapist' | 'psychiatrist' | 'coach')}
								className="w-full rounded-2xl border-2 border-calm-sage/30 bg-white px-5 py-3 text-wellness-text transition-smooth focus:border-calm-sage focus:outline-none focus:ring-2 focus:ring-calm-sage/20"
							>
								<option value="patient">Patient</option>
								<option value="therapist">Therapist</option>
								<option value="psychiatrist">Psychiatrist</option>
								<option value="coach">Coach</option>
							</select>
						</div>

						{otpSent ? (
							<Input
								id="signup-otp"
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
								{loading ? 'Verifying OTP...' : 'Verify OTP and Register'}
							</Button>
						)}
					</div>

					{devOtp ? (
						<p className="mt-3 text-xs text-wellness-muted">
							Development OTP: <span className="font-semibold text-wellness-text">{devOtp}</span>
						</p>
					) : null}

					{error ? (
						<p role="alert" aria-live="polite" className="mt-3 text-sm text-red-600">{error}</p>
					) : null}

					<p className="mt-2 text-center text-sm text-wellness-muted">
						Already have an account?{' '}
						<Link to="/auth/login" className="text-calm-sage underline underline-offset-2 hover:text-wellness-text">
							Login here
						</Link>
					</p>
				</div>
			</div>
		</div>
	);
}
