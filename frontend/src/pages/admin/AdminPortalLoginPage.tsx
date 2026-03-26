import { FormEvent, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getApiErrorMessage } from '../../api/auth';
import { hasCorporateAccess, isPlatformAdminUser, useAuth } from '../../context/AuthContext';

export default function AdminPortalLoginPage() {
	const { isAuthenticated, user, login, logout } = useAuth();
	const navigate = useNavigate();

	const [identifier, setIdentifier] = useState('');
	const [password, setPassword] = useState('');
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		if (!isAuthenticated || !user) {
			return;
		}

		if (isPlatformAdminUser(user)) {
			navigate('/admin/dashboard', { replace: true });
			return;
		}

		if (hasCorporateAccess(user)) {
			navigate('/corporate/dashboard', { replace: true });
			return;
		}

		void logout();
		setError('Admin portal accepts admin accounts only. You have been signed out.');
	}, [isAuthenticated, user, navigate, logout]);

	const onSubmit = async (event: FormEvent) => {
		event.preventDefault();
		if (!identifier.trim() || !password.trim()) {
			return;
		}

		setLoading(true);
		setError(null);

		try {
			const loggedInUser = await login(identifier.trim(), password);

			if (!isPlatformAdminUser(loggedInUser)) {
				await logout();
				setError('Access denied. This URL is only for platform admin users.');
				return;
			}

			navigate('/admin/dashboard', { replace: true });
		} catch (err) {
			setError(getApiErrorMessage(err, 'Admin login failed'));
		} finally {
			setLoading(false);
		}
	};

	return (
		<div className="responsive-page">
			<div className="responsive-container">
				<div className="mx-auto w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-md">
					<div className="mb-3">
						<Link to="/" className="text-sm text-slate-700 underline underline-offset-2 hover:text-slate-900">
							Back to Home
						</Link>
					</div>
					<h1 className="text-2xl font-semibold text-slate-900">Admin Portal Login</h1>
					<p className="mt-2 text-sm text-slate-600">Only admin accounts can access this portal.</p>

					<form onSubmit={onSubmit} className="mt-6 space-y-3">
						<label className="block">
							<span className="mb-1 block text-sm text-slate-700">Admin Email</span>
							<input
								value={identifier}
								onChange={(e) => setIdentifier(e.target.value)}
								className="w-full rounded border border-slate-300 px-3 py-2"
								placeholder="admin@yourcompany.com"
								type="email"
								autoComplete="username"
								required
							/>
						</label>
						<label className="block">
							<span className="mb-1 block text-sm text-slate-700">Password</span>
							<input
								value={password}
								onChange={(e) => setPassword(e.target.value)}
								className="w-full rounded border border-slate-300 px-3 py-2"
								type="password"
								placeholder="••••••••"
								autoComplete="current-password"
								required
							/>
						</label>

						<button
							type="submit"
							disabled={loading}
							className="w-full rounded bg-slate-900 px-4 py-2 font-medium text-white disabled:opacity-60"
						>
							{loading ? 'Signing in...' : 'Login as Admin'}
						</button>
					</form>

					{error && <p className="mt-3 text-sm text-rose-600">{error}</p>}
				</div>
			</div>
		</div>
	);
}