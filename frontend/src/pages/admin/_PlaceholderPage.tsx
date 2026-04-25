export default function PlaceholderPage({ title }: { title: string }) {
	return (
		<div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
			<h1 className="text-2xl font-semibold text-slate-900">{title}</h1>
			<p className="mt-2 text-sm text-slate-600">This admin section is available for live data or workflow wiring.</p>
		</div>
	);
}
