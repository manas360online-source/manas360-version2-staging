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

export const sendExclusiveTierAlerts = async (input: ExclusiveLeadAlertInput): Promise<void> => {
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
	]);

	if (!process.env.SMS_WEBHOOK_URL || !process.env.PUSH_WEBHOOK_URL || !process.env.EMAIL_WEBHOOK_URL) {
		console.info('[b2b-alert-placeholder]', JSON.stringify({ smsPayload, pushPayload, emailPayload }));
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
	if (!process.env.PUSH_WEBHOOK_URL) {
		console.info('[b2b-priority-push-placeholder]', JSON.stringify(payload));
	}
};
