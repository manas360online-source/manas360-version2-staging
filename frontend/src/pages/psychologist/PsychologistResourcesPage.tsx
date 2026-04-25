import { useMemo, useState } from 'react';
import TherapistCard from '../../components/therapist/dashboard/TherapistCard';
import TherapistPageShell from '../../components/therapist/dashboard/TherapistPageShell';
import { TherapistEmptyState } from '../../components/therapist/dashboard/TherapistDataState';

const resources = ['DSM-5 Quick Reference', 'Clinical Interview Checklist', 'Patient Psychoeducation Handouts', 'Crisis Escalation SOP'];

export default function PsychologistResourcesPage() {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('');

  const items = useMemo(() => {
    return resources
      .map((name) => ({
        name,
        category: name.toLowerCase().includes('crisis') ? 'safety' : name.toLowerCase().includes('patient') ? 'patient' : 'clinical',
      }))
      .filter((item) => (!query || item.name.toLowerCase().includes(query.toLowerCase())) && (!category || item.category === category));
  }, [query, category]);

  return (
    <TherapistPageShell title="Resources" subtitle="Clinical guidelines, references, and patient education materials.">
      <TherapistCard className="p-4">
        <div className="mb-3 grid grid-cols-1 gap-2 md:grid-cols-[1fr_180px]">
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search resources..." className="rounded-lg border border-ink-100 px-3 py-2 text-sm" />
          <select value={category} onChange={(e) => setCategory(e.target.value)} className="rounded-lg border border-ink-100 px-3 py-2 text-sm">
            <option value="">All categories</option>
            <option value="clinical">Clinical</option>
            <option value="patient">Patient</option>
            <option value="safety">Safety</option>
          </select>
        </div>
        {items.length === 0 ? <TherapistEmptyState title="No resources found" description="Try adjusting your filters." /> : null}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          {items.map((r) => (
            <div key={r.name} className="rounded-lg border border-ink-100 px-3 py-2 text-sm text-ink-700">{r.name}</div>
          ))}
        </div>
      </TherapistCard>
    </TherapistPageShell>
  );
}
