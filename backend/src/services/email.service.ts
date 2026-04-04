type SubscriptionActivationEmailInput = {
	to: string;
	name?: string | null;
	planName: string;
	priceInr: number;
};

type PlatformAdminInviteEmailInput = {
	to: string;
	name?: string | null;
	role: string;
	loginUrl: string;
	temporaryPassword: string;
};

const buildSubscriptionActivationMessage = (input: SubscriptionActivationEmailInput) => {
	const subject = 'Welcome to MANAS360';
	const greetingName = input.name?.trim() ? input.name.trim() : 'there';
	const text = [
		`Hi ${greetingName},`,
		'',
		'Your subscription is active.',
		'',
		`Plan: ${input.planName}`,
		`Price: ₹${input.priceInr}/month`,
		'',
		'You can now login and start your mental health journey.',
	].join('\n');

	return { subject, text };
};

export const sendSubscriptionActivationEmail = async (input: SubscriptionActivationEmailInput): Promise<void> => {
	const email = String(input.to || '').trim();
	if (!email) {
		return;
	}

	const message = buildSubscriptionActivationMessage(input);
	const webhookUrl = process.env.EMAIL_WEBHOOK_URL;

	if (webhookUrl) {
		await fetch(webhookUrl, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				to: email,
				subject: message.subject,
				text: message.text,
				template: 'subscription-activation',
			}),
		}).catch(() => null);
		return;
	}

	// Fallback for local/dev environments where a real mail transport is not configured.
	console.info('[email-delivery-fallback]', JSON.stringify({ to: email, ...message }));
};

const buildPlatformAdminInviteMessage = (input: PlatformAdminInviteEmailInput) => {
	const subject = String(process.env.ADMIN_INVITE_EMAIL_SUBJECT || 'Your MANAS360 admin invitation').trim();
	const greetingName = input.name?.trim() ? input.name.trim() : 'there';
	const roleLabel = String(input.role || '').trim();
	const text = [
		`Hi ${greetingName},`,
		'',
		'You have been invited to join the MANAS360 admin portal.',
		'',
		`Role: ${roleLabel}`,
		`Login URL: ${input.loginUrl}`,
		`Temporary password: ${input.temporaryPassword}`,
		'',
		'Use the login URL to sign in and change your password after the first login.',
	].join('\n');

	return { subject, text };
};

export const sendPlatformAdminInviteEmail = async (input: PlatformAdminInviteEmailInput): Promise<void> => {
	const email = String(input.to || '').trim();
	if (!email) {
		return;
	}

	const message = buildPlatformAdminInviteMessage(input);
	const emailProvider = String(process.env.EMAIL_PROVIDER || '').trim().toLowerCase();
	const zohoFlowWebhookUrl = String(process.env.ZOHO_FLOW_WEBHOOK_URL || '').trim();
	const webhookUrl = process.env.EMAIL_WEBHOOK_URL;
	const fromName = String(process.env.EMAIL_FROM_NAME || 'MANAS360').trim();
	const fromAddress = String(process.env.EMAIL_FROM_ADDRESS || '').trim();
	const replyTo = String(process.env.EMAIL_REPLY_TO || fromAddress).trim();

	if ((emailProvider === 'zoho' || (!webhookUrl && !!zohoFlowWebhookUrl)) && zohoFlowWebhookUrl) {
		await fetch(zohoFlowWebhookUrl, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				event: 'platform_admin_invite_email',
				timestamp: new Date().toISOString(),
				data: {
					to: email,
					from: fromAddress || undefined,
					fromName,
					replyTo: replyTo || undefined,
					subject: message.subject,
					text: message.text,
					template: 'platform-admin-invite',
				},
			}),
		}).catch(() => null);
		return;
	}

	if (webhookUrl) {
		await fetch(webhookUrl, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				to: email,
				from: fromAddress || undefined,
				fromName,
				replyTo: replyTo || undefined,
				subject: message.subject,
				text: message.text,
				template: 'platform-admin-invite',
			}),
		}).catch(() => null);
		return;
	}

	console.info('[email-delivery-fallback]', JSON.stringify({ to: email, from: fromAddress || null, fromName, replyTo: replyTo || null, ...message }));
};
