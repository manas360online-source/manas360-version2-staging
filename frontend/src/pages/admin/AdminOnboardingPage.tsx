import { useNavigate } from 'react-router-dom';
import DocumentAcceptanceModal from './DocumentAcceptanceModal';

export default function AdminOnboardingPage() {
  const navigate = useNavigate();

  return (
    <DocumentAcceptanceModal
      isOpen
      initialStepIndex={0}
      onCompleted={() => {
        navigate('/admin/data-privacy-hub');
      }}
      onClose={() => {
        navigate('/admin/dashboard');
      }}
    />
  );
}
