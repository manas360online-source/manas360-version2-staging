import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import SlideOverBookingDrawer from '../../components/patient/SlideOverBookingDrawer';
import { patientApi } from '../../api/patient';

export default function BookSessionPage() {
  const { providerId } = useParams<{ providerId: string }>();
  const navigate = useNavigate();
  const [provider, setProvider] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(true);

  useEffect(() => {
    if (!providerId) return;
    let mounted = true;
    (async () => {
      try {
        const resp = await patientApi.getProvider(providerId);
        if (mounted) setProvider(resp?.data ?? resp);
      } catch (e) {
        // If provider not found or error, navigate back to sessions
        navigate('/patient/sessions');
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [providerId, navigate]);

  const handleClose = () => {
    setOpen(false);
    // go back to sessions page after closing
    navigate('/patient/sessions');
  };

  const handleBookingSuccess = () => {
    // placeholder: could refresh data or show toast
  };

  if (loading) return null;

  return (
    <>
      <SlideOverBookingDrawer
        isOpen={open}
        onClose={handleClose}
        provider={provider}
        onBookingSuccess={handleBookingSuccess}
      />
    </>
  );
}
