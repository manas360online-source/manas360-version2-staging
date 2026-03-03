import {
  AlertTriangle,
  Calendar,
  CheckCircle2,
  Clock3,
  FileText,
  MessageSquare,
  Video,
  Wallet,
} from 'lucide-react';
import TherapistBadge from '../../components/therapist/dashboard/TherapistBadge';
import TherapistButton from '../../components/therapist/dashboard/TherapistButton';
import TherapistCard from '../../components/therapist/dashboard/TherapistCard';
import TherapistEarningsChart from '../../components/therapist/dashboard/TherapistEarningsChart';
import TherapistProgressRing from '../../components/therapist/dashboard/TherapistProgressRing';
import {
  chartData,
  patientAlerts,
  recentMessages,
  stats,
  therapistName,
  todaySessions,
} from './dashboardData';

const statCards = [
  {
    key: 'todaysSessions',
    title: "Today's Sessions",
    icon: Calendar,
    value: stats.todaysSessions.value,
    note: stats.todaysSessions.note,
    iconBg: 'bg-sage-50',
    iconColor: 'text-sage-500',
  },
  {
    key: 'weeklyEarnings',
    title: 'This Week',
    icon: Wallet,
    value: stats.weeklyEarnings.value,
    note: stats.weeklyEarnings.note,
    iconBg: 'bg-clay-50',
    iconColor: 'text-clay-500',
  },
  {
    key: 'activePatients',
    title: 'Active Patients',
    icon: MessageSquare,
    value: stats.activePatients.value,
    note: stats.activePatients.note,
    iconBg: 'bg-sky-50',
    iconColor: 'text-sky-600',
  },
  {
    key: 'avgRating',
    title: 'Avg Rating',
    icon: CheckCircle2,
    value: stats.avgRating.value,
    note: stats.avgRating.note,
    iconBg: 'bg-amber-50',
    iconColor: 'text-amber-600',
  },
];

