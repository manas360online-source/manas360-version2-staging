import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getApiErrorMessage } from '../../api/auth';
import { patientApi } from '../../api/patient';
import RegisterForm from '../../components/auth/RegisterForm';
import { useAuth } from '../../context/AuthContext';

export default function SignupPage() {
	const { register, login } = useAuth();
	const navigate = useNavigate();

	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [success, setSuccess] = useState<string | null>(null);

	const onSubmit = async (payload: {
		name: string;
		email: string;
		password: string;
		role: 'patient' | 'therapist' | 'psychiatrist' | 'coach';
		selectedPlan?: 'free' | 'monthly' | 'quarterly' | 'premium_monthly' | 'premium_annual';
		paymentMethod?: string;
	}) => {
		setError(null);
		setSuccess(null);
		setLoading(true);
		try {
			await register(payload.email, payload.password, payload.name, payload.role);
			if (payload.role === 'patient') {
				await login(payload.email, payload.password);
				const selectedPlan = payload.selectedPlan || 'free';
				const subscriptionResponse = await patientApi.upgradeSubscription({ planKey: selectedPlan });

				if (selectedPlan !== 'free') {
					if (subscriptionResponse?.redirectUrl) {
						window.location.href = subscriptionResponse.redirectUrl;
						return;
					}

					throw new Error('Payment gateway link was not returned. Please retry.');
				}

				setSuccess('Registration and platform activation successful. Redirecting to care...');
				navigate('/patient/onboarding?next=/patient/sessions', { replace: true });
			} else {
				const providerSetupRoute = '/onboarding/provider-setup';
				setSuccess('Registration successful. Verify your email OTP, then continue to provider setup.');
				navigate(`/auth/login?next=${encodeURIComponent(providerSetupRoute)}`, { replace: true });
			}
		} catch (err) {
			setError(getApiErrorMessage(err, 'Registration failed.'));
		} finally {
			setLoading(false);
		}
	};

	return (
		<div className="responsive-page">
			<div className="responsive-container py-6 sm:py-10">
				<div className="mx-auto w-full max-w-lg rounded-3xl border border-calm-sage/20 bg-wellness-surface p-5 shadow-soft-md sm:p-8">
					<h1 className="text-2xl font-semibold text-wellness-text sm:text-3xl">Create your account</h1>
					<p className="mt-2 text-sm text-wellness-muted sm:text-base">Start with the role that best describes how you’ll use MANAS360.</p>
					<div className="mt-6">
						<RegisterForm onSubmit={onSubmit} loading={loading} error={error} />
					</div>
					{success && (
						<p className="mt-4 text-sm text-emerald-700" role="status" aria-live="polite">
							{success}
						</p>
					)}
					<p className="mt-2 text-center text-xs text-wellness-muted">
						Want to go back to the landing page?{' '}
						<Link to="/" className="text-calm-sage underline underline-offset-2 hover:text-wellness-text">
							Go to Home
						</Link>
					</p>
				</div>
			</div>
		</div>
	);
}
