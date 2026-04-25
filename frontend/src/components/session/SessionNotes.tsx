import { useEffect, useMemo, useState } from 'react';
import {
	finalizeNotes,
	generateSummary,
	getSessionNotes,
	getTemplates,
	saveSessionNotes,
	type MdcSessionNotesApiError,
	type MdcTemplate,
} from '../../api/mdcSessionNotes.api';

type SessionNotesProps = {
	sessionId: string;
};

const getErrorMessage = (error: unknown): string => {
	const apiError = error as MdcSessionNotesApiError;
	return apiError?.message || 'Unable to process session notes request.';
};

export default function SessionNotes({ sessionId }: SessionNotesProps) {
	const [templates, setTemplates] = useState<MdcTemplate[]>([]);
	const [templateId, setTemplateId] = useState('');
	const [notes, setNotes] = useState('');
	const [summary, setSummary] = useState('');
	const [isFinalized, setIsFinalized] = useState(false);

	const [isTemplatesLoading, setIsTemplatesLoading] = useState(false);
	const [isNotesLoading, setIsNotesLoading] = useState(false);
	const [isSaving, setIsSaving] = useState(false);
	const [isFinalizing, setIsFinalizing] = useState(false);
	const [isSummarizing, setIsSummarizing] = useState(false);

	const [error, setError] = useState<string | null>(null);
	const [statusMessage, setStatusMessage] = useState<string | null>(null);

	const selectedTemplateName = useMemo(() => {
		if (!templateId) return 'No template selected';
		return templates.find((tpl) => tpl.id === templateId)?.name || 'Unknown template';
	}, [templateId, templates]);

	const loadTemplates = async () => {
		setIsTemplatesLoading(true);
		try {
			const fetchedTemplates = await getTemplates();
			setTemplates(fetchedTemplates);
			if (!templateId && fetchedTemplates.length > 0) {
				setTemplateId(fetchedTemplates[0].id);
			}
		} catch (loadError) {
			setError(getErrorMessage(loadError));
		} finally {
			setIsTemplatesLoading(false);
		}
	};

	const loadSessionNotes = async () => {
		setIsNotesLoading(true);
		try {
			const existingNotes = await getSessionNotes(sessionId);
			setNotes(existingNotes.notes || '');
			setSummary(existingNotes.summary || '');
			setTemplateId(existingNotes.templateId || '');
			setIsFinalized(Boolean(existingNotes.finalized));
		} catch (loadError) {
			const apiError = loadError as MdcSessionNotesApiError;

			// If no notes exist yet, initialize an empty editor instead of blocking the UI.
			if (apiError?.status === 404) {
				setNotes('');
				setSummary('');
				setIsFinalized(false);
				return;
			}

			setError(getErrorMessage(loadError));
		} finally {
			setIsNotesLoading(false);
		}
	};

	useEffect(() => {
		if (!sessionId) {
			return;
		}

		setError(null);
		setStatusMessage(null);
		void Promise.all([loadTemplates(), loadSessionNotes()]);
	}, [sessionId]);

	const onSave = async () => {
		if (!sessionId) {
			setError('Session ID is required to save notes.');
			return;
		}

		setIsSaving(true);
		setError(null);
		setStatusMessage(null);
		try {
			const saved = await saveSessionNotes(sessionId, {
				templateId: templateId || undefined,
				notes,
			});
			setNotes(saved.notes || notes);
			setTemplateId(saved.templateId || templateId);
			setSummary(saved.summary || summary);
			setIsFinalized(Boolean(saved.finalized));
			setStatusMessage('Notes saved successfully.');
		} catch (saveError) {
			setError(getErrorMessage(saveError));
		} finally {
			setIsSaving(false);
		}
	};

	const onFinalize = async () => {
		if (!sessionId) {
			setError('Session ID is required to finalize notes.');
			return;
		}

		setIsFinalizing(true);
		setError(null);
		setStatusMessage(null);
		try {
			const result = await finalizeNotes(sessionId);
			const finalizedFromResponse = result.notes?.finalized ?? result.finalized ?? true;
			setIsFinalized(Boolean(finalizedFromResponse));

			if (result.notes?.notes !== undefined) {
				setNotes(result.notes.notes || '');
			}
			if (result.notes?.summary !== undefined) {
				setSummary(result.notes.summary || '');
			}

			setStatusMessage(result.message || 'Notes finalized. Editing is now disabled.');
		} catch (finalizeError) {
			setError(getErrorMessage(finalizeError));
		} finally {
			setIsFinalizing(false);
		}
	};

	const onGenerateSummary = async () => {
		if (!sessionId) {
			setError('Session ID is required to generate summary.');
			return;
		}

		setIsSummarizing(true);
		setError(null);
		setStatusMessage(null);
		try {
			const result = await generateSummary(sessionId);
			setSummary(result.summary || '');
			setStatusMessage('Summary generated successfully.');
		} catch (summaryError) {
			setError(getErrorMessage(summaryError));
		} finally {
			setIsSummarizing(false);
		}
	};

	const isBusy = isTemplatesLoading || isNotesLoading;

	return (
		<section className="space-y-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
			<header>
				<h2 className="text-lg font-semibold text-slate-900">Session Notes</h2>
				<p className="text-sm text-slate-500">Session ID: {sessionId || '-'}</p>
			</header>

			{error && <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
			{statusMessage && <p className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{statusMessage}</p>}

			<label className="block text-sm font-medium text-slate-700">
				Template
				<select
					value={templateId}
					disabled={isBusy || isFinalized}
					onChange={(event) => setTemplateId(event.target.value)}
					className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500 disabled:cursor-not-allowed disabled:bg-slate-100"
				>
					{templates.length === 0 && <option value="">No templates available</option>}
					{templates.map((template) => (
						<option key={template.id} value={template.id}>
							{template.name}
						</option>
					))}
				</select>
			</label>

			<label className="block text-sm font-medium text-slate-700">
				Notes
				<textarea
					value={notes}
					disabled={isBusy || isFinalized}
					onChange={(event) => setNotes(event.target.value)}
					rows={10}
					placeholder="Write session notes here..."
					className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500 disabled:cursor-not-allowed disabled:bg-slate-100"
				/>
			</label>

			<div className="flex flex-wrap gap-2">
				<button
					type="button"
					onClick={() => void onSave()}
					disabled={isBusy || isSaving || isFinalized}
					className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-70"
				>
					{isSaving ? 'Saving...' : 'Save Notes'}
				</button>

				<button
					type="button"
					onClick={() => void onFinalize()}
					disabled={isBusy || isFinalizing || isFinalized || !notes.trim()}
					className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-70"
				>
					{isFinalizing ? 'Finalizing...' : 'Finalize Notes'}
				</button>

				<button
					type="button"
					onClick={() => void onGenerateSummary()}
					disabled={isBusy || isSummarizing || !notes.trim()}
					className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-70"
				>
					{isSummarizing ? 'Generating...' : 'Generate Summary'}
				</button>
			</div>

			<div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
				<p className="text-xs uppercase tracking-wide text-slate-500">Selected Template</p>
				<p className="text-sm font-medium text-slate-700">{selectedTemplateName}</p>
			</div>

			<label className="block text-sm font-medium text-slate-700">
				Summary
				<textarea
					value={summary}
					readOnly
					rows={5}
					placeholder="Generated summary will appear here."
					className="mt-1 w-full rounded-lg border border-slate-300 bg-slate-100 px-3 py-2 text-sm text-slate-700"
				/>
			</label>

			{isFinalized && (
				<p className="text-sm text-amber-700">
					Notes are finalized and can no longer be edited.
				</p>
			)}
		</section>
	);
}
