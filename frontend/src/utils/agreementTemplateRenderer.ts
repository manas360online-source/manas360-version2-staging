type TemplateValue = string | number | boolean | null | undefined;

export interface AgreementTemplateValues {
	[key: string]: TemplateValue | AgreementTemplateValues;
}

export type EditableInputRenderer = (variable: string, value: string) => string;

export type RenderAgreementTemplateOptions = {
	emptyReadOnlyFallback?: string;
	renderEditableInput?: EditableInputRenderer;
};

export type AgreementTemplateToken =
	| { type: 'text'; value: string }
	| { type: 'readonly'; variable: string }
	| { type: 'editable'; variable: string };

const READ_ONLY_PATTERN = /\{\{\s*([a-zA-Z0-9_.-]+)\s*\}\}/g;
const EDITABLE_PATTERN = /\[\[\s*([a-zA-Z0-9_.-]+)\s*\]\]/g;

const escapeHtml = (value: string): string => value
	.replace(/&/g, '&amp;')
	.replace(/</g, '&lt;')
	.replace(/>/g, '&gt;')
	.replace(/"/g, '&quot;')
	.replace(/'/g, '&#39;');

const getValueByPath = (values: AgreementTemplateValues, path: string): TemplateValue => {
	const segments = String(path || '').split('.').filter(Boolean);
	let current: unknown = values;

	for (const segment of segments) {
		if (current == null || typeof current !== 'object' || !(segment in (current as Record<string, unknown>))) {
			return undefined;
		}
		current = (current as Record<string, unknown>)[segment];
	}

	if (typeof current === 'object') {
		return undefined;
	}

	return current as TemplateValue;
};

const toText = (value: TemplateValue, fallback = ''): string => {
	if (value === null || value === undefined) {
		return fallback;
	}
	return String(value);
};

const defaultEditableInputRenderer: EditableInputRenderer = (variable, value) => {
	const safeName = escapeHtml(variable);
	const safeValue = escapeHtml(value);
	const placeholder = `Enter ${variable.replace(/_/g, ' ')}`;
	return `<input type="text" name="${safeName}" value="${safeValue}" placeholder="${escapeHtml(placeholder)}" data-template-variable="${safeName}" />`;
};

export const parseAgreementTemplateTokens = (template: string): AgreementTemplateToken[] => {
	const source = String(template || '');
	const tokenPattern = /(\{\{\s*[a-zA-Z0-9_.-]+\s*\}\}|\[\[\s*[a-zA-Z0-9_.-]+\s*\]\])/g;
	const tokens: AgreementTemplateToken[] = [];

	let lastIndex = 0;
	let match: RegExpExecArray | null;

	while ((match = tokenPattern.exec(source)) !== null) {
		const raw = match[0];
		const start = match.index;

		if (start > lastIndex) {
			tokens.push({ type: 'text', value: source.slice(lastIndex, start) });
		}

		if (raw.startsWith('{{')) {
			tokens.push({ type: 'readonly', variable: raw.replace(/^\{\{\s*|\s*\}\}$/g, '') });
		} else {
			tokens.push({ type: 'editable', variable: raw.replace(/^\[\[\s*|\s*\]\]$/g, '') });
		}

		lastIndex = start + raw.length;
	}

	if (lastIndex < source.length) {
		tokens.push({ type: 'text', value: source.slice(lastIndex) });
	}

	return tokens;
};

export const renderAgreementTemplate = (
	template: string,
	values: AgreementTemplateValues,
	options: RenderAgreementTemplateOptions = {},
): string => {
	const source = String(template || '');
	const readOnlyFallback = options.emptyReadOnlyFallback ?? '';
	const renderEditableInput = options.renderEditableInput ?? defaultEditableInputRenderer;

	const withReadOnlyResolved = source.replace(READ_ONLY_PATTERN, (_match, variableName: string) => {
		const rawValue = getValueByPath(values, variableName);
		return escapeHtml(toText(rawValue, readOnlyFallback));
	});

	return withReadOnlyResolved.replace(EDITABLE_PATTERN, (_match, variableName: string) => {
		const rawValue = getValueByPath(values, variableName);
		const editableValue = toText(rawValue, '');
		return renderEditableInput(variableName, editableValue);
	});
};
