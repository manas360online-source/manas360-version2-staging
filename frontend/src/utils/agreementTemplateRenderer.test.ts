import { describe, expect, it } from 'vitest';
import { parseAgreementTemplateTokens, renderAgreementTemplate } from './agreementTemplateRenderer';

describe('renderAgreementTemplate', () => {
	it('replaces read-only variables from double curly braces', () => {
		const template = 'Company: {{company_name}}';
		const result = renderAgreementTemplate(template, { company_name: 'MANAS360 Pvt Ltd' });

		expect(result).toBe('Company: MANAS360 Pvt Ltd');
	});

	it('replaces editable variables from double square brackets with inputs', () => {
		const template = 'Client Name: [[company_name]]';
		const result = renderAgreementTemplate(template, { company_name: 'Acme Corp' });

		expect(result).toContain('<input');
		expect(result).toContain('name="company_name"');
		expect(result).toContain('value="Acme Corp"');
		expect(result).toContain('data-template-variable="company_name"');
	});

	it('keeps separation between read-only and editable tokens', () => {
		const template = 'Read-only {{company_name}} / Editable [[company_name]]';
		const result = renderAgreementTemplate(template, { company_name: 'Acme Corp' });

		expect(result).toContain('Read-only Acme Corp');
		expect(result).toContain('<input');
	});

	it('supports nested value paths and fallback for missing read-only values', () => {
		const template = 'Legal: {{company.legal_name}} Missing: {{company.pan}}';
		const result = renderAgreementTemplate(template, {
			company: {
				legal_name: 'Acme Legal',
			},
		}, {
			emptyReadOnlyFallback: 'N/A',
		});

		expect(result).toBe('Legal: Acme Legal Missing: N/A');
	});

	it('supports custom editable input renderer', () => {
		const template = '[[company_name]]';
		const result = renderAgreementTemplate(template, { company_name: 'Acme Corp' }, {
			renderEditableInput: (variable, value) => `<textarea data-key="${variable}">${value}</textarea>`,
		});

		expect(result).toBe('<textarea data-key="company_name">Acme Corp</textarea>');
	});

	it('parses tokens with proper separation for read-only and editable', () => {
		const tokens = parseAgreementTemplateTokens('Hi {{company_name}} and [[signatory_name]]!');

		expect(tokens).toEqual([
			{ type: 'text', value: 'Hi ' },
			{ type: 'readonly', variable: 'company_name' },
			{ type: 'text', value: ' and ' },
			{ type: 'editable', variable: 'signatory_name' },
			{ type: 'text', value: '!' },
		]);
	});
});
