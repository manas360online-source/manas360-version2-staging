import { AlertCircle, FileText, Send, TrendingDown } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { useMutation } from '@tanstack/react-query';
import { type AssessmentData } from '../../../../api/provider';
import { assignPatientItem } from '../../../../api/provider';
import { usePatientAssessments } from '../../../../hooks/usePatientAssessments';
import { CLINICAL_ASSESSMENT_TEMPLATE_KEYS } from '../../../../utils/clinicalAssessments';

const formatAssessmentDate = (value: string): string => {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: '2-digit',
    year: 'numeric',
  }).format(new Date(value));
};

const severityClass = (severity: string) => {
  if (severity === 'Severe' || severity === 'Moderately Severe') return 'bg-red-50 text-red-600';
  if (severity === 'Moderate') return 'bg-amber-50 text-amber-700';
  if (severity === 'Mild') return 'bg-[#E8EFE6] text-[#4A6741]';
  if (severity === 'Minimal' || severity === 'None') return 'bg-slate-100 text-slate-700';
  return 'bg-[#E8EFE6] text-[#4A6741]';
};

const getAssessmentTitle = (assessment: AssessmentData): string => (
  assessment.type === 'PHQ-9' ? 'PHQ-9 Depression' : 'GAD-7 Anxiety'
);

const getAssessmentFullName = (assessment: AssessmentData): string => (
  assessment.type === 'PHQ-9'
    ? 'PHQ-9 Patient Health Questionnaire'
    : 'GAD-7 Generalized Anxiety Assessment'
);

const getMaxScore = (type: AssessmentData['type']): number => (type === 'PHQ-9' ? 27 : 21);

const getClinicalInsight = (assessment: AssessmentData, previousOfSameType?: AssessmentData): string => {
  const label = assessment.type === 'PHQ-9' ? 'depressive' : 'anxiety';
  const severityLine = `Score indicates ${assessment.severity.toLowerCase()} ${label} symptoms.`;

  if (!previousOfSameType) {
    return severityLine;
  }

  const delta = assessment.totalScore - previousOfSameType.totalScore;
  if (delta === 0) {
    return `${severityLine} No score change from previous ${assessment.type}.`;
  }
  if (delta < 0) {
    return `${severityLine} A ${Math.abs(delta)}-point decrease from previous ${assessment.type}.`;
  }
  return `${severityLine} A ${delta}-point increase from previous ${assessment.type}.`;
};

const getClinicalInsightSupplement = (assessment: AssessmentData): string => {
  const label = assessment.type === 'PHQ-9' ? 'depressive' : 'anxiety';
  if (assessment.severity === 'Severe' || assessment.severity === 'Moderately Severe') {
    return `Current responses indicate ${assessment.severity.toLowerCase()} ${label} symptom burden. Consider close follow-up and active safety planning as clinically indicated.`;
  }
  if (assessment.severity === 'Moderate') {
    return `Current responses indicate moderate ${label} symptoms. Continued monitoring and targeted therapeutic interventions are recommended.`;
  }
  if (assessment.severity === 'Mild') {
    return `Current responses indicate mild ${label} symptoms. Maintain treatment momentum and track change over time.`;
  }
  return `Current responses indicate low ${label} symptom burden. Continue routine monitoring for trend changes.`;
};

