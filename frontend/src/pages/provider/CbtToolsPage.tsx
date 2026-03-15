import { useMemo, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';
import { Brain, Search, UserRoundCheck } from 'lucide-react';
import { fetchCbtAssignmentTemplates, quickAssignCbtTemplate } from '../../api/provider';
import { useProviderPatients } from '../../hooks/useProviderPatients';

export default function CbtToolsPage() {
  const [search, setSearch] = useState('');
  const [selectedPatientId, setSelectedPatientId] = useState('');
  const [selectedTemplateType, setSelectedTemplateType] = useState('');

  const templatesQuery = useQuery({
    queryKey: ['provider-cbt-templates'],
    queryFn: fetchCbtAssignmentTemplates,
    staleTime: 5 * 60 * 1000,
  });

  const patientsQuery = useProviderPatients();

  const filteredPatients = useMemo(() => {
    const rows = patientsQuery.data || [];
    const term = search.trim().toLowerCase();
    if (!term) return rows;
    return rows.filter((patient) => {
      return (
        patient.name.toLowerCase().includes(term)
        || String(patient.email || '').toLowerCase().includes(term)
        || patient.primaryConcern.toLowerCase().includes(term)
      );
    });
  }, [patientsQuery.data, search]);

  const assignMutation = useMutation({
    mutationFn: async () => {
      if (!selectedPatientId || !selectedTemplateType) {
        throw new Error('Please select both a patient and a template.');
      }
      return quickAssignCbtTemplate(selectedPatientId, selectedTemplateType);
    },
    onSuccess: (result) => {
      toast.success(`Assigned ${result.title} successfully.`);
    },
    onError: (error: any) => {
      toast.error(String(error?.response?.data?.message || error?.message || 'Failed to assign CBT template'));
    },
  });

  return (
    <div className="mx-auto max-w-6xl space-y-6 pb-8">
      <section className="rounded-3xl border border-[#E5E5E5] bg-[linear-gradient(135deg,#F4FBFF_0%,#EEF8F4_100%)] p-6 shadow-sm">
        <div className="inline-flex items-center gap-2 rounded-full bg-white/80 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-charcoal/55">
          <Brain className="h-4 w-4 text-calm-sage" />
          Provider Workspace
        </div>
        <h1 className="mt-3 text-3xl font-semibold text-charcoal">CBT Tools</h1>
        <p className="mt-2 max-w-2xl text-sm text-charcoal/70">
          Assign structured CBT interactive tasks to patients. Patients can save progress and submit final responses directly to your review queue.
        </p>
      </section>

      <section className="grid gap-6 lg:grid-cols-[1.1fr_1.9fr]">
        <div className="rounded-2xl border border-[#E5E5E5] bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-charcoal">Choose Patient</h2>
          <label className="mt-4 flex items-center gap-2 rounded-xl border border-[#E5E5E5] bg-[#FAFAF8] px-3 py-2">
            <Search className="h-4 w-4 text-charcoal/40" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search name, email, concern"
              className="w-full border-0 bg-transparent text-sm text-charcoal outline-none"
            />
          </label>

          <div className="mt-4 max-h-[360px] space-y-2 overflow-y-auto pr-1">
            {(filteredPatients || []).map((patient) => {
              const active = patient.id === selectedPatientId;
              return (
                <button
                  key={patient.id}
                  type="button"
                  onClick={() => setSelectedPatientId(patient.id)}
                  className={`w-full rounded-xl border px-3 py-3 text-left transition ${
                    active ? 'border-calm-sage bg-calm-sage/10' : 'border-[#E5E5E5] hover:bg-[#FAFAF8]'
                  }`}
                >
                  <p className="text-sm font-semibold text-charcoal">{patient.name}</p>
                  <p className="text-xs text-charcoal/60">{patient.email || 'No email'}</p>
                  <p className="mt-1 text-xs text-charcoal/60">Concern: {patient.primaryConcern}</p>
                </button>
              );
            })}
          </div>

          {filteredPatients.length === 0 ? (
            <p className="mt-4 text-xs text-charcoal/55">No patients found for this search.</p>
          ) : null}
        </div>

        <div className="rounded-2xl border border-[#E5E5E5] bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-charcoal">Template Library</h2>
            <span className="text-xs font-semibold uppercase tracking-[0.12em] text-charcoal/50">
              {templatesQuery.isLoading ? 'Loading' : `${templatesQuery.data?.length || 0} templates`}
            </span>
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {(templatesQuery.data || []).map((template) => {
              const selected = template.templateType === selectedTemplateType;
              return (
                <button
                  key={template.templateType}
                  type="button"
                  onClick={() => setSelectedTemplateType(template.templateType)}
                  className={`rounded-2xl border p-4 text-left transition ${
                    selected ? 'border-calm-sage bg-calm-sage/10' : 'border-[#E5E5E5] hover:bg-[#FAFAF8]'
                  }`}
                >
                  <p className="text-base font-semibold text-charcoal">{template.title}</p>
                  <p className="mt-1 text-sm text-charcoal/65">{template.description}</p>
                  <p className="mt-3 text-xs font-semibold uppercase tracking-[0.12em] text-charcoal/50">
                    {template.stepCount} steps
                  </p>
                </button>
              );
            })}
          </div>

          <div className="mt-5 rounded-2xl border border-[#E5E5E5] bg-[#FAFAF8] p-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-charcoal">
              <UserRoundCheck className="h-4 w-4 text-calm-sage" />
              Assignment Summary
            </div>
            <p className="mt-2 text-sm text-charcoal/70">
              Patient: {selectedPatientId ? 'Selected' : 'Not selected'}
            </p>
            <p className="mt-1 text-sm text-charcoal/70">
              Template: {selectedTemplateType || 'Not selected'}
            </p>
            <button
              type="button"
              disabled={!selectedPatientId || !selectedTemplateType || assignMutation.isPending}
              onClick={() => {
                void assignMutation.mutateAsync();
              }}
              className="mt-4 inline-flex items-center justify-center rounded-full bg-calm-sage px-5 py-2 text-sm font-semibold text-white transition hover:bg-calm-sage/90 disabled:opacity-40"
            >
              {assignMutation.isPending ? 'Assigning...' : 'Assign to Patient'}
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
