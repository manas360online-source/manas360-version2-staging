import { Calendar, Clock3, FileText, Lock, Plus } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { useAuth } from '../../../../context/AuthContext';
import { useCreatePatientNote, usePatientNotes, useUpdatePatientNote } from '../../../../hooks/usePatientNotes';
import type { NoteData, NoteStatus } from '../../../../api/provider';

const statusBadgeClass = (status: NoteStatus) => {
  if (status === 'Signed') {
    return 'bg-[#E8EFE6] text-[#4A6741]';
  }
  return 'bg-amber-50 text-amber-700';
};

const sessionTypeOptions = ['CBT Follow-up', 'Behavioral Activation Review', 'Medication Check-in', 'Intake Review'];

const todayIsoDate = (): string => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const durationToMinutes = (value: string): string => {
  const parsed = Number.parseInt(String(value || '').replace(/[^0-9]/g, ''), 10);
  if (Number.isNaN(parsed) || parsed <= 0) return '50';
  return String(parsed);
};

export default function SessionNotes() {
  const { patientId } = useParams<{ patientId: string }>();
  const { user } = useAuth();

  const { data: notes = [], isLoading } = usePatientNotes(patientId);
  const createNoteMutation = useCreatePatientNote();
  const updateNoteMutation = useUpdatePatientNote();

  const providerName = useMemo(() => {
    const full = `${String(user?.firstName || '').trim()} ${String(user?.lastName || '').trim()}`.trim();
    return full || user?.email || 'Provider';
  }, [user?.email, user?.firstName, user?.lastName]);

  const [selectedNoteId, setSelectedNoteId] = useState<string>('');
  const [sessionDate, setSessionDate] = useState(todayIsoDate());
  const [sessionType, setSessionType] = useState(sessionTypeOptions[0]);
  const [duration, setDuration] = useState('50');
  const [subjective, setSubjective] = useState('');
  const [objective, setObjective] = useState('');
  const [assessment, setAssessment] = useState('');
  const [plan, setPlan] = useState('');

  const selectedNote: NoteData | null = useMemo(() => {
    if (!selectedNoteId) return null;
    return notes.find((note) => note.id === selectedNoteId) || null;
  }, [notes, selectedNoteId]);

  useEffect(() => {
    if (!notes.length) {
      setSelectedNoteId('');
      return;
    }
    if (!selectedNoteId) {
      setSelectedNoteId(notes[0].id);
    }
  }, [notes, selectedNoteId]);

  useEffect(() => {
    if (!selectedNote) {
      return;
    }
    setSessionDate(selectedNote.sessionDate.slice(0, 10));
    setSessionType(selectedNote.sessionType || sessionTypeOptions[0]);
    setDuration(durationToMinutes(selectedNote.duration));
    setSubjective(selectedNote.subjective || '');
    setObjective(selectedNote.objective || '');
    setAssessment(selectedNote.assessment || '');
    setPlan(selectedNote.plan || '');
  }, [selectedNote]);

  const resetEditorForNew = () => {
    setSelectedNoteId('');
    setSessionDate(todayIsoDate());
    setSessionType(sessionTypeOptions[0]);
    setDuration('50');
    setSubjective('');
    setObjective('');
    setAssessment('');
    setPlan('');
  };

  const saveNote = async (status: NoteStatus) => {
    if (!patientId) return;

    const noteData = {
      subjective,
      objective,
      assessment,
      plan,
      sessionDate,
      sessionType,
      duration,
      status,
    };

    const isEditingDraft = Boolean(selectedNote && selectedNote.status === 'Draft');

    if (isEditingDraft && selectedNote) {
      const result = await updateNoteMutation.mutateAsync({
        patientId,
        noteId: selectedNote.id,
        noteData,
      });
      setSelectedNoteId(result.id);
      if (status === 'Signed') {
        toast.success('Note signed and locked successfully 🔒');
      }
      return;
    }

    const result = await createNoteMutation.mutateAsync({
      patientId,
      noteData,
    });

    setSelectedNoteId(result.id);
    if (status === 'Signed') {
      toast.success('Note signed and locked successfully 🔒');
    }
  };

  const isSigned = selectedNote?.status === 'Signed';
  const isSaving = createNoteMutation.isPending || updateNoteMutation.isPending;

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-3" style={{ fontFamily: 'DM Sans, sans-serif' }}>
      <aside className="lg:col-span-1">
        <div className="rounded-xl border border-[#E5E5E5] bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between gap-3 border-b border-[#E5E5E5] pb-4">
            <div>
              <p className="font-display text-lg font-semibold text-[#2D4128]">Session Notes</p>
              <p className="text-sm text-slate-500">Patient ID {patientId || '123'}</p>
            </div>
            <button
              type="button"
              onClick={resetEditorForNew}
              className="inline-flex items-center gap-2 rounded-lg bg-[#4A6741] px-3 py-2 text-sm font-semibold text-white transition hover:bg-[#2D4128]"
            >
              <Plus className="h-4 w-4" />
              New Note +
            </button>
          </div>

          <div className="mt-4 max-h-[640px] space-y-3 overflow-y-auto pr-1">
            {isLoading && Array.from({ length: 5 }).map((_, idx) => (
              <div key={`note-skeleton-${idx}`} className="animate-pulse rounded-xl border border-[#E5E5E5] px-4 py-4">
                <div className="h-3 w-28 rounded bg-slate-200" />
                <div className="mt-2 h-3 w-36 rounded bg-slate-100" />
                <div className="mt-3 h-3 w-32 rounded bg-slate-100" />
              </div>
            ))}

            {!isLoading && notes.map((note) => {
              const isActive = note.id === selectedNoteId;

              return (
                <button
                  key={note.id}
                  type="button"
                  onClick={() => setSelectedNoteId(note.id)}
                  className={`w-full rounded-xl border px-4 py-4 text-left transition-all ${
                    isActive
                      ? 'border-[#E5E5E5] border-l-4 border-l-[#4A6741] bg-[#E8EFE6]'
                      : 'border-[#E5E5E5] bg-white hover:bg-[#FAFAF8]'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-display text-sm font-semibold text-[#2D4128]">{note.date || 'Unscheduled'}</p>
                      <p className="mt-1 text-sm text-slate-600">{note.providerName}</p>
                    </div>
                    <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${statusBadgeClass(note.status)}`}>
                      {note.status}
                    </span>
                  </div>
                  <div className="mt-3 flex items-center gap-2 text-sm text-slate-500">
                    <FileText className="h-4 w-4" />
                    {note.sessionType}
                  </div>
                </button>
              );
            })}

            {!isLoading && notes.length === 0 && (
              <div className="rounded-xl border border-[#E5E5E5] bg-[#FAFAF8] p-4 text-sm text-slate-600">
                No notes available yet. Start with a new note.
              </div>
            )}
          </div>
        </div>
      </aside>

      <section className="lg:col-span-2">
        <div className="rounded-xl border border-[#E5E5E5] bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-4 border-b border-[#E5E5E5] pb-5 xl:flex-row xl:items-end xl:justify-between">
            <div>
              <p className="font-display text-2xl font-semibold text-[#2D4128]">SOAP Note Editor</p>
              <p className="mt-1 text-sm text-slate-500">Reference prior notes while documenting the current session.</p>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <label className="block">
                <span className="mb-1 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  <Calendar className="h-4 w-4" />
                  Date
                </span>
                <input
                  type="date"
                  value={sessionDate}
                  onChange={(event) => setSessionDate(event.target.value)}
                  className="w-full rounded-lg border border-[#E5E5E5] bg-white px-3 py-2 text-sm text-[#2D4128] outline-none focus:border-[#4A6741] focus:bg-[#FAFAF8] focus:ring-2 focus:ring-[#4A6741]/10"
                />
              </label>

              <label className="block">
                <span className="mb-1 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  <FileText className="h-4 w-4" />
                  Session Type
                </span>
                <select
                  value={sessionType}
                  onChange={(event) => setSessionType(event.target.value)}
                  className="w-full rounded-lg border border-[#E5E5E5] bg-white px-3 py-2 text-sm text-[#2D4128] outline-none focus:border-[#4A6741] focus:bg-[#FAFAF8] focus:ring-2 focus:ring-[#4A6741]/10"
                >
                  {sessionTypeOptions.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block">
                <span className="mb-1 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  <Clock3 className="h-4 w-4" />
                  Duration
                </span>
                <input
                  type="text"
                  value={duration}
                  onChange={(event) => setDuration(durationToMinutes(event.target.value))}
                  className="w-full rounded-lg border border-[#E5E5E5] bg-white px-3 py-2 text-sm text-[#2D4128] outline-none focus:border-[#4A6741] focus:bg-[#FAFAF8] focus:ring-2 focus:ring-[#4A6741]/10"
                />
              </label>
            </div>
          </div>

          <div className="mt-5 space-y-5">
            <SoapTextarea
              label="Subjective"
              placeholder="Patient's self-reported symptoms, feelings, and experiences..."
              value={subjective}
              onChange={setSubjective}
              disabled={isSigned}
            />
            <SoapTextarea
              label="Objective"
              placeholder="Provider's observations, MSE, PHQ-9 scores..."
              value={objective}
              onChange={setObjective}
              disabled={isSigned}
            />
            <SoapTextarea
              label="Assessment"
              placeholder="Clinical synthesis, diagnosis progress, risk evaluation..."
              value={assessment}
              onChange={setAssessment}
              disabled={isSigned}
            />
            <SoapTextarea
              label="Plan"
              placeholder="Next steps, homework assigned, medication changes..."
              value={plan}
              onChange={setPlan}
              disabled={isSigned}
            />
          </div>

          <div className="mt-6 flex flex-col-reverse gap-3 border-t border-[#E5E5E5] pt-5 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={() => void saveNote('Draft')}
              disabled={isSaving || isSigned}
              className="inline-flex items-center justify-center rounded-lg border border-[#E5E5E5] bg-white px-4 py-2.5 text-sm font-semibold text-[#2D4128] transition hover:bg-[#FAFAF8] disabled:cursor-not-allowed disabled:opacity-60"
            >
              Save Draft
            </button>
            <button
              type="button"
              onClick={() => void saveNote('Signed')}
              disabled={isSaving || isSigned}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#4A6741] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#2D4128] disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Lock className="h-4 w-4" />
              Sign & Lock Note
            </button>
          </div>

          {(createNoteMutation.isError || updateNoteMutation.isError) && (
            <p className="mt-3 text-sm text-red-600">We could not save this note. Please try again.</p>
          )}
          {!createNoteMutation.isError && selectedNote && isSigned && (
            <p className="mt-3 text-sm text-[#4A6741]">This signed note is read-only for clinical compliance.</p>
          )}
          {!selectedNote && (
            <p className="mt-3 text-sm text-slate-500">Creating a new note as {providerName}.</p>
          )}
        </div>
      </section>
    </div>
  );
}

type SoapTextareaProps = {
  label: string;
  placeholder: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
};

function SoapTextarea({ label, placeholder, value, onChange, disabled = false }: SoapTextareaProps) {
  return (
    <label className="block">
      <span className="font-display text-base font-semibold text-[#2D4128]">{label}</span>
      <textarea
        rows={5}
        placeholder={placeholder}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        disabled={disabled}
        className="mt-2 w-full rounded-lg border border-[#E5E5E5] bg-white px-4 py-3 text-sm text-[#2D4128] outline-none transition focus:border-[#4A6741] focus:bg-[#FAFAF8] focus:ring-2 focus:ring-[#4A6741]/10 disabled:cursor-not-allowed disabled:bg-[#FAFAF8] disabled:text-slate-500"
      />
    </label>
  );
}
