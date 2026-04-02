import { prisma } from '../config/db';

type ExclusiveLeadAlertInput = {
	leadId: string;
	engagementId: string;
	therapistId: string;
	matchScore: number;
	therapistName?: string;
	institutionName?: string;
};

type PriorityPushInput = {
	leadId: string;
	engagementId: string;
	therapistId: string;
	matchScore: number;
	institutionName?: string;
};

const postWebhook = async (url: string | undefined, payload: Record<string, unknown>): Promise<void> => {
	if (!url) {
		return;
	}

	await fetch(url, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify(payload),
	}).catch(() => null);
};

const persistInAppNotification = async (input: {
	userId: string;
	type: string;
	title: string;
	message: string;
	payload: Record<string, unknown>;
}) => {
	await prisma.notification.create({
		data: {
			userId: input.userId,
			type: input.type,
			title: input.title,
			message: input.message,
			payload: input.payload,
			sentAt: new Date(),
		},
	}).catch(() => null);
};

export const sendExclusiveTierAlerts = async (input: ExclusiveLeadAlertInput): Promise<void> => {
	const message = `New exclusive lead match score ${input.matchScore}. Review this lead immediately.`;
	const smsPayload = {
		channel: 'sms',
		template: 'b2b-exclusive-lead',
		therapistId: input.therapistId,
		leadId: input.leadId,
		engagementId: input.engagementId,
		matchScore: input.matchScore,
		institutionName: input.institutionName ?? null,
	};

	const pushPayload = {
		channel: 'push',
		template: 'b2b-exclusive-lead',
		therapistId: input.therapistId,
		leadId: input.leadId,
		engagementId: input.engagementId,
		matchScore: input.matchScore,
	};

	const emailPayload = {
		channel: 'email',
		template: 'b2b-exclusive-lead',
		therapistId: input.therapistId,
		leadId: input.leadId,
		engagementId: input.engagementId,
		matchScore: input.matchScore,
		therapistName: input.therapistName ?? null,
		institutionName: input.institutionName ?? null,
	};

	await Promise.all([
		postWebhook(process.env.SMS_WEBHOOK_URL, smsPayload),
		postWebhook(process.env.PUSH_WEBHOOK_URL, pushPayload),
		postWebhook(process.env.EMAIL_WEBHOOK_URL, emailPayload),
		persistInAppNotification({
			userId: input.therapistId,
			type: 'B2B_EXCLUSIVE_LEAD',
			title: 'Exclusive lead assigned',
			message,
			payload: {
				leadId: input.leadId,
				engagementId: input.engagementId,
				matchScore: input.matchScore,
				therapistName: input.therapistName ?? null,
				institutionName: input.institutionName ?? null,
			},
		}),
	]);

	if (!process.env.SMS_WEBHOOK_URL || !process.env.PUSH_WEBHOOK_URL || !process.env.EMAIL_WEBHOOK_URL) {
		console.info('[b2b-alert-fallback]', JSON.stringify({ smsPayload, pushPayload, emailPayload }));
	}
};

export const sendPriorityTierPush = async (input: PriorityPushInput): Promise<void> => {
	const payload = {
		channel: 'push',
		template: 'b2b-priority-release',
		therapistId: input.therapistId,
		leadId: input.leadId,
		engagementId: input.engagementId,
		matchScore: input.matchScore,
		institutionName: input.institutionName ?? null,
	};

	await postWebhook(process.env.PUSH_WEBHOOK_URL, payload);
	await persistInAppNotification({
		userId: input.therapistId,
		type: 'B2B_PRIORITY_RELEASE',
		title: 'Priority lead released',
		message: `A priority lead is ready with score ${input.matchScore}.`,
		payload: {
			leadId: input.leadId,
			engagementId: input.engagementId,
			matchScore: input.matchScore,
			institutionName: input.institutionName ?? null,
		},
	});
	if (!process.env.PUSH_WEBHOOK_URL) {
		console.info('[b2b-priority-push-fallback]', JSON.stringify(payload));
	}
};