export default function Assessments() {
  const { patientId } = useParams();
  const { data: assessments = [], isLoading } = usePatientAssessments(patientId);
  const assignAssessmentMutation = useMutation({
    mutationFn: async (payload: { title: string; templateId?: string; estimatedMinutes?: number }) => {
      if (!patientId) throw new Error('Patient id is required');
      return assignPatientItem(patientId, {
        assignmentType: 'ASSESSMENT',
        title: payload.title,
        templateId: payload.templateId,
        referenceId: 'before-next-session',
        frequency: 'ONE_TIME',
        estimatedMinutes: payload.estimatedMinutes ?? 10,
      });
    },
    onSuccess: (_response, variables) => {
      toast.success(`${variables.title} assigned to patient`);
    },
    onError: (error: any) => {
      toast.error(String(error?.response?.data?.message || error?.message || 'Failed to assign assessment'));
    },
  });
  const [selectedAssessmentId, setSelectedAssessmentId] = useState('');

  useEffect(() => {
    if (!assessments.length) {
      setSelectedAssessmentId('');
      return;
    }

    const hasSelected = assessments.some((assessment) => assessment.id === selectedAssessmentId);
    if (!hasSelected) {
      setSelectedAssessmentId(assessments[0].id);
    }
  }, [assessments, selectedAssessmentId]);

  const selectedAssessment = useMemo(
    () => assessments.find((assessment) => assessment.id === selectedAssessmentId) ?? assessments[0],
    [assessments, selectedAssessmentId],
  );

  const previousOfSameType = useMemo(() => {
    if (!selectedAssessment) return undefined;
    const selectedTs = new Date(selectedAssessment.date).getTime();

    return assessments
      .filter((assessment) => assessment.type === selectedAssessment.type && new Date(assessment.date).getTime() < selectedTs)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];
  }, [assessments, selectedAssessment]);

  const assignBeforeNextSession = async (type: 'PHQ-9' | 'GAD-7' | 'BOTH') => {
    if (type === 'BOTH') {
      await assignAssessmentMutation.mutateAsync({
        title: 'PHQ-9 Assessment',
        templateId: CLINICAL_ASSESSMENT_TEMPLATE_KEYS['PHQ-9'],
        estimatedMinutes: 5,
      });
      await assignAssessmentMutation.mutateAsync({
        title: 'GAD-7 Assessment',
        templateId: CLINICAL_ASSESSMENT_TEMPLATE_KEYS['GAD-7'],
        estimatedMinutes: 4,
      });
      return;
    }

    await assignAssessmentMutation.mutateAsync({
      title: type === 'PHQ-9' ? 'PHQ-9 Assessment' : 'GAD-7 Assessment',
      templateId: type === 'PHQ-9' ? CLINICAL_ASSESSMENT_TEMPLATE_KEYS['PHQ-9'] : CLINICAL_ASSESSMENT_TEMPLATE_KEYS['GAD-7'],
      estimatedMinutes: type === 'PHQ-9' ? 5 : 4,
    });
  };

  return (
    <div className="space-y-4" style={{ fontFamily: 'DM Sans, sans-serif' }}>
      <header className="flex flex-col gap-3 rounded-xl border border-[#E5E5E5] bg-white p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-display text-2xl font-semibold text-[#2D4128]">Clinical Assessments</h2>
          <p className="mt-1 text-sm text-slate-500">Review score trends and question-level responses for patient ID {patientId || '123'}.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => void assignBeforeNextSession('PHQ-9')}
            disabled={assignAssessmentMutation.isPending}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#4A6741] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#2D4128]"
          >
            <Send className="h-4 w-4" />
            PHQ-9 Before Next Session
          </button>
          <button
            type="button"
            onClick={() => void assignBeforeNextSession('GAD-7')}
            disabled={assignAssessmentMutation.isPending}
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-[#E5E5E5] bg-white px-4 py-2.5 text-sm font-semibold text-[#2D4128] transition hover:bg-[#FAFAF8]"
          >
            <Send className="h-4 w-4" />
            GAD-7 Before Next Session
          </button>
          <button
            type="button"
            onClick={() => void assignBeforeNextSession('BOTH')}
            disabled={assignAssessmentMutation.isPending}
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-[#E5E5E5] bg-white px-4 py-2.5 text-sm font-semibold text-[#2D4128] transition hover:bg-[#FAFAF8]"
          >
            <Send className="h-4 w-4" />
            Both Before Next Session
          </button>
        </div>
      </header>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <aside className="lg:col-span-1">
          <div className="rounded-xl border border-[#E5E5E5] bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between gap-3 border-b border-[#E5E5E5] pb-4">
              <div>
                <p className="font-display text-lg font-semibold text-[#2D4128]">Assessment History</p>
                <p className="text-sm text-slate-500">Recent completed instruments</p>
              </div>
              <div className="rounded-full bg-[#FAFAF8] px-3 py-1 text-xs font-semibold text-slate-500">
                {isLoading ? 'Loading...' : `${assessments.length} records`}
              </div>
            </div>

            <div className="mt-4 max-h-[680px] space-y-3 overflow-y-auto pr-1">
              {isLoading && (
                <div className="space-y-3">
                  {Array.from({ length: 3 }).map((_, index) => (
                    <div key={`assessment-skeleton-${index}`} className="h-28 animate-pulse rounded-xl border border-[#E5E5E5] bg-[#FAFAF8]" />
                  ))}
                </div>
              )}

              {!isLoading && assessments.map((assessment) => {
                const isActive = assessment.id === selectedAssessment?.id;

                return (
                  <button
                    key={assessment.id}
                    type="button"
                    onClick={() => setSelectedAssessmentId(assessment.id)}
                    className={`w-full rounded-xl border px-4 py-4 text-left transition-all ${
                      isActive
                        ? 'border-[#E5E5E5] border-l-4 border-l-[#4A6741] bg-[#E8EFE6]'
                        : 'border-[#E5E5E5] bg-white hover:bg-[#FAFAF8]'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-display text-sm font-semibold text-[#2D4128]">{getAssessmentTitle(assessment)}</p>
                        <p className="mt-1 text-xs text-slate-500">{formatAssessmentDate(assessment.date)}</p>
                      </div>
                      <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${severityClass(assessment.severity)}`}>
                        {assessment.severity}
                      </span>
                    </div>
                    <div className="mt-3 flex items-center justify-between text-sm text-slate-600">
                      <span className="inline-flex items-center gap-2">
                        <FileText className="h-4 w-4" />
                        Total Score
                      </span>
                      <span className="font-semibold text-[#2D4128]">{assessment.totalScore}/{getMaxScore(assessment.type)}</span>
                    </div>
                  </button>
                );
              })}

              {!isLoading && assessments.length === 0 && (
                <div className="rounded-xl border border-dashed border-[#E5E5E5] bg-[#FAFAF8] px-4 py-8 text-center">
                  <p className="font-display text-sm font-semibold text-[#2D4128]">No assessments yet</p>
                  <p className="mt-1 text-xs text-slate-500">Completed PHQ-9 and GAD-7 assessments will appear here.</p>
                </div>
              )}
            </div>
          </div>
        </aside>

        <section className="lg:col-span-2">
          <div className="rounded-xl border border-[#E5E5E5] bg-white p-5 shadow-sm">
            {isLoading && (
              <div className="space-y-4">
                <div className="h-20 animate-pulse rounded-xl bg-[#FAFAF8]" />
                <div className="h-24 animate-pulse rounded-xl bg-[#FAFAF8]" />
                <div className="h-48 animate-pulse rounded-xl bg-[#FAFAF8]" />
              </div>
            )}

            {!isLoading && selectedAssessment && (
              <>
                <div className="flex flex-col gap-4 border-b border-[#E5E5E5] pb-5 md:flex-row md:items-start md:justify-between">
                  <div>
                    <p className="font-display text-2xl font-semibold text-[#2D4128]">{getAssessmentFullName(selectedAssessment)}</p>
                    <p className="mt-1 text-sm text-slate-500">Completed on {formatAssessmentDate(selectedAssessment.date)}</p>
                  </div>
                  <div className="rounded-xl border border-[#E5E5E5] bg-[#FAFAF8] px-4 py-3 text-right">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Total Score</p>
                    <p className="mt-1 font-display text-3xl font-semibold text-[#2D4128]">
                      {selectedAssessment.totalScore}/{getMaxScore(selectedAssessment.type)}
                    </p>
                  </div>
                </div>

                <div className="mt-5 rounded-xl border border-blue-100 bg-blue-50 p-4">
                  <div className="flex items-start gap-3">
                    <TrendingDown className="mt-0.5 h-5 w-5 text-blue-600" />
                    <div>
                      <p className="font-display text-sm font-semibold text-slate-800">Clinical Insight</p>
                      <p className="mt-1 text-sm text-slate-700">{getClinicalInsight(selectedAssessment, previousOfSameType)}</p>
                      <p className="mt-1 text-sm text-slate-700">{getClinicalInsightSupplement(selectedAssessment)}</p>
                    </div>
                  </div>
                </div>

                <div className="mt-6">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="h-5 w-5 text-[#4A6741]" />
                    <h3 className="font-display text-lg font-semibold text-[#2D4128]">Question Breakdown</h3>
                  </div>

                  <div className="mt-4 overflow-hidden rounded-xl border border-[#E5E5E5]">
                    <table className="min-w-full divide-y divide-[#E5E5E5]">
                      <thead className="bg-[#FAFAF8]">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Question</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Patient&apos;s Answer</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Points</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#E5E5E5] bg-white">
                        {selectedAssessment.answers.map((question, index) => (
                          <tr key={`${question.prompt}-${index}`}>
                            <td className="px-4 py-4 text-sm text-[#2D4128]">{question.prompt}</td>
                            <td className="px-4 py-4 text-sm text-slate-600">{question.answer}</td>
                            <td className="px-4 py-4 text-sm font-semibold text-[#2D4128]">{question.points}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            )}

            {!isLoading && !selectedAssessment && (
              <div className="rounded-xl border border-dashed border-[#E5E5E5] bg-[#FAFAF8] px-4 py-10 text-center">
                <p className="font-display text-base font-semibold text-[#2D4128]">No assessment selected</p>
                <p className="mt-1 text-sm text-slate-500">Once assessments are completed, detailed scoring and question breakdowns will appear here.</p>
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}