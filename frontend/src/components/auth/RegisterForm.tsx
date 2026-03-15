import { FormEvent, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import Button from '../ui/Button';
import Input from '../ui/Input';

type PublicSignupRole = 'patient' | 'therapist' | 'psychiatrist' | 'coach';

type PlatformPlan = 'basic' | 'standard' | 'premium';
type RegistrationStep = 1 | 2 | 3;

type RegisterFormProps = {
	onSubmit: (payload: { name: string; email: string; password: string; role: PublicSignupRole; selectedPlan?: PlatformPlan; paymentMethod?: string }) => Promise<void>;
	loading?: boolean;
	error?: string | null;
};

export default function RegisterForm({ onSubmit, loading = false, error = null }: RegisterFormProps) {
	const [name, setName] = useState('');
	const [email, setEmail] = useState('');
	const [password, setPassword] = useState('');
	const [confirmPassword, setConfirmPassword] = useState('');
	const [role, setRole] = useState<PublicSignupRole>('patient');
	const [selectedPlan, setSelectedPlan] = useState<PlatformPlan>('standard');
	const [paymentMethod, setPaymentMethod] = useState<string>('UPI');
	const [step, setStep] = useState<RegistrationStep>(1);
	const [localError, setLocalError] = useState<string | null>(null);

	const formError = useMemo(() => localError ?? error, [localError, error]);

	const validateAccountFields = (): boolean => {
		if (!name.trim() || !email.trim() || !password.trim()) {
			setLocalError('Please fill all required fields');
			return false;
		}

		if (password.length < 8) {
			setLocalError('Password must be at least 8 characters');
			return false;
		}

		if (password !== confirmPassword) {
			setLocalError('Passwords do not match');
			return false;
		}

		return true;
	};

	const submitRegistration = async () => {
		if (!validateAccountFields()) return;
		if (role === 'patient' && !selectedPlan) {
			setLocalError('Please select a platform plan to continue');
			return;
		}

		await onSubmit({
			name: name.trim(),
			email: email.trim(),
			password,
			role,
			selectedPlan: role === 'patient' ? selectedPlan : undefined,
			paymentMethod: role === 'patient' ? paymentMethod : undefined,
		});
	};

	const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		setLocalError(null);

		if (role !== 'patient') {
			await submitRegistration();
			return;
		}

		if (step === 1) {
			if (!validateAccountFields()) return;
			setStep(2);
			return;
		}

		if (step === 2) {
			if (!selectedPlan) {
				setLocalError('Please select a platform plan to continue');
				return;
			}
			setStep(3);
			return;
		}

		await submitRegistration();
	};

	const plans: Array<{
		key: PlatformPlan;
		name: string;
		price: string;
		note?: string;
		badge?: string;
		description: string;
		features: string[];
	}> = [
		{
			key: 'standard',
			name: 'Standard Plan',
			price: '₹199 / month',
			badge: 'Most Popular',
			description: 'Full platform access for daily care.',
			features: ['PHQ-9 and GAD-7', 'Therapist discovery', 'Session scheduling'],
		},
	];

	const trustSignals = [
		'Secure payment',
		'Cancel anytime',
		'HIPAA compliant data protection',
		'Trusted by mental health professionals',
	];

	return (
		<form onSubmit={handleSubmit} className="space-y-4" noValidate>
			{role === 'patient' ? (
				<div className="rounded-2xl border border-calm-sage/20 bg-calm-sage/5 p-3">
					<div className="grid grid-cols-3 gap-2 text-center text-xs font-semibold">
						<div className={`rounded-lg px-2 py-2 ${step >= 1 ? 'bg-white text-calm-sage' : 'text-wellness-muted'}`}>Create Account</div>
						<div className={`rounded-lg px-2 py-2 ${step >= 2 ? 'bg-white text-calm-sage' : 'text-wellness-muted'}`}>Choose Plan</div>
						<div className={`rounded-lg px-2 py-2 ${step >= 3 ? 'bg-white text-calm-sage' : 'text-wellness-muted'}`}>Payment</div>
					</div>
				</div>
			) : null}

			{(role !== 'patient' || step === 1) && (
				<>
					<Input
						id="register-name"
						label="Full Name"
						autoComplete="name"
						placeholder="Your full name"
						value={name}
						onChange={(event) => setName(event.target.value)}
						required
					/>
					<Input
						id="register-email"
						label="Email"
						type="email"
						autoComplete="email"
						placeholder="you@example.com"
						value={email}
						onChange={(event) => setEmail(event.target.value)}
						required
					/>
					<Input
						id="register-password"
						label="Password"
						type="password"
						autoComplete="new-password"
						helperText="Use at least 8 characters"
						placeholder="Create a strong password"
						value={password}
						onChange={(event) => setPassword(event.target.value)}
						required
					/>
					<Input
						id="register-confirm-password"
						label="Confirm Password"
						type="password"
						autoComplete="new-password"
						placeholder="Re-enter password"
						value={confirmPassword}
						onChange={(event) => setConfirmPassword(event.target.value)}
						required
					/>

					<div>
						<label htmlFor="register-role" className="mb-2 block text-sm font-medium text-wellness-text">
							Role
						</label>
						<select
							id="register-role"
							value={role}
							onChange={(event) => {
								const nextRole = event.target.value as PublicSignupRole;
								setRole(nextRole);
								if (nextRole !== 'patient') {
									setStep(1);
								}
							}}
							className="w-full rounded-2xl border-2 border-calm-sage/30 bg-white px-5 py-3 text-wellness-text transition-smooth focus:border-calm-sage focus:outline-none focus:ring-2 focus:ring-calm-sage/20"
							required
						>
							<option value="patient">Patient</option>
							<option value="therapist">Therapist</option>
							<option value="psychiatrist">Psychiatrist</option>
							<option value="coach">Coach</option>
						</select>
					</div>
				</>
			)}

			{role === 'patient' && step === 2 && (
				<div className="space-y-4">
					<div>
						<p className="text-xs font-semibold uppercase tracking-[0.1em] text-calm-sage">Step 2</p>
						<h3 className="mt-1 text-xl font-semibold text-wellness-text">Choose Your Platform Access</h3>
						<p className="mt-1 text-sm text-wellness-muted">Platform subscription unlocks core mental wellness tools. Therapy sessions are paid separately.</p>
					</div>

					<div className="grid gap-3 md:max-w-md md:mx-auto">
						{plans.map((plan) => (
							<button
								type="button"
								key={plan.key}
								onClick={() => setSelectedPlan(plan.key)}
								className={`relative rounded-2xl border bg-white p-4 text-left shadow-soft-sm transition duration-300 hover:-translate-y-0.5 hover:shadow-soft-md ${
									selectedPlan === plan.key ? 'border-2 border-calm-sage' : 'border-calm-sage/20'
								}`}
							>
								{plan.badge ? (
									<span className={`absolute right-3 top-3 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] ${plan.badge === 'Most Popular' ? 'bg-calm-sage text-white' : 'bg-ink-100 text-ink-700'}`}>
										{plan.badge}
									</span>
								) : null}
								<p className="text-base font-semibold text-wellness-text">{plan.name}</p>
								<p className="mt-1 text-lg font-bold text-calm-sage">{plan.price}</p>
								{plan.note ? <p className="text-xs text-wellness-muted">{plan.note}</p> : null}
								<p className="mt-2 text-sm text-wellness-muted">{plan.description}</p>
								<ul className="mt-2 space-y-1 text-xs text-wellness-text">
									{plan.features.map((feature) => (
										<li key={feature}>• {feature}</li>
									))}
								</ul>
							</button>
						))}
					</div>

					<div className="rounded-xl border border-calm-sage/20 bg-calm-sage/5 p-3 text-xs text-wellness-muted">
						<p className="font-semibold text-wellness-text">Platform subscription unlocks:</p>
						<p className="mt-1">• AI mental health assistant</p>
						<p>• Clinical assessments (PHQ-9, GAD-7)</p>
						<p>• Therapist discovery</p>
						<p>• Session scheduling</p>
						<p>• Mood tracking</p>
						<p className="mt-1">Therapy sessions are paid separately.</p>
					</div>

					<div className="grid gap-2 rounded-xl border border-ink-100 bg-white p-3 text-xs text-wellness-text sm:grid-cols-2">
						{trustSignals.map((item) => (
							<p key={item}>✔ {item}</p>
						))}
					</div>
				</div>
			)}

			{role === 'patient' && step === 3 && (
				<div className="space-y-4 rounded-2xl border border-calm-sage/20 bg-calm-sage/5 p-4">
					<div>
						<p className="text-xs font-semibold uppercase tracking-[0.1em] text-calm-sage">Step 3</p>
						<h3 className="mt-1 text-xl font-semibold text-wellness-text">Payment</h3>
					</div>

					<div className="rounded-xl border border-calm-sage/20 bg-white p-3">
						<p className="text-sm font-semibold text-wellness-text">Plan Selected</p>
						<p className="mt-1 text-sm text-wellness-muted">{plans.find((plan) => plan.key === selectedPlan)?.name || 'Selected Plan'}</p>
						<p className="mt-1 text-base font-semibold text-calm-sage">{plans.find((plan) => plan.key === selectedPlan)?.price || ''}</p>
					</div>

					<div>
						<label htmlFor="register-payment-method" className="mb-2 block text-sm font-semibold text-wellness-text">
							Payment Method
						</label>
						<select
							id="register-payment-method"
							value={paymentMethod}
							onChange={(event) => setPaymentMethod(event.target.value)}
							className="w-full rounded-2xl border border-calm-sage/25 bg-white px-4 py-2.5 text-sm text-wellness-text focus:border-calm-sage focus:outline-none"
						>
							<option>UPI</option>
							<option>Credit Card</option>
							<option>Debit Card</option>
							<option>Net Banking</option>
							<option>Wallet</option>
						</select>
					</div>
				</div>
			)}

			{role === 'patient' ? (
				<div className="flex items-center justify-between gap-2">
					{step > 1 ? (
						<Button type="button" variant="secondary" onClick={() => setStep((prev) => (prev === 3 ? 2 : 1))}>
							Back
						</Button>
					) : <div />}

					<Button type="submit" loading={loading} className="min-h-[48px]">
						{loading
							? 'Processing...'
							: step === 1
								? 'Continue to Plan'
								: step === 2
									? 'Continue to Payment'
									: 'Start Subscription'}
					</Button>
				</div>
			) : (
				<Button type="submit" fullWidth loading={loading} className="min-h-[48px]">
					{loading
						? 'Creating account...'
						: role === 'therapist'
							? 'Register as Therapist'
							: role === 'psychiatrist'
								? 'Register as Psychiatrist'
								: role === 'coach'
									? 'Register as Coach'
									: 'Create Account'}
				</Button>
			)}

			<div className="text-sm text-wellness-muted">
				Already have an account?{' '}
				<Link to="/auth/login" className="text-calm-sage underline underline-offset-2 hover:text-wellness-text">
					Login
				</Link>
			</div>

			{formError && (
				<p id="register-form-error" role="alert" aria-live="polite" className="text-sm text-red-600">
					{formError}
				</p>
			)}
		</form>
	);
}
