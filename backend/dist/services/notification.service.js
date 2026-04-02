"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.publishPlaceholderNotificationEvent = void 0;
const db_1 = require("../config/db");
const publishPlaceholderNotificationEvent = async (event) => {
    const envelope = {
        ...event,
        occurredAt: new Date().toISOString(),
    };
    if (event.userId && event.title && event.message) {
        await db_1.prisma.notification.create({
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
exports.publishPlaceholderNotificationEvent = publishPlaceholderNotificationEvent;
