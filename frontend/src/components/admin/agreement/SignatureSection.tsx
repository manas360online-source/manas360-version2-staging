import Input from '../../ui/Input';
import type { ClientAgreementData, EditableAgreementFields } from './types';

type SignatureSectionProps = {
	agreement: ClientAgreementData;
	onEditableChange: <K extends keyof EditableAgreementFields>(field: K, value: EditableAgreementFields[K]) => void;
};

export default function SignatureSection({ agreement, onEditableChange }: SignatureSectionProps) {
	return (
		<section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
			<h3 className="text-lg font-semibold text-gray-900">Signature & Final Inputs</h3>
			<div className="mt-4 grid gap-4 md:grid-cols-2">
				<Input
					id="payment_frequency"
					label="Payment Frequency"
					value={agreement.payment_frequency}
					onChange={(event) => onEditableChange('payment_frequency', event.target.value)}
				/>
				<Input
					id="workshop_selections"
					label="Workshop Selections"
					value={agreement.workshop_selections}
					onChange={(event) => onEditableChange('workshop_selections', event.target.value)}
				/>
			</div>
			<div className="mt-4">
				<label htmlFor="client_notes" className="mb-2 block text-sm font-medium text-gray-700">Client Notes</label>
				<textarea
					id="client_notes"
					rows={4}
					value={agreement.client_notes}
					onChange={(event) => onEditableChange('client_notes', event.target.value)}
					placeholder="Additional notes"
					className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none"
				/>
			</div>
			<div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
				Executing signatory: {agreement.signatory_name || '—'} ({agreement.signatory_email || '—'})
			</div>
		</section>
	);
}
