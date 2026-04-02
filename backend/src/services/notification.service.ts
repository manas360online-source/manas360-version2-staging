import { prisma } from '../config/db';

interface NotificationEventEnvelope {
	eventType: string;
	entityType: string;
	entityId: string;
	payload: Record<string, unknown>;
	userId?: string;
	title?: string;
	message?: string;
	occurredAt: string;
}

export const publishPlaceholderNotificationEvent = async (
	event: Omit<NotificationEventEnvelope, 'occurredAt'>,
): Promise<NotificationEventEnvelope> => {
	const envelope: NotificationEventEnvelope = {
		...event,
		occurredAt: new Date().toISOString(),
	};

	if (event.userId && event.title && event.message) {
		await prisma.notification.create({
			data: {
				userId: event.userId,
				type: event.eventType,
				title: event.title,
				message: event.message,
				payload: {
					entityType: event.entityType,
					entityId: event.entityId,
					...(event.payload || {}),
				},
				sentAt: new Date(),
			},
		}).catch(() => null);
	}

	console.info('[notification-event]', JSON.stringify(envelope));

	return envelope;
};
