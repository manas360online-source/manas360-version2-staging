type ChartOverviewPlaceholderProps = {
  title?: string;
  description?: string;
};

export default function ChartOverviewPlaceholder({
  title = 'Patient Chart Overview',
  description = 'This is a placeholder for the patient chart overview workspace.',
}: ChartOverviewPlaceholderProps) {
  return (
    <div style={{ fontFamily: 'DM Sans, sans-serif' }}>
      <h3 className="font-sans text-lg font-bold text-[#2D4128]">{title}</h3>
      <p className="mt-2 text-sm text-slate-600">{description}</p>
    </div>
  );
}
