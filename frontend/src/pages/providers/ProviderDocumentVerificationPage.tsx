import { useMemo, useState } from 'react';
import { useAuth } from '../../context/AuthContext';

type RequiredDoc = {
  key: string;
  label: string;
  hint: string;
};

const requiredDocs: RequiredDoc[] = [
  { key: 'government-id', label: 'Government ID', hint: 'Passport, Aadhaar, or equivalent ID proof' },
  { key: 'degree', label: 'Professional Degree', hint: 'Medical/clinical degree certificate' },
  { key: 'license', label: 'Practice License', hint: 'Valid registration/license proof' },
];

const submittedStorageKey = (userId: string) => `manas360.provider.docs.${userId}`;

export default function ProviderDocumentVerificationPage() {
  const { user } = useAuth();
  const [submitted, setSubmitted] = useState<Record<string, boolean>>(() => {
    const userId = String(user?.id || 'unknown');
    if (typeof window === 'undefined') return {};
    const raw = window.localStorage.getItem(submittedStorageKey(userId));
    if (!raw) return {};
    try {
      return JSON.parse(raw) as Record<string, boolean>;
    } catch {
      return {};
    }
  });

  const role = String(user?.role || '').toLowerCase();
  const isVerified = Boolean(user?.isTherapistVerified);

  const submitDoc = (key: string) => {
    const next = { ...submitted, [key]: true };
    setSubmitted(next);
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(submittedStorageKey(String(user?.id || 'unknown')), JSON.stringify(next));
    }
  };

  const uploadedCount = requiredDocs.filter((doc) => submitted[doc.key]).length;

  const progress = useMemo(() => {
    if (isVerified) return { pct: 100, label: 'Admin Verified' };
    if (uploadedCount === requiredDocs.length) return { pct: 75, label: 'Under Admin Review' };
    if (uploadedCount > 0) return { pct: 45, label: 'Documents In Progress' };
    return { pct: 15, label: 'Upload Required Documents' };
  }, [isVerified, uploadedCount]);

  return (
    <div className="mx-auto w-full max-w-5xl space-y-4">
      <div className="rounded-xl border border-ink-100 bg-white p-5">
        <h1 className="text-xl font-semibold text-ink-800">Document Verification</h1>
        <p className="mt-1 text-sm text-ink-500">
          Upload required provider documents. Patients become accessible only after admin verification.
          You can still continue certifications while verification is pending.
        </p>

        <div className="mt-4 rounded-lg border border-ink-100 p-3">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium text-ink-700">Verification Progress</span>
            <span className="text-ink-600">{progress.label}</span>
          </div>
          <div className="mt-2 h-2 rounded-full bg-ink-100">
            <div className="h-2 rounded-full bg-sage-500" style={{ width: `${progress.pct}%` }} />
          </div>
          <p className="mt-2 text-xs text-ink-500">{progress.pct}% complete</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        {requiredDocs.map((doc) => {
          const done = isVerified || Boolean(submitted[doc.key]);
          return (
            <div key={doc.key} className="rounded-xl border border-ink-100 bg-white p-4">
              <p className="text-sm font-semibold text-ink-800">{doc.label}</p>
              <p className="mt-1 text-xs text-ink-500">{doc.hint}</p>
              <div className="mt-3 flex items-center justify-between">
                <span className={`rounded-full px-2 py-1 text-xs ${done ? 'bg-sage-50 text-sage-600' : 'bg-amber-50 text-amber-700'}`}>
                  {isVerified ? 'Verified' : done ? 'Submitted' : 'Pending'}
                </span>
                {!done ? (
                  <button
                    type="button"
                    onClick={() => submitDoc(doc.key)}
                    className="rounded-lg border border-ink-100 px-3 py-1.5 text-xs text-ink-700 hover:bg-ink-100"
                  >
                    Mark Uploaded
                  </button>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>

      <div className="rounded-xl border border-ink-100 bg-white p-4 text-sm text-ink-600">
        <p><strong>Role:</strong> {role || 'provider'}</p>
        <p className="mt-1"><strong>Certification:</strong> You can continue certification regardless of document verification status.</p>
      </div>
    </div>
  );
}
