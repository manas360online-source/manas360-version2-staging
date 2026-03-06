import { useEffect, useState } from 'react';
import { psychiatristApi, type PsychiatristAssessmentTemplateItem } from '../../api/psychiatrist.api';
import TherapistButton from '../../components/therapist/dashboard/TherapistButton';
import TherapistCard from '../../components/therapist/dashboard/TherapistCard';
import TherapistPageShell from '../../components/therapist/dashboard/TherapistPageShell';
import TherapistTable from '../../components/therapist/dashboard/TherapistTable';

export default function PsychiatristAssessmentTemplatesPage() {
  const [rows, setRows] = useState<PsychiatristAssessmentTemplateItem[]>([]);
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    void psychiatristApi.listAssessmentTemplates().then((res) => setRows(res.items || []));
  }, []);

  const addTemplate = () => {
    if (adding) return;
    setAdding(true);
    void psychiatristApi
      .createAssessmentTemplate({
        name: 'New Template',
        checklist: '',
        severityScale: '1-10',
        durationField: '',
        notes: '',
      })
      .then(() => psychiatristApi.listAssessmentTemplates())
      .then((res) => setRows(res.items || []))
      .finally(() => setAdding(false));
  };

  return (
    <TherapistPageShell
      title="Assessment Templates"
      subtitle="Create reusable psychiatric templates used during professional-mode patient assessments."
    >
      <TherapistCard>
        <div className="flex items-center justify-between border-b border-ink-100 px-4 py-3">
          <h3 className="font-display text-lg font-semibold text-ink-800">Template Library</h3>
          <TherapistButton onClick={addTemplate} disabled={adding}>{adding ? 'Adding...' : 'Add Template'}</TherapistButton>
        </div>
        <TherapistTable
          rows={rows}
          rowKey={(row) => row.id}
          emptyText="No templates yet. Add one to start your own library."
          columns={[
            { key: 'name', header: 'Template', render: (row) => row.name },
            { key: 'checklist', header: 'Symptoms Checklist', render: (row) => row.checklist },
            { key: 'severity', header: 'Severity Scale', render: (row) => row.severityScale },
            { key: 'duration', header: 'Duration', render: (row) => row.durationField },
            { key: 'notes', header: 'Clinical Notes', render: (row) => row.notes },
          ]}
        />
      </TherapistCard>
    </TherapistPageShell>
  );
}
