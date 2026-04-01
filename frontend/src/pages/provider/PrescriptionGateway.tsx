import { useAuth } from '../../context/AuthContext';
import PsychiatristPrescriptionTab from '../psychiatrist/PsychiatristPrescriptionTab';
import Prescriptions from './Patients/Tabs/Prescriptions';

export default function PrescriptionGateway() {
  const { user } = useAuth();
  
  if (user?.role === 'psychiatrist') {
    return <PsychiatristPrescriptionTab />;
  }
  
  return <Prescriptions />;
}
