import { useEffect, useMemo, useState } from 'react';
import { Navigate } from 'react-router-dom';
import {
  createAdminQuestionOption,
  createAdminTemplateQuestion,
  ensureAdminScreeningTemplateDefault,
  getAdminScoringBands,
  getAdminScreeningTemplates,
  getAdminTemplateQuestions,
  replaceAdminScoringBands,
  updateAdminQuestionOption,
  updateAdminScreeningTemplate,
  updateAdminTemplateQuestion,
  type AdminScreeningQuestion,
  type AdminScreeningScoringBand,
  type AdminScreeningTemplate,
} from '../../api/admin.api';
import { isPlatformAdminUser, useAuth } from '../../context/AuthContext';

const templateCatalog = {
  'phq-9-paid-assessment-v1': {
    label: 'PHQ-9',
    title: 'PHQ-9 Template',
    emptyMessage: 'The PHQ-9 template is not present yet.',
    createMessage: 'Create Default PHQ-9 Template',
    description: 'Manage the structured PHQ-9 questionnaire, answer options, scoring bands, and publication state.',
    sectionKey: 'depression',
    newQuestionLabel: 'New PHQ-9 question',
  },
  'gad-7-paid-assessment-v1': {
    label: 'GAD-7',
    title: 'GAD-7 Template',
    emptyMessage: 'The GAD-7 template is not present yet.',
    createMessage: 'Create Default GAD-7 Template',
    description: 'Manage the structured GAD-7 questionnaire, answer options, scoring bands, and publication state.',
    sectionKey: 'anxiety',
    newQuestionLabel: 'New GAD-7 question',
  },
} as const;

type TemplateKey = keyof typeof templateCatalog;

const defaultOptionSet = [
  { label: 'Not at all', optionIndex: 0, points: 0 },
  { label: 'Several days', optionIndex: 1, points: 1 },
  { label: 'More than half the days', optionIndex: 2, points: 2 },
  { label: 'Nearly every day', optionIndex: 3, points: 3 },
];

