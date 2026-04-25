import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { fetchProviderCalendarSessions, type ProviderCalendarSession } from '../../api/provider';

const weekdayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const monthStart = (date: Date): Date => new Date(date.getFullYear(), date.getMonth(), 1);
const monthEnd = (date: Date): Date => new Date(date.getFullYear(), date.getMonth() + 1, 0);
const dayKey = (date: Date): string => date.toISOString().slice(0, 10);

const buildGridDays = (visibleMonth: Date): Date[] => {
	const start = monthStart(visibleMonth);
	const end = monthEnd(visibleMonth);
	const gridStart = new Date(start);
	gridStart.setDate(start.getDate() - start.getDay());
	const gridEnd = new Date(end);
	gridEnd.setDate(end.getDate() + (6 - end.getDay()));

	const days: Date[] = [];
	for (const cursor = new Date(gridStart); cursor <= gridEnd; cursor.setDate(cursor.getDate() + 1)) {
		days.push(new Date(cursor));
	}
	return days;
};

const formatMonthLabel = (date: Date): string =>
	date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

const formatSessionTime = (value: string): string => {
	const date = new Date(value);
	if (Number.isNaN(date.getTime())) return '';
	return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
};

const statusClasses = (status: ProviderCalendarSession['status']): string => {
	if (status === 'Completed') return 'border-[#B9E3CC] bg-[#E8F5EE] text-[#1F6B45]';
	if (status === 'Cancelled') return 'border-[#F6C7C5] bg-[#FDECEC] text-[#B42318]';
	return 'border-[#C8D8FB] bg-[#ECF3FF] text-[#3157A6]';
};

