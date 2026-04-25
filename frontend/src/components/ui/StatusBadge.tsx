import Badge from './Badge';

export type StatusBadgeValue = 'draft' | 'sent' | 'client_reviewing' | 'signed_uploaded' | 'active' | string;

type StatusBadgeProps = {
	status: StatusBadgeValue;
	className?: string;
	label?: string;
};

const statusVariantMap: Record<string, 'secondary' | 'info' | 'warning' | 'soft' | 'success'> = {
	draft: 'secondary',
	sent: 'info',
	client_reviewing: 'warning',
	signed_uploaded: 'soft',
	active: 'success',
};

const formatStatusLabel = (status: string): string =>
	String(status || '')
		.replace(/_/g, ' ')
		.replace(/\b\w/g, (char) => char.toUpperCase())
		.trim();

export default function StatusBadge({ status, label, className = '' }: StatusBadgeProps) {
	const normalizedStatus = String(status || '').trim().toLowerCase();
	const variant = statusVariantMap[normalizedStatus] ?? 'secondary';
	const resolvedLabel = label || formatStatusLabel(normalizedStatus || 'draft');

	return (
		<Badge variant={variant} className={className}>
			{resolvedLabel}
		</Badge>
	);
}