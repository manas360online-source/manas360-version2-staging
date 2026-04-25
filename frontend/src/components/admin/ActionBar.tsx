import { type ReactNode } from 'react';

type ActionBarProps = {
	children: ReactNode;
};

export default function ActionBar({ children }: ActionBarProps) {
	return (
		<div className="rounded-xl border border-ink-100 bg-white p-3">
			<div className="flex flex-wrap items-center gap-2">{children}</div>
		</div>
	);
}