export default function TherapistDashboardPage() {
  return (
    <div className="space-y-6">
      <section>
        <h2 className="font-display text-2xl font-bold text-ink-800">Good morning, {therapistName} 👋</h2>
        <p className="mt-1 text-sm text-ink-500">
          You have <span className="font-semibold text-sage-500">3 sessions</span> scheduled today. 2 notes are pending.
        </p>
      </section>

      <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        {statCards.map((card) => {
          const Icon = card.icon;
          return (
            <TherapistCard key={card.key} className="p-5">
              <div className="mb-3 flex items-center justify-between">
                <span className="text-xs font-medium uppercase tracking-wider text-ink-500">{card.title}</span>
                <span className={`inline-flex h-8 w-8 items-center justify-center rounded-lg ${card.iconBg}`}>
                  <Icon className={`h-4 w-4 ${card.iconColor}`} />
                </span>
              </div>
              <div className="flex items-end gap-2">
                <span className="font-display text-3xl font-bold text-ink-800">{card.value}</span>
                <span className="mb-1 text-xs font-medium text-ink-500">{card.note}</span>
              </div>
            </TherapistCard>
          );
        })}
      </section>

      <section className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <div className="space-y-6 xl:col-span-2">
          <TherapistCard className="overflow-hidden">
            <div className="flex items-center justify-between border-b border-ink-100 px-5 py-4">
              <h3 className="font-display text-base font-bold text-ink-800">Today's Sessions</h3>
              <button className="text-xs font-medium text-sage-500 hover:text-sage-600">View All →</button>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-[740px] w-full text-left">
                <thead>
                  <tr className="border-b border-ink-100 text-xs uppercase tracking-[0.08em] text-ink-500">
                    <th className="px-5 py-3">Time</th>
                    <th className="px-5 py-3">Patient</th>
                    <th className="px-5 py-3">Session Type</th>
                    <th className="px-5 py-3">Status</th>
                    <th className="px-5 py-3">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {todaySessions.map((session) => (
                    <tr key={session.id} className="border-b border-ink-100/70 text-sm text-ink-800 hover:bg-surface-bg">
                      <td className="px-5 py-3">
                        <div className="inline-flex items-center gap-2 text-ink-500">
                          <Clock3 className="h-4 w-4" />
                          {session.time}
                        </div>
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-3">
                          <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-sage-50 font-display text-xs font-bold text-sage-500">
                            {session.initials}
                          </span>
                          <span className="font-semibold">{session.patient}</span>
                        </div>
                      </td>
                      <td className="px-5 py-3 text-ink-500">{session.type}</td>
                      <td className="px-5 py-3">
                        {session.status === 'Completed' ? (
                          <TherapistBadge variant="success" label="Completed" />
                        ) : session.status === 'In 30 min' ? (
                          <TherapistBadge variant="warning" label="In 30 min" />
                        ) : (
                          <TherapistBadge variant="default" label="Scheduled" />
                        )}
                      </td>
                      <td className="px-5 py-3">
                        {session.status === 'In 30 min' ? (
                          <TherapistButton className="min-h-[36px] px-3 py-1.5 text-xs">
                            <Video className="h-3.5 w-3.5" />
                            Join
                          </TherapistButton>
                        ) : (
                          <TherapistButton variant="secondary" className="min-h-[36px] px-3 py-1.5 text-xs">
                            <FileText className="h-3.5 w-3.5" />
                            {session.status === 'Completed' ? 'Write Notes' : 'Details'}
                          </TherapistButton>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </TherapistCard>

          <TherapistCard className="p-5">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <h3 className="font-display text-base font-bold text-ink-800">Monthly Earnings</h3>
              <div className="inline-flex rounded-lg bg-ink-100 p-0.5">
                <button className="rounded-md bg-white px-3 py-1 text-[11px] font-medium text-ink-800 shadow-soft-xs">6 Months</button>
                <button className="rounded-md px-3 py-1 text-[11px] font-medium text-ink-500">12 Months</button>
              </div>
            </div>
            <div className="h-56">
              <TherapistEarningsChart
                labels={chartData.labels}
                therapistShare={chartData.therapistShare}
                platformShare={chartData.platformShare}
              />
            </div>
            <div className="mt-4 grid grid-cols-1 gap-4 border-t border-ink-100 pt-4 sm:grid-cols-3">
              <div>
                <p className="text-xs text-ink-500">Your Share (60%)</p>
                <p className="font-display text-lg font-bold text-ink-800">₹1,12,400</p>
              </div>
              <div>
                <p className="text-xs text-ink-500">Total Sessions</p>
                <p className="font-display text-lg font-bold text-ink-800">87</p>
              </div>
              <div>
                <p className="text-xs text-ink-500">Avg Per Session</p>
                <p className="font-display text-lg font-bold text-ink-800">₹1,292</p>
              </div>
            </div>
          </TherapistCard>

          <section className="rounded-xl border border-clay-200 bg-clay-50 p-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="flex items-start gap-3">
                <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-clay-100">
                  <AlertTriangle className="h-5 w-5 text-clay-500" />
                </span>
                <div>
                  <h4 className="font-display text-sm font-bold text-clay-500">2 Session Notes Pending</h4>
                  <p className="mt-1 text-xs text-clay-500">
                    Arjun K. (today, 09:00 AM) and Meera P. (yesterday). Please complete documentation within 24 hours.
                  </p>
                </div>
              </div>
              <TherapistButton variant="clay" className="w-full sm:w-auto">
                Write Notes
              </TherapistButton>
            </div>
          </section>
        </div>

        <div className="space-y-6">
          <TherapistCard className="overflow-hidden">
            <div className="border-b border-ink-100 px-5 py-4">
              <h3 className="font-display text-base font-bold text-ink-800">Patient Alerts</h3>
            </div>
            <div className="divide-y divide-ink-100/60">
              {patientAlerts.map((alert) => (
                <div key={alert.id} className="px-5 py-3.5">
                  <p className="text-sm font-medium text-ink-800">{alert.level}</p>
                  <p className="mt-0.5 text-xs text-ink-500">{alert.message}</p>
                  <button className={`mt-1.5 text-xs font-semibold ${alert.tone === 'danger' ? 'text-red-600' : 'text-sage-500'} hover:underline`}>
                    {alert.action} →
                  </button>
                </div>
              ))}
            </div>
          </TherapistCard>

          <TherapistCard className="p-5">
            <h3 className="mb-4 font-display text-base font-bold text-ink-800">Quick Actions</h3>
            <div className="grid grid-cols-2 gap-3">
              <TherapistButton variant="soft" className="min-h-[86px] flex-col gap-1 text-xs">Set Availability</TherapistButton>
              <TherapistButton variant="secondary" className="min-h-[86px] flex-col gap-1 text-xs">New Note</TherapistButton>
              <TherapistButton variant="secondary" className="min-h-[86px] flex-col gap-1 text-xs">Messages</TherapistButton>
              <TherapistButton variant="secondary" className="min-h-[86px] flex-col gap-1 text-xs">Assign Exercise</TherapistButton>
            </div>
          </TherapistCard>

          <TherapistCard className="p-5">
            <h3 className="mb-4 font-display text-base font-bold text-ink-800">This Week's Utilization</h3>
            <div className="mb-4 flex justify-center">
              <TherapistProgressRing value={75} />
            </div>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div>
                <p className="font-display text-sm font-bold text-ink-800">15</p>
                <p className="text-[10px] text-ink-500">Booked</p>
              </div>
              <div>
                <p className="font-display text-sm font-bold text-ink-800">20</p>
                <p className="text-[10px] text-ink-500">Available</p>
              </div>
              <div>
                <p className="font-display text-sm font-bold text-ink-800">5</p>
                <p className="text-[10px] text-ink-500">Open</p>
              </div>
            </div>
          </TherapistCard>

          <TherapistCard className="overflow-hidden">
            <div className="flex items-center justify-between border-b border-ink-100 px-5 py-4">
              <h3 className="font-display text-base font-bold text-ink-800">Messages</h3>
              <TherapistBadge variant="danger" label="5 unread" />
            </div>
            <div className="divide-y divide-ink-100/60">
              {recentMessages.map((message) => (
                <button key={message.id} className="flex w-full items-center gap-3 px-5 py-3.5 text-left hover:bg-surface-bg">
                  <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-sage-50 font-display text-[11px] font-bold text-sage-500">
                    {message.initials}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold text-ink-800">{message.name}</span>
                    <span className="block truncate text-xs text-ink-500">{message.text}</span>
                  </span>
                  <span className="text-[10px] text-ink-500">{message.time}</span>
                </button>
              ))}
            </div>
          </TherapistCard>
        </div>
      </section>
    </div>
  );
}
