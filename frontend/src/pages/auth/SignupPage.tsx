import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { getApiErrorMessage } from '../../api/auth';
import RegisterForm from '../../components/auth/RegisterForm';
import { useAuth } from '../../context/AuthContext';

export default function SignupPage() {
	const { register } = useAuth();
	const navigate = useNavigate();
	const location = useLocation();
	const next = new URLSearchParams(location.search).get('next');
	const loginHref = next ? `/auth/login?next=${encodeURIComponent(next)}` : '/auth/login';

	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [success, setSuccess] = useState<string | null>(null);

	const onSubmit = async (payload: { name: string; email: string; password: string; role: 'patient' | 'therapist' | 'psychiatrist' | 'coach' }) => {
		setError(null);
		setSuccess(null);
		setLoading(true);
		try {
			await register(payload.email, payload.password, payload.name, payload.role);
			setSuccess('Registration successful. Please verify email OTP to unlock login access.');
			navigate(loginHref, { replace: true, state: { from: '/auth/signup' } });
		} catch (err) {
			setError(getApiErrorMessage(err, 'Registration failed'));
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
					<p className="mt-4 text-center text-sm text-wellness-muted">
						Already registered?{' '}
						<Link to={loginHref} className="text-calm-sage underline underline-offset-2 hover:text-wellness-text">
							Go to login
						</Link>
					</p>
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
