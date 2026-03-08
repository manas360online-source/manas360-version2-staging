import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { getApiErrorMessage } from '../../api/auth';
import LoginForm from '../../components/auth/LoginForm';
import { getPostLoginRoute, useAuth } from '../../context/AuthContext';

export default function LoginPage() {
	const { user, isAuthenticated, login } = useAuth();
	const navigate = useNavigate();
	const location = useLocation();
	const from = (location.state as { from?: string } | null)?.from;
	const next = new URLSearchParams(location.search).get('next');

	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		if (!isAuthenticated || !user) {
			return;
		}

		const postLoginRoute = from || next || getPostLoginRoute(user);
		navigate(postLoginRoute, { replace: true });
	}, [from, isAuthenticated, navigate, next, user]);

	const onSubmit = async (identifier: string, password: string) => {
		setError(null);
		setLoading(true);
		try {
			const loggedInUser = await login(identifier, password);
			const postLoginRoute = from || next || getPostLoginRoute(loggedInUser);
			navigate(postLoginRoute, { replace: true });
		} catch (err) {
			setError(getApiErrorMessage(err, 'Login failed'));
		} finally {
			setLoading(false);
		}
	};

	return (
		<div className="responsive-page">
			<div className="responsive-container py-6 sm:py-10">
				<div className="mx-auto w-full max-w-lg rounded-3xl border border-calm-sage/20 bg-wellness-surface p-5 shadow-soft-md sm:p-8">
					<h1 className="text-2xl font-semibold text-wellness-text sm:text-3xl">Welcome back</h1>
					<p className="mt-2 text-sm text-wellness-muted sm:text-base">Sign in to continue your wellness journey.</p>
					<div className="mt-6">
						<LoginForm onSubmit={onSubmit} loading={loading} error={error} />
					</div>
					<p className="mt-6 text-center text-xs text-wellness-muted">
						By continuing, you agree to responsible and secure use of your account.
					</p>
					<p className="mt-2 text-center text-sm text-wellness-muted">
						Need to create an account?{' '}
						<Link to="/auth/signup" className="text-calm-sage underline underline-offset-2 hover:text-wellness-text">
							Register here
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
