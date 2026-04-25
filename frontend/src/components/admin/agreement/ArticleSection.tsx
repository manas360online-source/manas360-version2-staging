import { parseAgreementTemplateTokens } from '../../../utils/agreementTemplateRenderer';
import type { ClientAgreementData, EditableAgreementFields } from './types';

type ArticleSectionProps = {
	title: string;
	content: string;
	agreement: ClientAgreementData;
	onEditableChange: <K extends keyof EditableAgreementFields>(field: K, value: EditableAgreementFields[K]) => void;
};

const toDisplayLabel = (variable: string): string => variable.replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase());

const getValueByPath = (values: Record<string, unknown>, variable: string): string => {
	const segments = String(variable || '').split('.').filter(Boolean);
	let current: unknown = values;
	for (const segment of segments) {
		if (current == null || typeof current !== 'object') return '';
		current = (current as Record<string, unknown>)[segment];
	}
	if (current === null || current === undefined || typeof current === 'object') return '';
	return String(current);
};

export default function ArticleSection({ title, content, agreement, onEditableChange }: ArticleSectionProps) {
	const tokens = parseAgreementTemplateTokens(content);

	return (
		<section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
			<h3 className="text-lg font-semibold text-gray-900">{title}</h3>
			<div className="mt-4 text-sm leading-7 text-gray-700 whitespace-pre-wrap">
				{tokens.map((token, index) => {
					if (token.type === 'text') {
						return <span key={`text-${index}`}>{token.value}</span>;
					}

					if (token.type === 'readonly') {
						const value = getValueByPath(agreement as Record<string, unknown>, token.variable) || '—';
						return (
							<span key={`readonly-${token.variable}-${index}`} className="rounded bg-slate-100 px-1.5 py-0.5 font-medium text-slate-700">
								{value}
							</span>
						);
					}

					const variableName = token.variable as keyof EditableAgreementFields;
					const currentValue = getValueByPath(agreement as Record<string, unknown>, token.variable);
					return (
						<input
							key={`editable-${token.variable}-${index}`}
							type="text"
							value={currentValue}
							onChange={(event) => onEditableChange(variableName, event.target.value)}
							placeholder={toDisplayLabel(token.variable)}
							className="mx-1 min-w-[200px] rounded-lg border border-blue-200 bg-blue-50 px-3 py-1.5 text-sm text-gray-900 focus:border-blue-500 focus:outline-none"
						/>
					);
				})}
			</div>
		</section>
	);
}