export default function AdminTemplatesPage() {
  const { user, loading: authLoading } = useAuth();
  const canAccess = isPlatformAdminUser(user);
  const [selectedTemplateKey, setSelectedTemplateKey] = useState<TemplateKey>('phq-9-paid-assessment-v1');
  const [template, setTemplate] = useState<AdminScreeningTemplate | null>(null);
  const [questions, setQuestions] = useState<AdminScreeningQuestion[]>([]);
  const [bands, setBands] = useState<AdminScreeningScoringBand[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const templatesRes = await getAdminScreeningTemplates();
      const matched = templatesRes.data.items.find((item) => item.key === selectedTemplateKey) || null;
      setTemplate(matched);

      if (matched) {
        const [questionsRes, bandsRes] = await Promise.all([
          getAdminTemplateQuestions(matched.id),
          getAdminScoringBands(matched.id),
        ]);
        setQuestions(questionsRes.data.items);
        setBands(bandsRes.data.items);
      } else {
        setQuestions([]);
        setBands([]);
      }
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Unable to load screening templates.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!canAccess) {
      setLoading(false);
      return;
    }
    void load();
  }, [canAccess, selectedTemplateKey]);

  if (authLoading) {
    return <div className="rounded-lg border border-ink-100 bg-white px-4 py-3 text-sm text-ink-600">Checking permissions...</div>;
  }

  if (!canAccess) {
    return <Navigate to="/admin/dashboard" replace />;
  }

  const saveTemplate = async () => {
    if (!template) return;
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const response = await updateAdminScreeningTemplate(template.id, {
        title: template.title,
        description: template.description || '',
        estimatedMinutes: template.estimatedMinutes,
        isPublic: template.isPublic,
        randomizeOrder: template.randomizeOrder,
        status: template.status,
      });
      setTemplate(response.data);
      setSuccess('Template details updated.');
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Unable to update template details.');
    } finally {
      setSaving(false);
    }
  };

  const ensureDefault = async () => {
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      await ensureAdminScreeningTemplateDefault(selectedTemplateKey);
      await load();
      setSuccess(`${templateCatalog[selectedTemplateKey].label} template is ready for editing.`);
    } catch (err: any) {
      setError(err?.response?.data?.message || `Unable to create the default ${templateCatalog[selectedTemplateKey].label} template.`);
    } finally {
      setSaving(false);
    }
  };

  const saveQuestion = async (question: AdminScreeningQuestion) => {
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const response = await updateAdminTemplateQuestion(question.id, {
        prompt: question.prompt,
        sectionKey: question.sectionKey,
        orderIndex: question.orderIndex,
        isActive: question.isActive,
      });
      setQuestions((prev) => prev.map((item) => (item.id === question.id ? response.data : item)));
      setSuccess('Question updated.');
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Unable to update question.');
    } finally {
      setSaving(false);
    }
  };

  const addQuestion = async () => {
    if (!template) return;
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      await createAdminTemplateQuestion(template.id, {
        prompt: templateCatalog[selectedTemplateKey].newQuestionLabel,
        sectionKey: templateCatalog[selectedTemplateKey].sectionKey,
        orderIndex: questions.length + 1,
        options: defaultOptionSet,
      });
      await load();
      setSuccess('Question added.');
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Unable to add question.');
    } finally {
      setSaving(false);
    }
  };

  const saveOption = async (questionId: string, optionId: string) => {
    const question = questions.find((item) => item.id === questionId);
    const option = question?.options.find((item) => item.id === optionId);
    if (!option) return;
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const response = await updateAdminQuestionOption(optionId, {
        label: option.label,
        optionIndex: option.optionIndex,
        points: option.points,
      });
      setQuestions((prev) => prev.map((item) => {
        if (item.id !== questionId) return item;
        return {
          ...item,
          options: item.options.map((entry) => (entry.id === optionId ? { ...entry, ...response.data } : entry)),
        };
      }));
      setSuccess('Option updated.');
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Unable to update option.');
    } finally {
      setSaving(false);
    }
  };

  const addOption = async (question: AdminScreeningQuestion) => {
    const nextIndex = question.options.length;
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      await createAdminQuestionOption(question.id, {
        label: `New option ${nextIndex + 1}`,
        optionIndex: nextIndex,
        points: nextIndex,
      });
      await load();
      setSuccess('Option added.');
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Unable to add option.');
    } finally {
      setSaving(false);
    }
  };

  const saveBands = async () => {
    if (!template) return;
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const response = await replaceAdminScoringBands(template.id, bands.map((band) => ({
        orderIndex: band.orderIndex,
        minScore: band.minScore,
        maxScore: band.maxScore,
        severity: band.severity,
        interpretation: band.interpretation,
        recommendation: band.recommendation,
        actionLabel: band.actionLabel,
      })));
      setBands(response.data.items);
      setSuccess('Scoring bands updated.');
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Unable to update scoring bands.');
    } finally {
      setSaving(false);
    }
  };

  const templateStatusTone = useMemo(() => {
    if (!template) return 'text-ink-500';
    if (template.status === 'PUBLISHED') return 'text-emerald-700';
    if (template.status === 'ARCHIVED') return 'text-red-700';
    return 'text-amber-700';
  }, [template]);

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-ink-100 bg-white p-5">
        <h2 className="font-display text-xl font-bold text-ink-800">Assessment Template Management</h2>
        <p className="mt-1 text-sm text-ink-600">Manage structured clinical questionnaires, answer options, scoring bands, and publication state from the admin panel.</p>
        <div className="mt-4 flex flex-wrap gap-2">
          {(Object.keys(templateCatalog) as TemplateKey[]).map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => setSelectedTemplateKey(key)}
              className={`rounded-lg border px-3 py-2 text-sm font-medium ${selectedTemplateKey === key ? 'border-ink-900 bg-ink-900 text-white' : 'border-ink-200 bg-white text-ink-700'}`}
            >
              {templateCatalog[key].label}
            </button>
          ))}
        </div>
      </div>

      {loading ? <div className="rounded-lg border border-ink-100 bg-white px-4 py-3 text-sm text-ink-600">Loading {templateCatalog[selectedTemplateKey].label} template...</div> : null}
      {error ? <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div> : null}
      {success ? <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{success}</div> : null}

      {!loading && !template ? (
        <div className="rounded-xl border border-dashed border-ink-200 bg-white p-5">
          <p className="text-sm text-ink-700">{templateCatalog[selectedTemplateKey].emptyMessage}</p>
          <button
            type="button"
            onClick={() => void ensureDefault()}
            disabled={saving}
            className="mt-3 inline-flex min-h-[40px] items-center rounded-lg bg-ink-900 px-4 text-sm font-medium text-white disabled:opacity-60"
          >
            {saving ? 'Creating...' : templateCatalog[selectedTemplateKey].createMessage}
          </button>
        </div>
      ) : null}

      {template ? (
        <>
          <section className="rounded-xl border border-ink-100 bg-white p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="font-display text-lg font-semibold text-ink-800">{templateCatalog[selectedTemplateKey].title}</h3>
                <p className="mt-1 text-xs text-ink-500">Key: {template.key}</p>
                <p className="mt-1 text-sm text-ink-600">{templateCatalog[selectedTemplateKey].description}</p>
              </div>
              <span className={`text-xs font-semibold uppercase tracking-[0.12em] ${templateStatusTone}`}>{template.status}</span>
            </div>

            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <label className="text-sm text-ink-600">
                Title
                <input
                  value={template.title}
                  onChange={(event) => setTemplate({ ...template, title: event.target.value })}
                  className="mt-1 w-full rounded-lg border border-ink-100 px-3 py-2 text-sm text-ink-800"
                />
              </label>
              <label className="text-sm text-ink-600">
                Estimated Minutes
                <input
                  type="number"
                  min={1}
                  value={template.estimatedMinutes}
                  onChange={(event) => setTemplate({ ...template, estimatedMinutes: Number(event.target.value) || 1 })}
                  className="mt-1 w-full rounded-lg border border-ink-100 px-3 py-2 text-sm text-ink-800"
                />
              </label>
            </div>

            <label className="mt-3 block text-sm text-ink-600">
              Description / Instructions
              <textarea
                rows={6}
                value={template.description || ''}
                onChange={(event) => setTemplate({ ...template, description: event.target.value })}
                className="mt-1 w-full rounded-lg border border-ink-100 px-3 py-2 text-sm text-ink-800"
              />
            </label>

            <div className="mt-3 flex flex-wrap gap-4 text-sm text-ink-700">
              <label className="inline-flex items-center gap-2">
                <input type="checkbox" checked={template.isPublic} onChange={(event) => setTemplate({ ...template, isPublic: event.target.checked })} />
                Public template
              </label>
              <label className="inline-flex items-center gap-2">
                <input type="checkbox" checked={template.randomizeOrder} onChange={(event) => setTemplate({ ...template, randomizeOrder: event.target.checked })} />
                Randomize question order
              </label>
              <label className="inline-flex items-center gap-2">
                Status
                <select
                  value={template.status}
                  onChange={(event) => setTemplate({ ...template, status: event.target.value as AdminScreeningTemplate['status'] })}
                  className="rounded-lg border border-ink-100 px-2 py-1 text-sm text-ink-800"
                >
                  <option value="DRAFT">DRAFT</option>
                  <option value="PUBLISHED">PUBLISHED</option>
                  <option value="ARCHIVED">ARCHIVED</option>
                </select>
              </label>
            </div>

            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={() => void saveTemplate()}
                disabled={saving}
                className="inline-flex min-h-[40px] items-center rounded-lg bg-ink-900 px-4 text-sm font-medium text-white disabled:opacity-60"
              >
                {saving ? 'Saving...' : 'Save Template'}
              </button>
              <button
                type="button"
                onClick={() => void ensureDefault()}
                disabled={saving}
                className="inline-flex min-h-[40px] items-center rounded-lg border border-ink-200 px-4 text-sm font-medium text-ink-700 disabled:opacity-60"
              >
                Refresh Default Definition
              </button>
            </div>
          </section>

          <section className="rounded-xl border border-ink-100 bg-white p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="font-display text-lg font-semibold text-ink-800">Questions & Options</h3>
                <p className="mt-1 text-sm text-ink-600">Each item and option remains editable after the default {templateCatalog[selectedTemplateKey].label} template is created.</p>
              </div>
              <button
                type="button"
                onClick={() => void addQuestion()}
                disabled={saving}
                className="inline-flex min-h-[40px] items-center rounded-lg border border-ink-200 px-4 text-sm font-medium text-ink-700 disabled:opacity-60"
              >
                Add Question
              </button>
            </div>

            <div className="mt-4 space-y-4">
              {questions.map((question) => (
                <div key={question.id} className="rounded-xl border border-ink-100 p-4">
                  <div className="grid gap-3 md:grid-cols-[1fr_120px_140px]">
                    <label className="text-sm text-ink-600">
                      Prompt
                      <textarea
                        rows={2}
                        value={question.prompt}
                        onChange={(event) => setQuestions((prev) => prev.map((item) => item.id === question.id ? { ...item, prompt: event.target.value } : item))}
                        className="mt-1 w-full rounded-lg border border-ink-100 px-3 py-2 text-sm text-ink-800"
                      />
                    </label>
                    <label className="text-sm text-ink-600">
                      Order
                      <input
                        type="number"
                        min={1}
                        value={question.orderIndex}
                        onChange={(event) => setQuestions((prev) => prev.map((item) => item.id === question.id ? { ...item, orderIndex: Number(event.target.value) || 1 } : item))}
                        className="mt-1 w-full rounded-lg border border-ink-100 px-3 py-2 text-sm text-ink-800"
                      />
                    </label>
                    <label className="text-sm text-ink-600">
                      Section / Active
                      <div className="mt-1 flex gap-2">
                        <input
                          value={question.sectionKey}
                          onChange={(event) => setQuestions((prev) => prev.map((item) => item.id === question.id ? { ...item, sectionKey: event.target.value } : item))}
                          className="w-full rounded-lg border border-ink-100 px-3 py-2 text-sm text-ink-800"
                        />
                        <label className="inline-flex min-w-[78px] items-center justify-center gap-2 rounded-lg border border-ink-100 px-3 py-2 text-xs text-ink-700">
                          <input
                            type="checkbox"
                            checked={question.isActive}
                            onChange={(event) => setQuestions((prev) => prev.map((item) => item.id === question.id ? { ...item, isActive: event.target.checked } : item))}
                          />
                          Active
                        </label>
                      </div>
                    </label>
                  </div>

                  <div className="mt-3 space-y-2">
                    {question.options.map((option) => (
                      <div key={option.id} className="grid gap-2 rounded-lg bg-ink-50 p-3 md:grid-cols-[1fr_120px_120px_90px]">
                        <input
                          value={option.label}
                          onChange={(event) => setQuestions((prev) => prev.map((item) => item.id !== question.id ? item : {
                            ...item,
                            options: item.options.map((entry) => entry.id === option.id ? { ...entry, label: event.target.value } : entry),
                          }))}
                          className="rounded-lg border border-ink-100 px-3 py-2 text-sm text-ink-800"
                        />
                        <input
                          type="number"
                          value={option.optionIndex}
                          onChange={(event) => setQuestions((prev) => prev.map((item) => item.id !== question.id ? item : {
                            ...item,
                            options: item.options.map((entry) => entry.id === option.id ? { ...entry, optionIndex: Number(event.target.value) || 0 } : entry),
                          }))}
                          className="rounded-lg border border-ink-100 px-3 py-2 text-sm text-ink-800"
                        />
                        <input
                          type="number"
                          value={option.points}
                          onChange={(event) => setQuestions((prev) => prev.map((item) => item.id !== question.id ? item : {
                            ...item,
                            options: item.options.map((entry) => entry.id === option.id ? { ...entry, points: Number(event.target.value) || 0 } : entry),
                          }))}
                          className="rounded-lg border border-ink-100 px-3 py-2 text-sm text-ink-800"
                        />
                        <button
                          type="button"
                          onClick={() => void saveOption(question.id, option.id)}
                          disabled={saving}
                          className="rounded-lg border border-ink-200 px-3 py-2 text-xs font-medium text-ink-700 disabled:opacity-60"
                        >
                          Save
                        </button>
                      </div>
                    ))}
                  </div>

                  <div className="mt-3 flex gap-2">
                    <button
                      type="button"
                      onClick={() => void saveQuestion(question)}
                      disabled={saving}
                      className="inline-flex min-h-[36px] items-center rounded-lg bg-ink-900 px-3 text-sm font-medium text-white disabled:opacity-60"
                    >
                      Save Question
                    </button>
                    <button
                      type="button"
                      onClick={() => void addOption(question)}
                      disabled={saving}
                      className="inline-flex min-h-[36px] items-center rounded-lg border border-ink-200 px-3 text-sm font-medium text-ink-700 disabled:opacity-60"
                    >
                      Add Option
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-xl border border-ink-100 bg-white p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="font-display text-lg font-semibold text-ink-800">Clinical Scoring Bands</h3>
                <p className="mt-1 text-sm text-ink-600">Interpretation, recommendation, and action label for each PHQ-9 score band.</p>
              </div>
              <button
                type="button"
                onClick={() => void saveBands()}
                disabled={saving}
                className="inline-flex min-h-[40px] items-center rounded-lg bg-ink-900 px-4 text-sm font-medium text-white disabled:opacity-60"
              >
                {saving ? 'Saving...' : 'Save Scoring Bands'}
              </button>
            </div>

            <div className="mt-4 space-y-3">
              {bands.map((band) => (
                <div key={band.id} className="rounded-xl border border-ink-100 p-4">
                  <div className="grid gap-3 md:grid-cols-4">
                    <label className="text-sm text-ink-600">
                      Min Score
                      <input
                        type="number"
                        value={band.minScore}
                        onChange={(event) => setBands((prev) => prev.map((item) => item.id === band.id ? { ...item, minScore: Number(event.target.value) || 0 } : item))}
                        className="mt-1 w-full rounded-lg border border-ink-100 px-3 py-2 text-sm text-ink-800"
                      />
                    </label>
                    <label className="text-sm text-ink-600">
                      Max Score
                      <input
                        type="number"
                        value={band.maxScore}
                        onChange={(event) => setBands((prev) => prev.map((item) => item.id === band.id ? { ...item, maxScore: Number(event.target.value) || 0 } : item))}
                        className="mt-1 w-full rounded-lg border border-ink-100 px-3 py-2 text-sm text-ink-800"
                      />
                    </label>
                    <label className="text-sm text-ink-600 md:col-span-2">
                      Severity
                      <input
                        value={band.severity}
                        onChange={(event) => setBands((prev) => prev.map((item) => item.id === band.id ? { ...item, severity: event.target.value } : item))}
                        className="mt-1 w-full rounded-lg border border-ink-100 px-3 py-2 text-sm text-ink-800"
                      />
                    </label>
                  </div>

                  <label className="mt-3 block text-sm text-ink-600">
                    Interpretation
                    <textarea
                      rows={2}
                      value={band.interpretation}
                      onChange={(event) => setBands((prev) => prev.map((item) => item.id === band.id ? { ...item, interpretation: event.target.value } : item))}
                      className="mt-1 w-full rounded-lg border border-ink-100 px-3 py-2 text-sm text-ink-800"
                    />
                  </label>
                  <label className="mt-3 block text-sm text-ink-600">
                    Recommendation / Monitoring
                    <textarea
                      rows={3}
                      value={band.recommendation}
                      onChange={(event) => setBands((prev) => prev.map((item) => item.id === band.id ? { ...item, recommendation: event.target.value } : item))}
                      className="mt-1 w-full rounded-lg border border-ink-100 px-3 py-2 text-sm text-ink-800"
                    />
                  </label>
                  <label className="mt-3 block text-sm text-ink-600">
                    Action Label
                    <input
                      value={band.actionLabel}
                      onChange={(event) => setBands((prev) => prev.map((item) => item.id === band.id ? { ...item, actionLabel: event.target.value } : item))}
                      className="mt-1 w-full rounded-lg border border-ink-100 px-3 py-2 text-sm text-ink-800"
                    />
                  </label>
                </div>
              ))}
            </div>
          </section>
        </>
      ) : null}
    </div>
  );
}