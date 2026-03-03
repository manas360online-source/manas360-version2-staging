import type { ReactNode } from 'react';

type TherapistTableColumn<T> = {
  key: string;
  header: string;
  className?: string;
  render: (row: T) => ReactNode;
};

type TherapistTableProps<T> = {
  columns: Array<TherapistTableColumn<T>>;
  rows: T[];
  rowKey: (row: T, index: number) => string;
  emptyText?: string;
};

export default function TherapistTable<T>({
  columns,
  rows,
  rowKey,
  emptyText = 'No records found.',
}: TherapistTableProps<T>) {
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-left">
        <thead>
          <tr className="border-b border-ink-100 text-xs uppercase tracking-[0.08em] text-ink-500">
            {columns.map((column) => (
              <th key={column.key} className={`px-4 py-3 font-semibold ${column.className || ''}`}>
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length > 0 ? (
            rows.map((row, index) => (
              <tr key={rowKey(row, index)} className="border-b border-ink-100/60 text-sm text-ink-800 hover:bg-surface-bg">
                {columns.map((column) => (
                  <td key={column.key} className={`px-4 py-3 align-middle ${column.className || ''}`}>
                    {column.render(row)}
                  </td>
                ))}
              </tr>
            ))
          ) : (
            <tr>
              <td className="px-4 py-8 text-center text-sm text-ink-500" colSpan={columns.length}>
                {emptyText}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
