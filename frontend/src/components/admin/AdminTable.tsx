import { type ReactNode } from 'react';

type AdminTableColumn<T> = {
	key: string;
	head: string;
	render: (row: T) => ReactNode;
	className?: string;
	sortable?: boolean;
	sortKey?: string;
};

type AdminTableProps<T> = {
	columns: AdminTableColumn<T>[];
	rows: T[];
	rowKey: (row: T) => string;
	emptyText?: string;
	loading?: boolean;
	loadingText?: string;
	sortBy?: string;
	sortOrder?: 'asc' | 'desc';
	onSortChange?: (sortBy: string) => void;
};

export default function AdminTable<T>({
	columns,
	rows,
	rowKey,
	emptyText = 'No records found.',
	loading = false,
	loadingText = 'Loading records...',
	sortBy,
	sortOrder,
	onSortChange,
}: AdminTableProps<T>) {
	return (
		<div className="overflow-hidden rounded-xl border border-ink-100 bg-white">
			<div className="overflow-x-auto">
				<table className="min-w-full divide-y divide-ink-100">
					<thead className="bg-ink-50">
						<tr>
							{columns.map((column) => (
								<th key={column.key} className={`px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-ink-500 ${column.className || ''}`}>
									<button
										type="button"
										onClick={() => {
											if (!column.sortable || !column.sortKey || !onSortChange) return;
											onSortChange(column.sortKey);
										}}
										className={`inline-flex items-center gap-1 ${column.sortable ? 'hover:text-ink-700' : 'cursor-default'}`}
									>
										{column.head}
										{column.sortable && column.sortKey && sortBy === column.sortKey ? (
											<span className="text-[10px]">{sortOrder === 'asc' ? '▲' : '▼'}</span>
										) : null}
									</button>
								</th>
							))}
						</tr>
					</thead>
					<tbody className="divide-y divide-ink-100 bg-white">
						{loading ? (
							<tr>
								<td colSpan={columns.length} className="px-4 py-8 text-center text-sm text-ink-500">{loadingText}</td>
							</tr>
						) : rows.length === 0 ? (
							<tr>
								<td colSpan={columns.length} className="px-4 py-8 text-center text-sm text-ink-500">{emptyText}</td>
							</tr>
						) : (
							rows.map((row) => (
								<tr key={rowKey(row)}>
									{columns.map((column) => (
										<td key={column.key} className={`px-4 py-3 align-top ${column.className || ''}`}>
											{column.render(row)}
										</td>
									))}
								</tr>
							))
						)}
					</tbody>
				</table>
			</div>
		</div>
	);
}
