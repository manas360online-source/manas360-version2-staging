type SubscriptionActivationEmailInput = {
	to: string;
	name?: string | null;
	planName: string;
	priceInr: number;
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
