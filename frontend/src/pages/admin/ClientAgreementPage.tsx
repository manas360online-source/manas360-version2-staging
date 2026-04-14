import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import AgreementHeader from '../../components/admin/agreement/AgreementHeader';
import AgreementParties from '../../components/admin/agreement/AgreementParties';
import ArticleSection from '../../components/admin/agreement/ArticleSection';
import PricingTable from '../../components/admin/agreement/PricingTable';
import AddonTable from '../../components/admin/agreement/AddonTable';
import SignatureSection from '../../components/admin/agreement/SignatureSection';
import type { ClientAgreementData, EditableAgreementFields } from '../../components/admin/agreement/types';

type AgreementArticle = {
	id: string;
	title: string;
	content: string;
};

const DEFAULT_AGREEMENT_DATA: ClientAgreementData = {
	platform_name: 'MANAS360',
	agreement_number: 'AGR-CLIENT-2026-001',
	effective_date: '14 Apr 2026',
	platform_address: 'MANAS360 HQ, Bengaluru, India',
	pricing_summary: 'Startup Tier - INR 1,20,000 annually (locked by admin)',
	legal_clauses_summary: 'Confidentiality, IP, and compliance clauses are locked by legal team.',
	liability_clause: 'Liability is limited as per Master Services Terms (non-editable).',
	jurisdiction_clause: 'Exclusive jurisdiction: Bengaluru, Karnataka, India.',
	company_name: '',
	company_address: '',
	company_industry: '',
	signatory_name: '',
	signatory_email: '',
	signatory_phone: '',
	workshop_selections: '',
	payment_frequency: '',
	client_notes: '',
	pricing_rows: [
		{ item: 'Base Plan', description: 'Annual EAP coverage', amount: 'INR 1,20,000' },
		{ item: 'Per Employee Rate', description: 'Calculated from approved tier', amount: 'INR 2,667' },
	],
	addon_rows: [
		{ id: 'addon-1', name: 'Leadership Workshop', description: 'Quarterly leadership mental health workshops', price: 'INR 35,000' },
		{ id: 'addon-2', name: 'Wellness Pulse Survey', description: 'Monthly employee wellbeing survey analytics', price: 'INR 18,000' },
		{ id: 'addon-3', name: '24x7 Priority Support', description: 'Priority care escalation and rapid response support', price: 'INR 24,000' },
	],
	addon_selections: {
		'addon-1': false,
		'addon-2': false,
		'addon-3': false,
	},
};

const ARTICLE_SECTIONS: AgreementArticle[] = [
	{
		id: 'article-1',
		title: 'Article 1 - Scope of Services',
		content: 'Services under this agreement include EAP support and program delivery to [[company_name]].',
	},
	{
		id: 'article-2',
		title: 'Article 2 - Workshop Selections',
		content: 'Selected workshop package(s): [[workshop_selections]].',
	},
	{
		id: 'article-3',
		title: 'Article 3 - Add-ons',
		content: 'Optional add-ons are captured in the Add-ons table and approved by client signatory.',
	},
	{
		id: 'article-4',
		title: 'Article 4 - Commercials and Pricing',
		content: 'Commercial terms are fixed: {{pricing_summary}}.',
	},
	{
		id: 'article-5',
		title: 'Article 5 - Payment Terms',
		content: 'Payment frequency requested by client: [[payment_frequency]].',
	},
	{
		id: 'article-6',
		title: 'Article 6 - Data and Confidentiality',
		content: '{{legal_clauses_summary}}',
	},
	{
		id: 'article-7',
		title: 'Article 7 - Liability',
		content: '{{liability_clause}}',
	},
	{
		id: 'article-8',
		title: 'Article 8 - Term and Termination',
		content: 'Client operational notes (if any): [[client_notes]].',
	},
	{
		id: 'article-9',
		title: 'Article 9 - Governing Law',
		content: '{{jurisdiction_clause}}',
	},
	{
		id: 'article-10',
		title: 'Article 10 - Execution',
		content: 'Executed by [[signatory_name]] on behalf of [[company_name]].',
	},
];

export default function ClientAgreementPage() {
	const navigate = useNavigate();
	const { agreementId } = useParams<{ agreementId: string }>();
	const [agreementData, setAgreementData] = useState<ClientAgreementData>(DEFAULT_AGREEMENT_DATA);

	const sections = useMemo(() => ARTICLE_SECTIONS, []);

	const handleEditableChange = <K extends keyof EditableAgreementFields>(field: K, value: EditableAgreementFields[K]) => {
		setAgreementData((prev) => ({
			...prev,
			[field]: value,
		}));
	};

	const handleAddonToggle = (addonId: string, checked: boolean) => {
		setAgreementData((prev) => ({
			...prev,
			addon_selections: {
				...prev.addon_selections,
				[addonId]: checked,
			},
		}));
	};

	return (
		<div className="p-6 space-y-6">
			<div className="flex items-center justify-between gap-4">
				<div>
					<button type="button" onClick={() => navigate('/admin/operations/agreements')} className="text-sm font-medium text-blue-600 hover:text-blue-700">
						Back to agreements
					</button>
					<h1 className="mt-2 text-2xl font-bold text-gray-900">Client Agreement</h1>
					<p className="mt-1 text-gray-600">Agreement Id: {agreementId || 'Draft'}</p>
				</div>
			</div>

			<div className="rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-800">
				<span className="font-semibold">Template Tokens:</span> {'{{}}'} read-only, {'[[]]'} editable
			</div>

			<div className="rounded-2xl border border-gray-200 bg-gray-50 p-3">
				<div className="max-h-[72vh] space-y-6 overflow-y-auto rounded-xl bg-white p-4">
					<AgreementHeader agreementId={agreementId} agreement={agreementData} />
					<AgreementParties agreement={agreementData} onEditableChange={handleEditableChange} />
					{sections.map((section) => (
						<ArticleSection
							key={section.id}
							title={section.title}
							content={section.content}
							agreement={agreementData}
							onEditableChange={handleEditableChange}
						/>
					))}
					<PricingTable agreement={agreementData} />
					<AddonTable agreement={agreementData} onAddonToggle={handleAddonToggle} />
					<SignatureSection agreement={agreementData} onEditableChange={handleEditableChange} />
				</div>
			</div>
		</div>
	);
}
