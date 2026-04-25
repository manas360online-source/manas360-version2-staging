import { useEffect, useState, type ReactNode } from 'react';
import { psychiatristApi } from '../../api/psychiatrist.api';
import { useProviderDashboardContext } from '../../context/ProviderDashboardContext';
import TherapistButton from '../../components/therapist/dashboard/TherapistButton';
import TherapistCard from '../../components/therapist/dashboard/TherapistCard';
import TherapistPageShell from '../../components/therapist/dashboard/TherapistPageShell';

const AUTOSAVE_MS = 2 * 60 * 1000;

const SYMPTOMS = [
  { key: 'lowMood', label: 'Low Mood' },
  { key: 'anhedonia', label: 'Anhedonia' },
  { key: 'sleepIssues', label: 'Sleep Issues' },
  { key: 'appetiteChange', label: 'Appetite Change' },
  { key: 'energyLevel', label: 'Energy Level' },
  { key: 'concentration', label: 'Concentration' },
  { key: 'suicidalIdeation', label: 'Suicidal Ideation' },
] as const;

type SymptomKey = (typeof SYMPTOMS)[number]['key'];
type SymptomState = Record<SymptomKey, number>;

const defaultSymptoms = (): SymptomState => ({
  lowMood: 7,
  anhedonia: 6,
  sleepIssues: 6,
  appetiteChange: 5,
  energyLevel: 7,
  concentration: 6,
  suicidalIdeation: 1,
});

const IMPRESSIONS = [
  'Major Depressive Disorder',
  'Generalized Anxiety Disorder',
  'Bipolar Disorder',
  'PTSD',
  'OCD',
  'Adjustment Disorder',
  'Other',
];

const SEVERITIES = ['Mild', 'Moderate', 'Moderately Severe', 'Severe'];
const inputClassName =
  'w-full rounded-lg border border-ink-100 bg-white px-3 py-2 text-sm text-ink-800 focus:border-sage-300 focus:outline-none';

