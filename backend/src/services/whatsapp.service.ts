/**
 * WhatsApp messaging service via Watti as the mediator.
 * Watti handles delivery to WhatsApp Business API.
 * Messages are templated and sent through Zoho Flow webhook.
 */

export type WhatsAppTemplateType =
	| 'user_welcome' // Patient/user registration
	| 'provider_welcome' // Therapist/Psychiatrist/Psychologist/Coach registration
	| 'user_otp_login' // OTP for phone-based login
	| 'booking_confirmed' // Appointment confirmed
	| 'booking_reminder_24h' // 24-hour booking reminder
	| 'booking_reminder_2h' // 2-hour booking reminder
	| 'session_followup' // Post-session follow-up
	| 'payment_success' // Payment succeeded
	| 'payment_failed' // Payment failed
	| 'subscription_expiry_7d' // 7 days until subscription expires
	| 'subscription_expiry_1d' // 1 day until subscription expires
	| 'subscription_renewed' // Subscription renewed
	| 'refund_processed' // Refund issued
	| 'clinical_results_ready' // Assessment results available
	| 'treatment_plan_updated' // Treatment plan updated
	| 'report_uploaded' // Report/assessment shared with patient
	| 'prescription_issued' // Prescription issued by therapist/psychiatrist
	| 'therapist_note_shared' // Therapist shared notes/documents
	| 'therapist_message' // Direct message/communication from therapist
	| 'clinical_notes_updated'; // Clinical notes updated/modified

export type WhatsAppUserType = 'patient' | 'therapist' | 'psychiatrist' | 'psychologist' | 'coach' | 'user';

interface WhatsAppMessageInput {
	phoneNumber: string; // E.164 format: +919876543210
	templateType: WhatsAppTemplateType;
	userType: WhatsAppUserType;
	templateVariables?: Record<string, string>; // Variables to substitute in template
	language?: string; // Language code, default 'en'
}

interface WhatsAppZohoFlowPayload {
	event: string;
	timestamp: string;
	source: string;
	data: {
		phoneNumber: string;
		templateName: string;
		templateType: string;
		userType: string;
		variables?: Record<string, string>;
		language: string;
	};
}

/**
 * WhatsApp template definitions for each user type.
 * Templates are registered in Watti and referenced by templateName.
 */