export default function Calendar() {
	const navigate = useNavigate();
	const [visibleMonth, setVisibleMonth] = useState(() => monthStart(new Date()));
	const sessionsQuery = useQuery({
		queryKey: ['providerCalendarSessions'],
		queryFn: fetchProviderCalendarSessions,
	});

	const calendarDays = useMemo(() => buildGridDays(visibleMonth), [visibleMonth]);
	const sessionsByDay = useMemo(() => {
		const map = new Map<string, ProviderCalendarSession[]>();
		for (const session of sessionsQuery.data ?? []) {
			const key = dayKey(new Date(session.dateTime));
			const items = map.get(key) ?? [];
			items.push(session);
			items.sort((left, right) => new Date(left.dateTime).getTime() - new Date(right.dateTime).getTime());
			map.set(key, items);
		}
		return map;
	}, [sessionsQuery.data]);

	return (
		<div className="space-y-6">
			<section className="rounded-[28px] border border-[#D9E1D5] bg-[radial-gradient(circle_at_top_left,_rgba(49,87,166,0.18),_transparent_35%),linear-gradient(135deg,#F8FBFF_0%,#FFFFFF_62%)] p-8 shadow-[0_18px_60px_rgba(31,41,55,0.06)]">
				<p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#5C729A]">Calendar</p>
				<h1 className="mt-3 text-3xl font-semibold text-[#23313A]">Integrated Schedule</h1>
				<p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
					Therapy sessions are synced from the clinical schedule. Click a session block to go directly to the patient chart overview.
				</p>
			</section>

			<section className="rounded-[24px] border border-[#DCE5D9] bg-white p-6 shadow-sm">
				<div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
					<div>
						<p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#6B7B68]">Month View</p>
						<h2 className="mt-2 text-2xl font-semibold text-[#23313A]">{formatMonthLabel(visibleMonth)}</h2>
					</div>
					<div className="inline-flex items-center gap-2 self-start rounded-full border border-[#E3E9E0] bg-[#F8FAF7] p-1">
						<button
							type="button"
							onClick={() => setVisibleMonth((current) => new Date(current.getFullYear(), current.getMonth() - 1, 1))}
							className="inline-flex h-10 w-10 items-center justify-center rounded-full text-[#23313A] transition hover:bg-white"
						>
							<ChevronLeft className="h-4 w-4" />
						</button>
						<button
							type="button"
							onClick={() => setVisibleMonth(monthStart(new Date()))}
							className="rounded-full px-4 py-2 text-sm font-semibold text-[#23313A] transition hover:bg-white"
						>
							Today
						</button>
						<button
							type="button"
							onClick={() => setVisibleMonth((current) => new Date(current.getFullYear(), current.getMonth() + 1, 1))}
							className="inline-flex h-10 w-10 items-center justify-center rounded-full text-[#23313A] transition hover:bg-white"
						>
							<ChevronRight className="h-4 w-4" />
						</button>
					</div>
				</div>

				<div className="mt-6 flex flex-wrap gap-3 text-xs font-semibold">
					<span className="inline-flex items-center gap-2 rounded-full bg-[#ECF3FF] px-3 py-1.5 text-[#3157A6]">
						<span className="h-2 w-2 rounded-full bg-[#3157A6]" /> Upcoming
					</span>
					<span className="inline-flex items-center gap-2 rounded-full bg-[#E8F5EE] px-3 py-1.5 text-[#1F6B45]">
						<span className="h-2 w-2 rounded-full bg-[#1F6B45]" /> Completed
					</span>
					<span className="inline-flex items-center gap-2 rounded-full bg-[#FDECEC] px-3 py-1.5 text-[#B42318]">
						<span className="h-2 w-2 rounded-full bg-[#B42318]" /> Cancelled
					</span>
				</div>

				{sessionsQuery.isLoading ? (
					<div className="mt-6 grid grid-cols-7 gap-3">
						{Array.from({ length: 35 }).map((_, index) => (
							<div key={`provider-calendar-skeleton-${index}`} className="h-36 animate-pulse rounded-2xl bg-[#EEF2EA]" />
						))}
					</div>
				) : sessionsQuery.isError ? (
					<div className="mt-6 rounded-2xl border border-rose-200 bg-rose-50 p-5 text-sm text-rose-700">
						{sessionsQuery.error instanceof Error ? sessionsQuery.error.message : 'Unable to load provider sessions.'}
					</div>
				) : (
					<div className="mt-6 overflow-x-auto">
						<div className="grid min-w-[980px] grid-cols-7 gap-3">
							{weekdayLabels.map((label) => (
								<div key={label} className="px-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
									{label}
								</div>
							))}
							{calendarDays.map((day) => {
								const key = dayKey(day);
								const sessions = sessionsByDay.get(key) ?? [];
								const inCurrentMonth = day.getMonth() === visibleMonth.getMonth();
								const isToday = key === dayKey(new Date());

								return (
									<div
										key={key}
										className={`min-h-[164px] rounded-2xl border p-3 ${
											inCurrentMonth ? 'border-[#E3E9E0] bg-white' : 'border-[#EEF2EA] bg-[#FAFBF9]'
										}`}
									>
										<div className="flex items-center justify-between">
											<span className={`text-sm font-semibold ${inCurrentMonth ? 'text-[#23313A]' : 'text-slate-400'}`}>{day.getDate()}</span>
											{isToday && <span className="rounded-full bg-[#23313A] px-2 py-0.5 text-[10px] font-semibold text-white">Today</span>}
										</div>

										<div className="mt-3 space-y-2">
											{sessions.map((session) => (
												<button
													key={session.id}
													type="button"
													onClick={() => navigate(`/provider/patient/${session.patientId}/overview`)}
													className={`w-full rounded-xl border px-3 py-2 text-left transition hover:shadow-sm ${statusClasses(session.status)}`}
												>
													<p className="truncate text-xs font-semibold">{session.patientName}</p>
													<p className="mt-1 text-[11px] opacity-80">{formatSessionTime(session.dateTime)} • {session.status}</p>
												</button>
											))}
											{sessions.length === 0 && <div className="h-9 rounded-lg border border-dashed border-[#EEF2EA] bg-[#FBFCFA]" />}
										</div>
									</div>
								);
							})}
						</div>
					</div>
				)}
			</section>
		</div>
	);
}