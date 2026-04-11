import CorporateShellLayout from '../../components/corporate/CorporateShellLayout';
import AgreementDashboard from '../../components/corporate/AgreementDashboard';

export default function CorporateAgreementPage() {
  return (
    <CorporateShellLayout
      title="Agreement"
      subtitle="Manage employee agreements and contracts."
    >
      <AgreementDashboard />
    </CorporateShellLayout>
  );
}
