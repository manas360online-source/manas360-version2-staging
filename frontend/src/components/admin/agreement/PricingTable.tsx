import type { ClientAgreementData } from './types';

type PricingTableProps = {
	agreement: ClientAgreementData;
};

export default function PricingTable({ agreement }: PricingTableProps) {
	return (
		<section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
			<h3 className="text-lg font-semibold text-gray-900">Pricing (Locked)</h3>
			<p className="mt-2 text-sm text-slate-600">{agreement.pricing_summary}</p>
			<div className="mt-4 overflow-x-auto">
				<table className="min-w-full divide-y divide-gray-200 text-sm">
					<thead className="bg-gray-50">
						<tr>
							<th className="px-4 py-2 text-left font-semibold text-gray-600">Item</th>
							<th className="px-4 py-2 text-left font-semibold text-gray-600">Description</th>
							<th className="px-4 py-2 text-left font-semibold text-gray-600">Amount</th>
						</tr>
					</thead>
					<tbody className="divide-y divide-gray-100 bg-white">
						{agreement.pricing_rows.map((row) => (
							<tr key={row.item}>
								<td className="px-4 py-2 text-gray-800">{row.item}</td>
								<td className="px-4 py-2 text-gray-600">{row.description}</td>
								<td className="px-4 py-2 font-medium text-gray-900">{row.amount}</td>
							</tr>
						))}
					</tbody>
				</table>
			</div>
		</section>
	);
}