export default function PsychiatristAssessmentsPage() {
  const { selectedPatientId } = useProviderDashboardContext();
  const [items, setItems] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);
  const [autosaveAt, setAutosaveAt] = useState<string>('');

  const [chiefComplaint, setChiefComplaint] = useState('Persistent low mood and lack of motivation');
  const [symptoms, setSymptoms] = useState<SymptomState>(defaultSymptoms);
  const [durationWeeks, setDurationWeeks] = useState<number>(6);

  const [chronicConditions, setChronicConditions] = useState('');
  const [currentMedications, setCurrentMedications] = useState('');
  const [allergies, setAllergies] = useState('');
  const [substanceUse, setSubstanceUse] = useState('');
  const [familyPsychHistory, setFamilyPsychHistory] = useState('');

  const [cbc, setCbc] = useState('');
  const [tsh, setTsh] = useState('');
  const [vitaminD, setVitaminD] = useState('');
  const [vitaminB12, setVitaminB12] = useState('');

  const [clinicalImpression, setClinicalImpression] = useState('Major Depressive Disorder');
  const [severity, setSeverity] = useState('Moderate');

  const load = async () => {
    const res = await psychiatristApi.listAssessments(selectedPatientId || undefined);
    setItems(res.items || []);
  };

  const buildDraftPayload = () => ({
      chiefComplaint,
      symptoms,
      durationWeeks,
      chronicConditions,
      currentMedications,
      allergies,
      substanceUse,
      familyPsychHistory,
      cbc,
      tsh,
      vitaminD,
      vitaminB12,
      clinicalImpression,
      severity,
    });

  const applyDraftPayload = (parsed: any) => {
    setChiefComplaint(String(parsed?.chiefComplaint || chiefComplaint));
    setSymptoms({ ...defaultSymptoms(), ...(parsed?.symptoms || {}) });
    setDurationWeeks(Number(parsed?.durationWeeks || 6));
    setChronicConditions(String(parsed?.chronicConditions || ''));
    setCurrentMedications(String(parsed?.currentMedications || ''));
    setAllergies(String(parsed?.allergies || ''));
    setSubstanceUse(String(parsed?.substanceUse || ''));
    setFamilyPsychHistory(String(parsed?.familyPsychHistory || ''));
    setCbc(String(parsed?.cbc || ''));
    setTsh(String(parsed?.tsh || ''));
    setVitaminD(String(parsed?.vitaminD || ''));
    setVitaminB12(String(parsed?.vitaminB12 || ''));
    setClinicalImpression(String(parsed?.clinicalImpression || 'Major Depressive Disorder'));
    setSeverity(String(parsed?.severity || 'Moderate'));
  };

  const saveDraft = async () => {
    if (!selectedPatientId) return;
    await psychiatristApi.saveAssessmentDraft(selectedPatientId, buildDraftPayload());
    setAutosaveAt(new Date().toLocaleTimeString());
  };

  const restoreDraft = async () => {
    if (!selectedPatientId) return;
    try {
      const draft = await psychiatristApi.getAssessmentDraft(selectedPatientId);
      if (draft.payload) {
        applyDraftPayload(draft.payload);
        if (draft.updatedAt) {
          setAutosaveAt(new Date(draft.updatedAt).toLocaleTimeString());
        }
      }
    } catch {
      // Ignore draft restore failures.
    }
  };

  useEffect(() => {
    void load();
  }, [selectedPatientId]);

  useEffect(() => {
    if (!selectedPatientId) return;
    void restoreDraft();
  }, [selectedPatientId]);

  useEffect(() => {
    if (!selectedPatientId) return;

    const id = window.setInterval(() => {
      void saveDraft();
    }, AUTOSAVE_MS);

    return () => window.clearInterval(id);
  }, [
    selectedPatientId,
    chiefComplaint,
    symptoms,
    durationWeeks,
    chronicConditions,
    currentMedications,
    allergies,
    substanceUse,
    familyPsychHistory,
    cbc,
    tsh,
    vitaminD,
    vitaminB12,
    clinicalImpression,
    severity,
  ]);

  const createAssessment = async () => {
    if (!selectedPatientId) return;
    setSaving(true);
    try {
      await saveDraft();
      await psychiatristApi.createAssessment({
        patientId: selectedPatientId,
        chiefComplaint,
        symptoms: SYMPTOMS.map((item) => ({ name: item.label, severity: Number(symptoms[item.key]) })),
        durationWeeks,
        medicalHistory: {
          chronicConditions,
          currentMedications,
          allergies,
          substanceUse,
          familyPsychiatricHistory: familyPsychHistory,
        },
        labResults: {
          cbc,
          tsh,
          vitaminD,
          vitaminB12,
        },
        clinicalImpression,
        severity,
      });
      await load();
      await psychiatristApi.clearAssessmentDraft(selectedPatientId);
      setAutosaveAt('');
    } finally {
      setSaving(false);
    }
  };

  return (
    <TherapistPageShell
      title="Psychiatric Assessment"
      subtitle="Structured clinical assessment with symptom severity, medical history, and lab context."
    >
      <section className="grid gap-4 xl:grid-cols-[2fr_1fr]">
        <TherapistCard>
          <div className="border-b border-ink-100 px-4 py-3">
            <h3 className="font-display text-lg font-semibold text-ink-800">New Assessment</h3>
            <p className="mt-1 text-sm text-ink-500">Auto-save every 2 minutes{autosaveAt ? ` | last saved ${autosaveAt}` : ''}</p>
          </div>

          <div className="space-y-4 px-4 py-4">
            <Field label="Chief Complaint">
              <textarea
                className="min-h-[80px] w-full rounded-lg border border-ink-100 bg-white px-3 py-2 text-sm text-ink-800 focus:border-sage-300 focus:outline-none"
                value={chiefComplaint}
                onChange={(event) => setChiefComplaint(event.target.value)}
              />
            </Field>

            <div>
              <p className="mb-2 text-sm font-semibold text-ink-700">Symptoms Checklist (1-10)</p>
              <div className="grid gap-3 md:grid-cols-2">
                {SYMPTOMS.map((item) => (
                  <Field key={item.key} label={item.label}>
                    <input
                      type="number"
                      min={1}
                      max={10}
                      value={symptoms[item.key]}
                      onChange={(event) =>
                        setSymptoms((prev) => ({
                          ...prev,
                          [item.key]: Math.max(1, Math.min(10, Number(event.target.value || 1))),
                        }))
                      }
                      className="w-full rounded-lg border border-ink-100 bg-white px-3 py-2 text-sm text-ink-800 focus:border-sage-300 focus:outline-none"
                    />
                  </Field>
                ))}
              </div>
            </div>

            <Field label="Duration (weeks)">
              <input
                type="number"
                min={1}
                value={durationWeeks}
                onChange={(event) => setDurationWeeks(Math.max(1, Number(event.target.value || 1)))}
                className="w-full rounded-lg border border-ink-100 bg-white px-3 py-2 text-sm text-ink-800 focus:border-sage-300 focus:outline-none"
              />
            </Field>

            <div>
              <p className="mb-2 text-sm font-semibold text-ink-700">Medical History</p>
              <div className="grid gap-3 md:grid-cols-2">
                <Field label="Chronic Conditions"><input value={chronicConditions} onChange={(e) => setChronicConditions(e.target.value)} className={inputClassName} /></Field>
                <Field label="Current Medications"><input value={currentMedications} onChange={(e) => setCurrentMedications(e.target.value)} className={inputClassName} /></Field>
                <Field label="Allergies"><input value={allergies} onChange={(e) => setAllergies(e.target.value)} className={inputClassName} /></Field>
                <Field label="Substance Use"><input value={substanceUse} onChange={(e) => setSubstanceUse(e.target.value)} className={inputClassName} /></Field>
                <Field label="Family Psychiatric History"><input value={familyPsychHistory} onChange={(e) => setFamilyPsychHistory(e.target.value)} className={inputClassName} /></Field>
              </div>
            </div>

            <div>
              <p className="mb-2 text-sm font-semibold text-ink-700">Lab Results (Optional)</p>
              <div className="grid gap-3 md:grid-cols-2">
                <Field label="CBC"><input value={cbc} onChange={(e) => setCbc(e.target.value)} className={inputClassName} /></Field>
                <Field label="TSH"><input value={tsh} onChange={(e) => setTsh(e.target.value)} className={inputClassName} /></Field>
                <Field label="Vitamin D"><input value={vitaminD} onChange={(e) => setVitaminD(e.target.value)} className={inputClassName} /></Field>
                <Field label="Vitamin B12"><input value={vitaminB12} onChange={(e) => setVitaminB12(e.target.value)} className={inputClassName} /></Field>
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <Field label="Clinical Impression">
                <select value={clinicalImpression} onChange={(e) => setClinicalImpression(e.target.value)} className={inputClassName}>
                  {IMPRESSIONS.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
              </Field>

              <Field label="Severity">
                <select value={severity} onChange={(e) => setSeverity(e.target.value)} className={inputClassName}>
                  {SEVERITIES.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
              </Field>
            </div>

            <TherapistButton disabled={!selectedPatientId || saving} onClick={() => void createAssessment()}>
              {saving ? 'Saving...' : 'Create Assessment'}
            </TherapistButton>
            {!selectedPatientId ? <p className="text-sm text-ink-500">Select a patient from the header first.</p> : null}
          </div>
        </TherapistCard>

        <TherapistCard>
          <div className="border-b border-ink-100 px-4 py-3">
            <h3 className="font-display text-lg font-semibold text-ink-800">Assessment History</h3>
          </div>
          <ul className="space-y-2 px-4 py-4 text-sm">
            {items.map((item) => (
              <li key={item.id} className="rounded-lg border border-ink-100 p-3 text-ink-700">
                <div className="font-semibold text-ink-800">{item.clinical_impression || 'No impression'}</div>
                <div className="text-ink-500">Severity: {item.severity || '-'} | Complaint: {item.chief_complaint}</div>
              </li>
            ))}
            {items.length === 0 ? <li className="text-ink-500">No assessments yet.</li> : null}
          </ul>
        </TherapistCard>
      </section>
    </TherapistPageShell>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block text-sm text-ink-600">
      {label}
      <div className="mt-1">{children}</div>
    </label>
  );
}
