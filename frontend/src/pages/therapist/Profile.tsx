import { useEffect, useMemo, useState } from 'react';
import { http } from '../../lib/http';
import TherapistBadge from '../../components/therapist/dashboard/TherapistBadge';
import TherapistButton from '../../components/therapist/dashboard/TherapistButton';
import TherapistCard from '../../components/therapist/dashboard/TherapistCard';
import {
	TherapistErrorState,
	TherapistLoadingState,
} from '../../components/therapist/dashboard/TherapistDataState';
import TherapistPageShell from '../../components/therapist/dashboard/TherapistPageShell';

type TherapistProfileState = {
	firstName: string;
	lastName: string;
	email: string;
	phone: string;
	professionalTitle: string;
	yearsOfExperience: string;
	specializations: string;
	bio: string;
	showNameToProviders: boolean;
};

const STORAGE_KEY = 'manas360-therapist-profile-v1';

const defaultProfile: TherapistProfileState = {
	firstName: '',
	lastName: '',
	email: '',
	phone: '',
	professionalTitle: 'Clinical Psychologist',
	yearsOfExperience: '',
	specializations: '',
	bio: '',
	showNameToProviders: true,
};

const parseStoredProfile = (): Partial<TherapistProfileState> => {
	try {
		const raw = localStorage.getItem(STORAGE_KEY);
		if (!raw) return {};
		return JSON.parse(raw);
	} catch {
		return {};
	}
};

