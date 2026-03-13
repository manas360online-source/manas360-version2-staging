import { useNavigate } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import DailyCheckInModal from '../../components/patient/DailyCheckInModal';

/**
 * Standalone route wrapper for the Daily Check-in modal.
 * Accessible at /patient/check-in — navigates back to dashboard on close.
 */
export default function DailyCheckInPage() {
  const navigate = useNavigate();

  const handleClose = () => {
    navigate('/patient/dashboard', { replace: true });
  };

  const handleComplete = () => {
    navigate('/patient/dashboard', { replace: true });
  };

  return (
    <AnimatePresence>
      <DailyCheckInModal onClose={handleClose} onComplete={handleComplete} />
    </AnimatePresence>
  );
}