const whatsappTemplates: Record<WhatsAppTemplateType, Record<WhatsAppUserType, { templateName: string; description: string }>> = {
	user_welcome: {
		patient: { templateName: 'user_welcome_patient', description: 'Welcome message for registered patient' },
		therapist: { templateName: 'user_welcome_therapist', description: 'Welcome message for registered therapist' },
		psychiatrist: { templateName: 'user_welcome_psychiatrist', description: 'Welcome message for registered psychiatrist' },
		psychologist: { templateName: 'user_welcome_psychologist', description: 'Welcome message for registered psychologist' },
		coach: { templateName: 'user_welcome_coach', description: 'Welcome message for registered coach' },
		user: { templateName: 'user_welcome_generic', description: 'Generic welcome message' },
	},
	provider_welcome: {
		patient: { templateName: 'provider_welcome_user', description: 'Provider registration (shown to patients)' },
		therapist: { templateName: 'provider_welcome_therapist', description: 'Therapist registration confirmation' },
		psychiatrist: { templateName: 'provider_welcome_psychiatrist', description: 'Psychiatrist registration confirmation' },
		psychologist: { templateName: 'provider_welcome_psychologist', description: 'Psychologist registration confirmation' },
		coach: { templateName: 'provider_welcome_coach', description: 'Coach registration confirmation' },
		user: { templateName: 'provider_welcome_generic', description: 'Generic provider registration' },
	},
	user_otp_login: {
		patient: { templateName: 'otp_login', description: 'OTP for login - single template for all user types' },
		therapist: { templateName: 'otp_login', description: 'OTP for login - single template for all user types' },
		psychiatrist: { templateName: 'otp_login', description: 'OTP for login - single template for all user types' },
		psychologist: { templateName: 'otp_login', description: 'OTP for login - single template for all user types' },
		coach: { templateName: 'otp_login', description: 'OTP for login - single template for all user types' },
		user: { templateName: 'otp_login', description: 'OTP for login - single template for all user types' },
	},
	booking_confirmed: {
		patient: { templateName: 'booking_confirmed_patient', description: 'Booking confirmation for patient' },
		therapist: { templateName: 'booking_confirmed_provider', description: 'Booking notification for provider' },
		psychiatrist: { templateName: 'booking_confirmed_provider', description: 'Booking notification for provider' },
		psychologist: { templateName: 'booking_confirmed_provider', description: 'Booking notification for provider' },
		coach: { templateName: 'booking_confirmed_provider', description: 'Booking notification for provider' },
		user: { templateName: 'booking_confirmed_generic', description: 'Generic booking confirmation' },
	},
	booking_reminder_24h: {
		patient: { templateName: 'booking_reminder_24h', description: '24-hour reminder before appointment' },
		therapist: { templateName: 'booking_reminder_24h', description: '24-hour reminder before appointment' },
		psychiatrist: { templateName: 'booking_reminder_24h', description: '24-hour reminder before appointment' },
		psychologist: { templateName: 'booking_reminder_24h', description: '24-hour reminder before appointment' },
		coach: { templateName: 'booking_reminder_24h', description: '24-hour reminder before appointment' },
		user: { templateName: 'booking_reminder_24h', description: '24-hour reminder before appointment' },
	},
	booking_reminder_2h: {
		patient: { templateName: 'booking_reminder_2h', description: '2-hour reminder before appointment' },
		therapist: { templateName: 'booking_reminder_2h', description: '2-hour reminder before appointment' },
		psychiatrist: { templateName: 'booking_reminder_2h', description: '2-hour reminder before appointment' },
		psychologist: { templateName: 'booking_reminder_2h', description: '2-hour reminder before appointment' },
		coach: { templateName: 'booking_reminder_2h', description: '2-hour reminder before appointment' },
		user: { templateName: 'booking_reminder_2h', description: '2-hour reminder before appointment' },
	},
	session_followup: {
		patient: { templateName: 'session_followup', description: 'Post-session follow-up message' },
		therapist: { templateName: 'session_followup', description: 'Post-session follow-up message' },
		psychiatrist: { templateName: 'session_followup', description: 'Post-session follow-up message' },
		psychologist: { templateName: 'session_followup', description: 'Post-session follow-up message' },
		coach: { templateName: 'session_followup', description: 'Post-session follow-up message' },
		user: { templateName: 'session_followup', description: 'Post-session follow-up message' },
	},
	payment_success: {
		patient: { templateName: 'payment_success', description: 'Payment success confirmation' },
		therapist: { templateName: 'payment_success', description: 'Payment success confirmation' },
		psychiatrist: { templateName: 'payment_success', description: 'Payment success confirmation' },
		psychologist: { templateName: 'payment_success', description: 'Payment success confirmation' },
		coach: { templateName: 'payment_success', description: 'Payment success confirmation' },
		user: { templateName: 'payment_success', description: 'Payment success confirmation' },
	},
	payment_failed: {
		patient: { templateName: 'payment_failed_user', description: 'Payment failed - action required' },
		therapist: { templateName: 'payment_failed_provider', description: 'Payment failed - action required' },
		psychiatrist: { templateName: 'payment_failed_provider', description: 'Payment failed - action required' },
		psychologist: { templateName: 'payment_failed_provider', description: 'Payment failed - action required' },
		coach: { templateName: 'payment_failed_provider', description: 'Payment failed - action required' },
		user: { templateName: 'payment_failed_generic', description: 'Payment failed - action required' },
	},
	subscription_expiry_7d: {
		patient: { templateName: 'subscription_expiry_7d', description: 'Subscription expiring in 7 days' },
		therapist: { templateName: 'subscription_expiry_7d', description: 'Subscription expiring in 7 days' },
		psychiatrist: { templateName: 'subscription_expiry_7d', description: 'Subscription expiring in 7 days' },
		psychologist: { templateName: 'subscription_expiry_7d', description: 'Subscription expiring in 7 days' },
		coach: { templateName: 'subscription_expiry_7d', description: 'Subscription expiring in 7 days' },
		user: { templateName: 'subscription_expiry_7d', description: 'Subscription expiring in 7 days' },
	},
	subscription_expiry_1d: {
		patient: { templateName: 'subscription_expiry_1d', description: 'Subscription expires tomorrow' },
		therapist: { templateName: 'subscription_expiry_1d', description: 'Subscription expires tomorrow' },
		psychiatrist: { templateName: 'subscription_expiry_1d', description: 'Subscription expires tomorrow' },
		psychologist: { templateName: 'subscription_expiry_1d', description: 'Subscription expires tomorrow' },
		coach: { templateName: 'subscription_expiry_1d', description: 'Subscription expires tomorrow' },
		user: { templateName: 'subscription_expiry_1d', description: 'Subscription expires tomorrow' },
	},
	subscription_renewed: {
		patient: { templateName: 'subscription_renewed', description: 'Subscription renewed successfully' },
		therapist: { templateName: 'subscription_renewed', description: 'Subscription renewed successfully' },
		psychiatrist: { templateName: 'subscription_renewed', description: 'Subscription renewed successfully' },
		psychologist: { templateName: 'subscription_renewed', description: 'Subscription renewed successfully' },
		coach: { templateName: 'subscription_renewed', description: 'Subscription renewed successfully' },
		user: { templateName: 'subscription_renewed', description: 'Subscription renewed successfully' },
	},
	refund_processed: {
		patient: { templateName: 'refund_processed', description: 'Refund has been processed' },
		therapist: { templateName: 'refund_processed', description: 'Refund has been processed' },
		psychiatrist: { templateName: 'refund_processed', description: 'Refund has been processed' },
		psychologist: { templateName: 'refund_processed', description: 'Refund has been processed' },
		coach: { templateName: 'refund_processed', description: 'Refund has been processed' },
		user: { templateName: 'refund_processed', description: 'Refund has been processed' },
	},
	clinical_results_ready: {
		patient: { templateName: 'clinical_results_ready', description: 'Your assessment results are ready' },
		therapist: { templateName: 'clinical_results_ready', description: 'Clinical results ready' },
		psychiatrist: { templateName: 'clinical_results_ready', description: 'Clinical results ready' },
		psychologist: { templateName: 'clinical_results_ready', description: 'Clinical results ready' },
		coach: { templateName: 'clinical_results_ready', description: 'Clinical results ready' },
		user: { templateName: 'clinical_results_ready', description: 'Clinical results ready' },
	},
	treatment_plan_updated: {
		patient: { templateName: 'treatment_plan_updated', description: 'Your treatment plan has been updated' },
		therapist: { templateName: 'treatment_plan_updated', description: 'Treatment plan updated' },
		psychiatrist: { templateName: 'treatment_plan_updated', description: 'Treatment plan updated' },
		psychologist: { templateName: 'treatment_plan_updated', description: 'Treatment plan updated' },
		coach: { templateName: 'treatment_plan_updated', description: 'Treatment plan updated' },
		user: { templateName: 'treatment_plan_updated', description: 'Treatment plan updated' },
	},
	report_uploaded: {
		patient: { templateName: 'report_uploaded_patient', description: 'Report/assessment shared with you' },
		therapist: { templateName: 'report_uploaded_shared', description: 'Report uploaded for sharing' },
		psychiatrist: { templateName: 'report_uploaded_shared', description: 'Report uploaded for sharing' },
		psychologist: { templateName: 'report_uploaded_shared', description: 'Report uploaded for sharing' },
		coach: { templateName: 'report_uploaded_shared', description: 'Report uploaded for sharing' },
		user: { templateName: 'report_uploaded_generic', description: 'Report uploaded' },
	},
	prescription_issued: {
		patient: { templateName: 'prescription_issued_patient', description: 'Prescription issued for you' },
		therapist: { templateName: 'prescription_issued_provider', description: 'Prescription issued' },
		psychiatrist: { templateName: 'prescription_issued_provider', description: 'Prescription issued' },
		psychologist: { templateName: 'prescription_issued_provider', description: 'Prescription issued' },
		coach: { templateName: 'prescription_issued_provider', description: 'Prescription issued' },
		user: { templateName: 'prescription_issued_generic', description: 'Prescription issued' },
	},
	therapist_note_shared: {
		patient: { templateName: 'therapist_note_shared_patient', description: 'Therapist shared notes/documents' },
		therapist: { templateName: 'therapist_note_shared_provider', description: 'Notes shared with patient' },
		psychiatrist: { templateName: 'therapist_note_shared_provider', description: 'Notes shared with patient' },
		psychologist: { templateName: 'therapist_note_shared_provider', description: 'Notes shared with patient' },
		coach: { templateName: 'therapist_note_shared_provider', description: 'Notes shared with patient' },
		user: { templateName: 'therapist_note_shared_generic', description: 'Notes shared' },
	},
	therapist_message: {
		patient: { templateName: 'therapist_message_patient', description: 'Direct message from therapist' },
		therapist: { templateName: 'therapist_message_provider', description: 'Message sent to patient' },
		psychiatrist: { templateName: 'therapist_message_provider', description: 'Message sent to patient' },
		psychologist: { templateName: 'therapist_message_provider', description: 'Message sent to patient' },
		coach: { templateName: 'therapist_message_provider', description: 'Message sent to patient' },
		user: { templateName: 'therapist_message_generic', description: 'Message received' },
	},
	clinical_notes_updated: {
		patient: { templateName: 'clinical_notes_updated_patient', description: 'Clinical notes updated' },
		therapist: { templateName: 'clinical_notes_updated_provider', description: 'Clinical notes updated' },
		psychiatrist: { templateName: 'clinical_notes_updated_provider', description: 'Clinical notes updated' },
		psychologist: { templateName: 'clinical_notes_updated_provider', description: 'Clinical notes updated' },
		coach: { templateName: 'clinical_notes_updated_provider', description: 'Clinical notes updated' },
		user: { templateName: 'clinical_notes_updated_generic', description: 'Clinical notes updated' },
	},
};

