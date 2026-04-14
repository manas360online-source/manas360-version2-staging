import type { ClientAgreementData } from './types';

type AddonTableProps = {
	agreement: ClientAgreementData;
	onAddonToggle: (addonId: string, checked: boolean) => void;
};

export default function AddonTable({ agreement, onAddonToggle }: AddonTableProps) {
	return (
		<section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
			<h3 className="text-lg font-semibold text-gray-900">Add-ons (Client Editable)</h3>
			<div className="mt-4 overflow-x-auto">
				<table className="min-w-full divide-y divide-gray-200 text-sm">
					<thead className="bg-gray-50">
						<tr>
							<th className="px-4 py-2 text-left font-semibold text-gray-600">Select</th>
							<th className="px-4 py-2 text-left font-semibold text-gray-600">Add-on</th>
							<th className="px-4 py-2 text-left font-semibold text-gray-600">Description</th>
							<th className="px-4 py-2 text-left font-semibold text-gray-600">Price</th>
						</tr>
					</thead>
					<tbody className="divide-y divide-gray-100 bg-white">
						{agreement.addon_rows.map((addon) => (
							<tr key={addon.id}>
								<td className="px-4 py-2">
									<input
										type="checkbox"
										checked={Boolean(agreement.addon_selections[addon.id])}
										onChange={(event) => onAddonToggle(addon.id, event.target.checked)}
										className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
									/>
								</td>
								<td className="px-4 py-2 font-medium text-gray-800">{addon.name}</td>
								<td className="px-4 py-2 text-gray-600">{addon.description}</td>
								<td className="px-4 py-2 text-gray-900">{addon.price}</td>
							</tr>
						))}
					</tbody>
				</table>
			</div>
		</section>
	);
}
