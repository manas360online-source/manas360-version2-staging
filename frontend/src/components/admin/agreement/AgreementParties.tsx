import Input from '../../ui/Input';
import type { ClientAgreementData, EditableAgreementFields } from './types';

type AgreementPartiesProps = {
	agreement: ClientAgreementData;
	onEditableChange: <K extends keyof EditableAgreementFields>(field: K, value: EditableAgreementFields[K]) => void;
};

export default function AgreementParties({ agreement, onEditableChange }: AgreementPartiesProps) {
	return (
		<section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
			<h3 className="text-lg font-semibold text-gray-900">Parties</h3>
			<div className="mt-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
				Provider (read-only): {agreement.platform_name}, {agreement.platform_address}
			</div>
			<div className="mt-4 grid gap-4 md:grid-cols-2">
				<Input
					id="company_name"
					label="Company Name"
					value={agreement.company_name}
					onChange={(event) => onEditableChange('company_name', event.target.value)}
				/>
				<Input
					id="company_address"
					label="Company Address"
					value={agreement.company_address}
					onChange={(event) => onEditableChange('company_address', event.target.value)}
				/>
				<Input
					id="company_industry"
					label="Company Industry"
					value={agreement.company_industry}
					onChange={(event) => onEditableChange('company_industry', event.target.value)}
				/>
				<Input
					id="signatory_name"
					label="Signatory Name"
					value={agreement.signatory_name}
					onChange={(event) => onEditableChange('signatory_name', event.target.value)}
				/>
				<Input
					id="signatory_email"
					label="Signatory Email"
					type="email"
					value={agreement.signatory_email}
					onChange={(event) => onEditableChange('signatory_email', event.target.value)}
				/>
				<Input
					id="signatory_phone"
					label="Signatory Phone"
					value={agreement.signatory_phone}
					onChange={(event) => onEditableChange('signatory_phone', event.target.value)}
				/>
			</div>
		</section>
	);
}
