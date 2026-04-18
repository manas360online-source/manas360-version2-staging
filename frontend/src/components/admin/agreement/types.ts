export type EditableAgreementFields = {
	company_name: string;
	company_address: string;
	company_industry: string;
	signatory_name: string;
	signatory_email: string;
	signatory_phone: string;
	workshop_selections: string;
	payment_frequency: string;
	client_notes: string;
};

export type AgreementPricingRow = {
	item: string;
	description: string;
	amount: string;
};

export type AgreementAddonRow = {
	id: string;
	name: string;
	description: string;
	price: string;
};

export type ClientAgreementData = EditableAgreementFields & {
	platform_name: string;
	agreement_number: string;
	effective_date: string;
	platform_address: string;
	pricing_summary: string;
	legal_clauses_summary: string;
	liability_clause: string;
	jurisdiction_clause: string;
	pricing_rows: AgreementPricingRow[];
	addon_rows: AgreementAddonRow[];
	addon_selections: Record<string, boolean>;
};
