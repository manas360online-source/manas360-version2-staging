import { useEffect, useState } from 'react';
import { patientApi } from '../../api/patient';

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = async () => {
    const response = await patientApi.getNotifications();
    const payload = response.data ?? response;
    setNotifications(payload || []);
  };

  useEffect(() => {
    void load();
  }, []);

  const markAsRead = async (id: string) => {
    await patientApi.markNotificationRead(id);
    await load();
  };

  const respondToProposedSlot = async (item: any, accept: boolean) => {
    const requestRef = String(item?.payload?.requestRef || '');
    const providerId = String(item?.payload?.providerId || '');
    const proposedStartAt = String(item?.payload?.proposedStartAt || '');
    if (!requestRef || !providerId) return;

    try {
      setBusyId(String(item.id));
      await patientApi.confirmProposedAppointmentSlot({
        requestRef,
        providerId,
        proposedStartAt: proposedStartAt || undefined,
        accept,
      });
      await load();
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="mx-auto w-full max-w-[1400px] space-y-6 px-4 md:px-6 pb-20 lg:pb-6">
      <h1 className="text-3xl md:text-4xl font-semibold text-charcoal">Notifications</h1>

      <section className="rounded-2xl border border-calm-sage/15 bg-white/85 p-5 shadow-soft-sm">
        <div className="space-y-2">
          {notifications.length === 0 ? (
            <p className="text-sm text-charcoal/60">No notifications yet.</p>
          ) : (
            notifications.map((item) => (
              <article key={item.id} className="flex flex-wrap items-start justify-between gap-2 rounded-xl border border-calm-sage/15 p-3">
                <div>
                  <p className="text-sm font-semibold">{item.title}</p>
                  <p className="text-xs text-charcoal/60">{item.message}</p>
                  {item.type === 'APPOINTMENT_SLOT_PROPOSED' ? (
                    <div className="mt-2 rounded-lg border border-amber-200 bg-amber-50 p-2 text-[11px] text-amber-900">
                      <p>Payment must be completed at least 12 hours before session start.</p>
                      {item?.payload?.proposedStartAt ? (
                        <p className="mt-1">Proposed slot: {new Date(String(item.payload.proposedStartAt)).toLocaleString()}</p>
                      ) : null}
                    </div>
                  ) : null}
                </div>
                {!item.is_read && item.type === 'APPOINTMENT_SLOT_PROPOSED' ? (
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => void respondToProposedSlot(item, true)}
                      disabled={busyId === item.id}
                      className="inline-flex min-h-[34px] items-center rounded-full bg-charcoal px-3 text-xs text-cream disabled:opacity-60"
                    >
                      {busyId === item.id ? 'Working...' : 'Confirm Slot'}
                    </button>
                    <button
                      type="button"
                      onClick={() => void respondToProposedSlot(item, false)}
                      disabled={busyId === item.id}
                      className="inline-flex min-h-[34px] items-center rounded-full border border-rose-200 px-3 text-xs text-rose-700 disabled:opacity-60"
                    >
                      Decline
                    </button>
                  </div>
                ) : !item.is_read ? (
                  <button
                    type="button"
                    onClick={() => markAsRead(item.id)}
                    className="inline-flex min-h-[34px] items-center rounded-full border border-calm-sage/25 px-3 text-xs"
                  >
                    Mark as read
                  </button>
                ) : (
                  <span className="text-xs text-charcoal/50">Read</span>
                )}
              </article>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