export default function TherapistProfilePage() {
	const [profile, setProfile] = useState<TherapistProfileState>(defaultProfile);
	const [savedProfile, setSavedProfile] = useState<TherapistProfileState>(defaultProfile);
	const [loading, setLoading] = useState(true);
	const [saving, setSaving] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [success, setSuccess] = useState<string | null>(null);

	useEffect(() => {
		const load = async () => {
			setLoading(true);
			setError(null);

			try {
				const local = parseStoredProfile();
				let merged: TherapistProfileState = {
					...defaultProfile,
					...local,
				};

				const meRes = await http.get('/v1/users/me');
				const me = meRes.data?.data ?? meRes.data;
				const resolvedName = String(me?.name || `${me?.firstName || ''} ${me?.lastName || ''}` || '').trim();
				const parts = resolvedName ? resolvedName.split(/\s+/) : [];

				merged = {
					...merged,
					firstName: parts[0] || me?.firstName || merged.firstName,
					lastName: parts.slice(1).join(' ') || me?.lastName || merged.lastName,
					email: String(me?.email || merged.email),
					phone: String(me?.phone || merged.phone),
					showNameToProviders:
						typeof me?.showNameToProviders === 'boolean' ? me.showNameToProviders : merged.showNameToProviders,
				};

				setProfile(merged);
				setSavedProfile(merged);
			} catch (err: any) {
				setError(err?.response?.data?.message || 'Failed to load therapist profile.');
			} finally {
				setLoading(false);
			}
		};

		void load();
	}, []);

	const isDirty = useMemo(
		() => JSON.stringify(profile) !== JSON.stringify(savedProfile),
		[profile, savedProfile],
	);

	const save = async () => {
		setSaving(true);
		setError(null);
		setSuccess(null);

		try {
			const fullName = [profile.firstName.trim(), profile.lastName.trim()].filter(Boolean).join(' ');

			const res = await http.patch('/v1/users/me', {
				name: fullName,
				phone: profile.phone.trim(),
				showNameToProviders: profile.showNameToProviders,
			});

			const updated = res.data?.data ?? res.data;
			const resolvedName = String(updated?.name || fullName || '').trim();
			const parts = resolvedName ? resolvedName.split(/\s+/) : [];

			const next: TherapistProfileState = {
				...profile,
				firstName: parts[0] || profile.firstName,
				lastName: parts.slice(1).join(' ') || profile.lastName,
				email: String(updated?.email || profile.email),
				phone: String(updated?.phone || profile.phone),
				showNameToProviders:
					typeof updated?.showNameToProviders === 'boolean'
						? updated.showNameToProviders
						: profile.showNameToProviders,
			};

			setProfile(next);
			setSavedProfile(next);
			localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
			setSuccess('Therapist profile updated successfully.');
		} catch (err: any) {
			setError(err?.response?.data?.message || err?.message || 'Failed to update therapist profile.');
		} finally {
			setSaving(false);
		}
	};

	const discard = () => {
		setProfile(savedProfile);
		setError(null);
		setSuccess(null);
	};

	if (loading) {
		return (
			<TherapistPageShell title="Profile" subtitle="View and edit therapist identity details.">
				<TherapistLoadingState title="Loading profile" description="Fetching therapist profile details." />
			</TherapistPageShell>
		);
	}

	if (error && !profile.email) {
		return (
			<TherapistPageShell title="Profile" subtitle="View and edit therapist identity details.">
				<TherapistErrorState title="Unable to load profile" description={error} onRetry={() => window.location.reload()} />
			</TherapistPageShell>
		);
	}

	const fullName = [profile.firstName, profile.lastName].filter(Boolean).join(' ').trim();

	return (
		<TherapistPageShell title="Profile" subtitle="View and edit therapist identity details.">
			{error ? <TherapistErrorState title="Action failed" description={error} onRetry={() => setError(null)} /> : null}

			{success ? (
				<TherapistCard className="border border-emerald-200 bg-emerald-50 p-4">
					<p className="text-sm font-medium text-emerald-700">{success}</p>
				</TherapistCard>
			) : null}

			<TherapistCard className="p-5">
				<div className="flex flex-wrap items-center justify-between gap-3">
					<div>
						<h3 className="font-display text-lg font-bold text-ink-800">Therapist Identity</h3>
						<p className="text-sm text-ink-500">Profile information shown across therapist workspace and care-team context.</p>
					</div>
					<TherapistBadge label="Therapist Profile" variant="sage" />
				</div>

				<div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
					<div className="rounded-lg border border-ink-100 bg-surface-bg p-3">
						<p className="text-xs text-ink-500">Full Name</p>
						<p className="mt-1 font-semibold text-ink-800">{fullName || 'Not set'}</p>
					</div>
					<div className="rounded-lg border border-ink-100 bg-surface-bg p-3">
						<p className="text-xs text-ink-500">Email</p>
						<p className="mt-1 font-semibold text-ink-800">{profile.email || 'Not set'}</p>
					</div>
					<div className="rounded-lg border border-ink-100 bg-surface-bg p-3">
						<p className="text-xs text-ink-500">Role</p>
						<p className="mt-1 font-semibold text-ink-800">{profile.professionalTitle || 'Therapist'}</p>
					</div>
				</div>
			</TherapistCard>

			<TherapistCard className="p-5">
				<h3 className="font-display text-base font-bold text-ink-800">Edit Profile</h3>

				<div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
					<label className="text-sm text-ink-500">
						First Name
						<input
							value={profile.firstName}
							onChange={(event) => setProfile((prev) => ({ ...prev, firstName: event.target.value }))}
							className="mt-1 w-full rounded-lg border border-ink-100 px-3 py-2 text-sm text-ink-800 focus:border-sage-500 focus:ring-0"
						/>
					</label>
					<label className="text-sm text-ink-500">
						Last Name
						<input
							value={profile.lastName}
							onChange={(event) => setProfile((prev) => ({ ...prev, lastName: event.target.value }))}
							className="mt-1 w-full rounded-lg border border-ink-100 px-3 py-2 text-sm text-ink-800 focus:border-sage-500 focus:ring-0"
						/>
					</label>
					<label className="text-sm text-ink-500 sm:col-span-2">
						Phone
						<input
							value={profile.phone}
							onChange={(event) => setProfile((prev) => ({ ...prev, phone: event.target.value }))}
							className="mt-1 w-full rounded-lg border border-ink-100 px-3 py-2 text-sm text-ink-800 focus:border-sage-500 focus:ring-0"
						/>
					</label>
					<label className="text-sm text-ink-500 sm:col-span-2">
						Professional Title
						<input
							value={profile.professionalTitle}
							onChange={(event) => setProfile((prev) => ({ ...prev, professionalTitle: event.target.value }))}
							className="mt-1 w-full rounded-lg border border-ink-100 px-3 py-2 text-sm text-ink-800 focus:border-sage-500 focus:ring-0"
						/>
					</label>
					<label className="text-sm text-ink-500">
						Years of Experience
						<input
							value={profile.yearsOfExperience}
							onChange={(event) => setProfile((prev) => ({ ...prev, yearsOfExperience: event.target.value }))}
							className="mt-1 w-full rounded-lg border border-ink-100 px-3 py-2 text-sm text-ink-800 focus:border-sage-500 focus:ring-0"
						/>
					</label>
					<label className="text-sm text-ink-500">
						Specializations
						<input
							value={profile.specializations}
							onChange={(event) => setProfile((prev) => ({ ...prev, specializations: event.target.value }))}
							className="mt-1 w-full rounded-lg border border-ink-100 px-3 py-2 text-sm text-ink-800 focus:border-sage-500 focus:ring-0"
						/>
					</label>
				</div>

				<label className="mt-3 block text-sm text-ink-500">
					Bio
					<textarea
						value={profile.bio}
						onChange={(event) => setProfile((prev) => ({ ...prev, bio: event.target.value }))}
						className="mt-1 w-full rounded-lg border border-ink-100 px-3 py-2 text-sm text-ink-800 focus:border-sage-500 focus:ring-0"
						rows={4}
					/>
				</label>

				<div className="mt-3 flex items-center justify-between rounded-lg border border-ink-100 px-3 py-2">
					<div>
						<p className="text-sm text-ink-700">Show my name to care-team providers</p>
						<p className="text-xs text-ink-500">When disabled, your name appears masked in shared timeline contexts.</p>
					</div>
					<button
						type="button"
						onClick={() => setProfile((prev) => ({ ...prev, showNameToProviders: !prev.showNameToProviders }))}
						className={`relative h-7 w-12 rounded-full transition ${profile.showNameToProviders ? 'bg-sage-500' : 'bg-ink-300'}`}
						aria-pressed={profile.showNameToProviders}
					>
						<span className={`absolute top-1 h-5 w-5 rounded-full bg-white transition ${profile.showNameToProviders ? 'left-6' : 'left-1'}`} />
					</button>
				</div>
			</TherapistCard>

			<div className="flex justify-end gap-2">
				<TherapistButton variant="secondary" onClick={discard} disabled={!isDirty || saving}>
					Discard Changes
				</TherapistButton>
				<TherapistButton onClick={() => void save()} disabled={!isDirty || saving}>
					{saving ? 'Saving...' : 'Save Profile'}
				</TherapistButton>
			</div>
		</TherapistPageShell>
	);
}
