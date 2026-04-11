import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { acceptLegalDocuments, getRequiredLegalDocuments, getApiErrorMessage, type LegalDocument } from '../../api/auth';
import Button from '../../components/ui/Button';
import { getPostLoginRoute, useAuth } from '../../context/AuthContext';

const parseReturnTo = (search: string): string => {
  const query = new URLSearchParams(search);
  const value = query.get('returnTo');
  if (!value) {
    return '/dashboard';
  }

  return value.startsWith('/') ? value : `/${value}`;
};

export default function LegalAcceptancePage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, checkAuth } = useAuth();

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [documents, setDocuments] = useState<LegalDocument[]>([]);

  const returnTo = useMemo(() => parseReturnTo(location.search), [location.search]);

  useEffect(() => {
    let isMounted = true;

    const run = async () => {
      setLoading(true);
      setError(null);

      try {
        const result = await getRequiredLegalDocuments();
        if (!isMounted) return;

        if (!result.legalAcceptanceRequired || result.pendingDocuments.length === 0) {
          await checkAuth({ force: true });
          navigate(returnTo, { replace: true });
          return;
        }

        setDocuments(result.pendingDocuments);
      } catch (err) {
        if (!isMounted) return;
        setError(getApiErrorMessage(err, 'Unable to load legal documents'));
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    void run();

    return () => {
      isMounted = false;
    };
  }, [checkAuth, navigate, returnTo]);

  const handleAcceptAll = async () => {
    setSubmitting(true);
    setError(null);

    try {
      await acceptLegalDocuments(documents.map((document) => document.id));
      await checkAuth({ force: true });
      navigate(returnTo || getPostLoginRoute(user), { replace: true });
    } catch (err) {
      setError(getApiErrorMessage(err, 'Unable to accept legal documents'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="responsive-page">
      <div className="responsive-container py-6 sm:py-10">
        <div className="mx-auto w-full max-w-2xl rounded-3xl border border-calm-sage/20 bg-wellness-surface p-5 shadow-soft-md sm:p-8">
          <div className="mb-3">
            <Link to="/" className="text-sm text-calm-sage underline underline-offset-2 hover:text-wellness-text">
              Back to Home
            </Link>
          </div>

          <h1 className="text-2xl font-semibold text-wellness-text sm:text-3xl">Action Required</h1>
          <p className="mt-2 text-sm text-wellness-muted sm:text-base">
            Please accept the latest legal documents to continue using your dashboard.
          </p>

          {loading ? (
            <p className="mt-6 text-sm text-wellness-muted">Loading required documents...</p>
          ) : (
            <div className="mt-6 space-y-4">
              {documents.map((document) => (
                <div key={document.id} className="rounded-xl border border-calm-sage/20 p-4">
                  <p className="text-base font-semibold text-wellness-text">{document.title}</p>
                  <p className="mt-1 text-xs text-wellness-muted">
                    Type: {document.type} | Version: {document.version}
                  </p>
                </div>
              ))}

              <Button
                type="button"
                fullWidth
                loading={submitting}
                className="min-h-[48px]"
                onClick={handleAcceptAll}
                disabled={documents.length === 0}
              >
                {submitting ? 'Accepting...' : 'Accept And Continue'}
              </Button>
            </div>
          )}

          {error ? (
            <p role="alert" aria-live="polite" className="mt-3 text-sm text-red-600">
              {error}
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
