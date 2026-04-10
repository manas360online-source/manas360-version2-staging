import { type ReactNode } from 'react';

type AdminPageLayoutProps = {
	title: string;
	description?: string;
	actions?: ReactNode;
	children: ReactNode;
};

export default function AdminPageLayout({ title, description, actions, children }: AdminPageLayoutProps) {
	return (
		<div className="space-y-4">
			<div className="rounded-xl border border-ink-100 bg-white p-5">
				<div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
					<div>
						<h2 className="font-display text-xl font-bold text-ink-800">{title}</h2>
						{description ? <p className="mt-1 text-sm text-ink-600">{description}</p> : null}
					</div>
					{actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
				</div>
			</div>
			{children}
		</div>
	);
}
