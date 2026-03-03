import { FormEvent, useState } from 'react';
import { Link } from 'react-router-dom';
import Button from '../ui/Button';
import Input from '../ui/Input';

type LoginFormProps = {
	onSubmit: (identifier: string, password: string) => Promise<void>;
	loading?: boolean;
	error?: string | null;
};

export default function LoginForm({ onSubmit, loading = false, error = null }: LoginFormProps) {
	const [identifier, setIdentifier] = useState('');
	const [password, setPassword] = useState('');

	const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		if (!identifier.trim() || !password.trim()) {
			return;
		}

		await onSubmit(identifier.trim(), password);
	};

	return (
		<form onSubmit={handleSubmit} className="space-y-4" noValidate>
			<Input
				id="login-identifier"
				label="Email or Phone"
				type="text"
				autoComplete="username"
				placeholder="you@example.com or +91XXXXXXXXXX"
				value={identifier}
				onChange={(event) => setIdentifier(event.target.value)}
				required
				error={error ?? undefined}
				aria-invalid={!!error}
				aria-describedby={error ? 'login-form-error' : undefined}
			/>
			<Input
				id="login-password"
				label="Password"
				type="password"
				autoComplete="current-password"
				placeholder="••••••••"
				value={password}
				onChange={(event) => setPassword(event.target.value)}
				required
			/>
			<Button type="submit" fullWidth loading={loading} className="min-h-[48px]">
				{loading ? 'Signing in...' : 'Login'}
			</Button>
			<div className="flex flex-col gap-2 text-sm sm:flex-row sm:items-center sm:justify-between">
				<Link to="/auth/forgot-password" className="text-calm-sage underline underline-offset-2 hover:text-wellness-text">
					Forgot password?
				</Link>
				<Link to="/auth/signup" className="text-wellness-muted hover:text-wellness-text">
					Need an account? Register
				</Link>
			</div>
			{error && (
				<p id="login-form-error" role="alert" aria-live="polite" className="text-sm text-red-600">
					{error}
				</p>
			)}
		</form>
	);
}