export const sendWhatsAppMessage = async (input: WhatsAppMessageInput): Promise<void> => {
	const zohoFlowWebhookUrl = String(process.env.ZOHO_FLOW_WEBHOOK_URL || '').trim();
	if (!zohoFlowWebhookUrl) {
		console.warn('[WhatsApp] ZOHO_FLOW_WEBHOOK_URL not configured; skipping WhatsApp message');
		return;
	}

	// Validate phone number
	const phone = String(input.phoneNumber || '').trim();
	if (!phone.startsWith('+')) {
		console.warn('[WhatsApp] Invalid phone number format (must be E.164 +country code):', phone);
		return;
	}

	// Get template definition
	const templateDef = whatsappTemplates[input.templateType]?.[input.userType];
	if (!templateDef) {
		console.warn(`[WhatsApp] No template definition for ${input.templateType} / ${input.userType}`);
		return;
	}

	// Build Zoho Flow payload
	const payload: WhatsAppZohoFlowPayload = {
		event: 'whatsapp_message_send',
		timestamp: new Date().toISOString(),
		source: 'MANAS360',
		data: {
			phoneNumber: phone,
			templateName: templateDef.templateName,
			templateType: input.templateType,
			userType: input.userType,
			variables: input.templateVariables || {},
			language: input.language || 'en',
		},
	};

	try {
		await fetch(zohoFlowWebhookUrl, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(payload),
		}).catch(() => null);
	} catch (err) {
		console.error('[WhatsApp] Error sending message to Zoho Flow:', err);
	}
};

/**
 * Get all available templates for reference
 */
export const getWhatsAppTemplates = () => whatsappTemplates;

/**
 * Get templates for a specific user type
 */
export const getTemplatesForUserType = (userType: WhatsAppUserType) => {
	const templates: Record<string, { templateName: string; description: string }> = {};
	Object.entries(whatsappTemplates).forEach(([templateType, userTypeMap]) => {
		templates[templateType] = userTypeMap[userType]!;
	});
	return templates;
};
