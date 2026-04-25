import type { ClientAgreementData } from './types';

type AgreementHeaderProps = {
	agreementId?: string;
	agreement: ClientAgreementData;
};

export default function AgreementHeader({ agreementId, agreement }: AgreementHeaderProps) {
	return (
		<section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
			<h2 className="text-2xl font-bold text-gray-900">{agreement.platform_name} Client Service Agreement</h2>
			<div className="mt-3 grid gap-2 text-sm text-gray-700 sm:grid-cols-2">
				<p><span className="font-semibold text-gray-900">Agreement ID:</span> {agreementId || agreement.agreement_number}</p>
				<p><span className="font-semibold text-gray-900">Agreement No:</span> {agreement.agreement_number}</p>
				<p><span className="font-semibold text-gray-900">Effective Date:</span> {agreement.effective_date}</p>
				<p><span className="font-semibold text-gray-900">Provider:</span> {agreement.platform_name}</p>
			</div>
		</section>
	);
}
