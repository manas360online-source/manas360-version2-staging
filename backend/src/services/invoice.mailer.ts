import nodemailer from 'nodemailer';

export type InvoiceEmailAttachment = {
	filename: string;
	content: Buffer;
	contentType: string;
};

export type SendInvoiceEmailInput = {
	to: string;
	subject: string;
	html: string;
	text: string;
	attachments: InvoiceEmailAttachment[];
};

const getSmtpConfig = () => {
	const host = String(process.env.ZOHO_SMTP_HOST || process.env.SMTP_HOST || 'smtp.zoho.com').trim();
	const port = Number(process.env.ZOHO_SMTP_PORT || process.env.SMTP_PORT || 465);
	const user = String(process.env.ZOHO_SMTP_USER || process.env.SMTP_USER || '').trim();
	const password = String(process.env.ZOHO_SMTP_PASSWORD || process.env.ZOHO_SMTP_PASS || process.env.SMTP_PASSWORD || '').trim();
	const secure = String(process.env.ZOHO_SMTP_SECURE || 'true').toLowerCase() !== 'false';
	const fromName = String(process.env.EMAIL_FROM_NAME || 'MANAS360').trim();
	const fromAddress = String(process.env.EMAIL_FROM_ADDRESS || user || 'noreply@manas360.com').trim();
	const replyTo = String(process.env.EMAIL_REPLY_TO || fromAddress).trim();

	return { host, port, user, password, secure, fromName, fromAddress, replyTo };
};

export const sendInvoiceEmail = async (input: SendInvoiceEmailInput): Promise<void> => {
	const email = String(input.to || '').trim();
	if (!email) {
		return;
	}

	const smtp = getSmtpConfig();
	const transport = nodemailer.createTransport({
		host: smtp.host,
		port: smtp.port,
		secure: smtp.secure,
		auth: smtp.user && smtp.password ? { user: smtp.user, pass: smtp.password } : undefined,
	});

	await transport.sendMail({
		from: `"${smtp.fromName}" <${smtp.fromAddress}>`,
		to: email,
		replyTo: smtp.replyTo,
		subject: input.subject,
		text: input.text,
		html: input.html,
		attachments: input.attachments,
	});
};
