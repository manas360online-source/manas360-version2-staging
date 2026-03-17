import type { Request, Response } from 'express';
import PDFDocument from 'pdfkit';
import { AppError } from '../middleware/error.middleware';
import { sendSuccess } from '../utils/response';
import { prisma } from '../config/db';
import {
	chatWithAi,
	cancelPatientSubscription,
	completePatientExercise,
	createMoodLog,
	getMoodToday,
	getMoodStats,
	getPatientExercises,
	getPatientInsights,
	getMoodHistory,
	getMyCareTeamProviders,
	getPatientProgressAnalytics,
	getPatientDashboard,
	getPatientInvoiceById,
	getPatientInvoices,
	getLatestJourneyRecommendation,
	getPatientPaymentMethod,
	getPatientReports,
	getCompleteHealthSummaryData,
	createSecureRecordToken,
	resolveClinicalRecord,
	verifySecureRecordToken,
	getPatientSubscription,
	logWellnessLibraryActivity,
	getProviderById,
	getSessionDocumentPayload,
	getSessionDetail,
	getSessionHistory,
	getUpcomingSessions,
	initiateSessionBooking,
	listAvailableProvidersForPatient,
	listNotifications,
	listProviders,
	markNotificationRead,
	requestAppointmentWithPreferredProviders,
	patientConfirmProposedAppointmentSlot,
	therapistProposeAppointmentSlot,
	getPatientSettings,
	updatePatientSettings,
	getPatientSupportCenter,
	createPatientSupportTicket,
	reactivatePatientSubscription,
	setPatientSubscriptionAutoRenew,
	submitAssessment,
	submitPHQ9Assessment,
	updatePatientPaymentMethod,
	updatePatientSubscriptionPlan,
	verifySessionPaymentAndCreateSession,
} from '../services/patient-v1.service';
import {
	completeTreatmentPlanTask,
	getMyTreatmentPlan,
} from '../services/treatment-plan.service';
import {
	getPatientSharedReportDownloadPayload,
	getPatientSharedReportMeta,
} from '../services/patient-shared-report.service';

const renderPdfBuffer = async (write: (doc: any) => void): Promise<Buffer> =>
	new Promise((resolve, reject) => {
		const doc = new PDFDocument({ margin: 48 });
		const chunks: Buffer[] = [];
		doc.on('data', (chunk: Buffer | string) => chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)));
		doc.on('end', () => resolve(Buffer.concat(chunks)));
		doc.on('error', reject);
		write(doc);
		doc.end();
	});

const authUserId = (req: Request): string => {
	const userId = req.auth?.userId;
	if (!userId) throw new AppError('Authentication required', 401);
	return userId;
};

const toTitleFromTemplateType = (templateType: string): string => {
	const normalized = String(templateType || '').trim();
	if (!normalized) return 'Interactive CBT Task';
	return normalized
		.toLowerCase()
		.split('_')
		.map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
		.join(' ');
};

export const getPatientDashboardController = async (req: Request, res: Response): Promise<void> => {
	const data = await getPatientDashboard(authUserId(req));
	sendSuccess(res, data, 'Patient dashboard fetched');
};

export const listProvidersController = async (req: Request, res: Response): Promise<void> => {
	const result = await listProviders({
		specialization: typeof req.query.specialization === 'string' ? req.query.specialization : undefined,
		language: typeof req.query.language === 'string' ? req.query.language : undefined,
		role: typeof req.query.role === 'string' ? req.query.role : undefined,
		minPrice: req.query.minPrice ? Number(req.query.minPrice) : undefined,
		maxPrice: req.query.maxPrice ? Number(req.query.maxPrice) : undefined,
		page: req.query.page ? Number(req.query.page) : 1,
		limit: req.query.limit ? Number(req.query.limit) : 10,
	});
	sendSuccess(res, result, 'Providers fetched');
};

export const listAvailableProvidersController = async (req: Request, res: Response): Promise<void> => {
	const result = await listAvailableProvidersForPatient(authUserId(req), {
		search: typeof req.query.search === 'string' ? req.query.search : undefined,
		specialization: typeof req.query.specialization === 'string' ? req.query.specialization : undefined,
		language: typeof req.query.language === 'string' ? req.query.language : undefined,
		role: typeof req.query.role === 'string' ? req.query.role : undefined,
		minPrice: req.query.minPrice ? Number(req.query.minPrice) : undefined,
		maxPrice: req.query.maxPrice ? Number(req.query.maxPrice) * 100 : undefined,
		page: req.query.page ? Number(req.query.page) : 1,
		limit: req.query.limit ? Number(req.query.limit) : 12,
	});
	sendSuccess(res, result, 'Available providers fetched');
};

export const getPatientInsightsController = async (req: Request, res: Response): Promise<void> => {
	const data = await getPatientInsights(authUserId(req));
	sendSuccess(res, data, 'Patient insights fetched');
};

export const getPatientReportsController = async (req: Request, res: Response): Promise<void> => {
	const data = await getPatientReports(authUserId(req));
	sendSuccess(res, data, 'Patient reports fetched');
};

export const getPatientSharedReportMetaController = async (req: Request, res: Response): Promise<void> => {
	const reportId = String(req.params.id || '').trim();
	if (!reportId) throw new AppError('report id is required', 422);
	const data = await getPatientSharedReportMeta(authUserId(req), reportId);
	sendSuccess(res, data, 'Shared report fetched');
};

export const downloadPatientSharedReportController = async (req: Request, res: Response): Promise<void> => {
	const reportId = String(req.params.id || '').trim();
	if (!reportId) throw new AppError('report id is required', 422);

	const payload = await getPatientSharedReportDownloadPayload(authUserId(req), reportId);
	if (payload.mode === 'redirect') {
		res.redirect(payload.signedUrl);
		return;
	}

	res.setHeader('Content-Type', 'application/pdf');
	res.setHeader('Content-Disposition', `attachment; filename="${payload.fileName}"`);
	res.status(200).send(payload.buffer);
};

export const generateCompleteHealthSummaryController = async (req: Request, res: Response): Promise<void> => {
	const data = await getCompleteHealthSummaryData(authUserId(req));
	const pdf = await renderPdfBuffer((doc) => {
		doc.fontSize(20).font('Helvetica-Bold').text('MANAS360 Complete Health Summary', { align: 'center' });
		doc.moveDown(0.7);
		doc.fontSize(10).font('Helvetica').fillColor('#444').text(`Generated: ${new Date(data.generatedAt).toLocaleString()}`, { align: 'right' });
		doc.fillColor('#000');

		doc.moveDown(0.8);
		doc.fontSize(12).font('Helvetica-Bold').text('Patient Profile');
		doc.fontSize(10).font('Helvetica').text(`Name: ${data.patientName}`);
		doc.text(`Sessions completed (last 30 days): ${data.sessionsCompletedLast30Days}`);

		doc.moveDown(0.8);
		doc.fontSize(12).font('Helvetica-Bold').text('Latest Clinical Scores');
		doc.fontSize(10).font('Helvetica');
		doc.text(data.latestPhq9 ? `PHQ-9: ${data.latestPhq9.totalScore}/27 (${data.latestPhq9.severityLevel})` : 'PHQ-9: Not available');
		doc.text(data.latestGad7 ? `GAD-7: ${data.latestGad7.totalScore}/21 (${data.latestGad7.severityLevel})` : 'GAD-7: Not available');

		doc.moveDown(0.8);
		doc.fontSize(12).font('Helvetica-Bold').text('Active Care Team');
		doc.fontSize(10).font('Helvetica');
		if (Array.isArray(data.careTeam) && data.careTeam.length) {
			for (const provider of data.careTeam.slice(0, 8)) {
				doc.text(`• ${provider.name} (${provider.role || 'Provider'})`);
			}
		} else {
			doc.text('No active care team assignments yet.');
		}

		doc.moveDown(0.8);
		doc.fontSize(12).font('Helvetica-Bold').text('30-Day Mood Trend');
		doc.fontSize(10).font('Helvetica');
		if (Array.isArray(data.recentMoodRows) && data.recentMoodRows.length) {
			for (const row of data.recentMoodRows) {
				const label = new Date(row.date).toLocaleDateString();
				const bars = '█'.repeat(Math.max(1, Math.min(5, Number(row.mood || 0))));
				doc.text(`${label}: ${bars} (${row.mood}/5)`);
			}
		} else {
			doc.text('No mood entries in the last 30 days.');
		}
	});

	res.setHeader('Content-Type', 'application/pdf');
	res.setHeader('Content-Disposition', 'attachment; filename="manas360-complete-health-summary.pdf"');
	res.status(200).send(pdf);
};

export const getPatientRecordSecureUrlController = async (req: Request, res: Response): Promise<void> => {
	const userId = authUserId(req);
	const recordId = String(req.params.id || '').trim();
	if (!recordId) throw new AppError('record id is required', 422);

	await resolveClinicalRecord(userId, recordId);
	const { token, expiresAt } = createSecureRecordToken(userId, recordId, 'view', 60);
	const baseUrl = `${req.protocol}://${req.get('host')}`;
	const secureUrl = `${baseUrl}/api/v1/patient/records/shared/${encodeURIComponent(token)}`;

	sendSuccess(
		res,
		{ recordId, secureUrl, expiresAt, expiresInSeconds: 60 },
		'Secure record URL generated',
	);
};

export const createPatientRecordShareLinkController = async (req: Request, res: Response): Promise<void> => {
	const userId = authUserId(req);
	const recordId = String(req.params.id || '').trim();
	if (!recordId) throw new AppError('record id is required', 422);

	await resolveClinicalRecord(userId, recordId);
	const { token, expiresAt } = createSecureRecordToken(userId, recordId, 'share', 48 * 60 * 60);
	const pin = String(Math.floor(100000 + Math.random() * 900000));
	const baseUrl = `${req.protocol}://${req.get('host')}`;
	const shareUrl = `${baseUrl}/api/v1/patient/records/shared/${encodeURIComponent(token)}?pin=${pin}`;

	sendSuccess(
		res,
		{ recordId, shareUrl, pin, expiresAt, expiresInHours: 48 },
		'Secure share link generated',
	);
};

export const streamSharedPatientRecordController = async (req: Request, res: Response): Promise<void> => {
	const token = String(req.params.token || '').trim();
	if (!token) throw new AppError('token is required', 422);

	const decoded = verifySecureRecordToken(token);
	const record = await resolveClinicalRecord(decoded.userId, decoded.recordId);

	if (record.kind === 'session') {
		const payload = await getSessionDocumentPayload(decoded.userId, record.sessionId);
		const pdf = await renderPdfBuffer((doc) => {
			doc.fontSize(20).font('Helvetica-Bold').text('MANAS360 Session Summary', { align: 'center' });
			doc.moveDown(0.8);
			doc.fontSize(10).font('Helvetica').text(`Session ID: ${payload.sessionId}`);
			doc.text(`Date: ${new Date(payload.scheduledAt).toLocaleString()}`);
			doc.text(`Provider: ${payload.therapist.name}`);
			doc.moveDown(0.6);
			doc.text(payload.notes || 'No therapist notes are available for this session yet.');
		});
		res.setHeader('Content-Type', 'application/pdf');
		res.setHeader('Content-Disposition', `inline; filename="session-${record.sessionId}.pdf"`);
		res.status(200).send(pdf);
		return;
	}

	const pdf = await renderPdfBuffer((doc) => {
		doc.fontSize(20).font('Helvetica-Bold').text('MANAS360 Clinical Assessment Record', { align: 'center' });
		doc.moveDown(0.8);
		doc.fontSize(10).font('Helvetica');
		doc.text(`Assessment: ${record.type}`);
		doc.text(`Score: ${record.totalScore}`);
		doc.text(`Severity: ${record.severityLevel}`);
		doc.text(`Recorded on: ${new Date(record.date).toLocaleString()}`);
	});

	res.setHeader('Content-Type', 'application/pdf');
	res.setHeader('Content-Disposition', `inline; filename="assessment-${record.assessmentId}.pdf"`);
	res.status(200).send(pdf);
};

export const getMyCareTeamController = async (req: Request, res: Response): Promise<void> => {
	const data = await getMyCareTeamProviders(authUserId(req));
	sendSuccess(res, data, 'Care team fetched');
};

export const getProviderByIdController = async (req: Request, res: Response): Promise<void> => {
	const id = String(req.params.id || '').trim();
	if (!id) throw new AppError('provider id is required', 422);
	const provider = await getProviderById(id);
	sendSuccess(res, provider, 'Provider fetched');
};

export const bookSessionController = async (req: Request, res: Response): Promise<void> => {
	const userId = authUserId(req);
	const providerId = String(req.body.providerId || '').trim();
	const scheduledAt = new Date(req.body.scheduledAt);
	if (!providerId) throw new AppError('providerId is required', 422);
	if (Number.isNaN(scheduledAt.getTime())) throw new AppError('scheduledAt must be a valid datetime', 422);

	const result = await initiateSessionBooking(userId, {
		providerId,
		scheduledAt,
		durationMinutes: req.body.durationMinutes ? Number(req.body.durationMinutes) : undefined,
		amountMinor: req.body.amountMinor ? Number(req.body.amountMinor) : undefined,
		providerType: req.body.providerType ? String(req.body.providerType) : undefined,
		preferredTime: req.body.preferredTime !== undefined ? Boolean(req.body.preferredTime) : undefined,
		preferredWindow: req.body.preferredWindow ? String(req.body.preferredWindow) : undefined,
	});

	sendSuccess(res, result, 'Booking initiated', 201);
};

export const verifyPaymentController = async (req: Request, res: Response): Promise<void> => {
	const userId = authUserId(req);
	const razorpay_order_id = String(req.body.razorpay_order_id || '').trim();
	const razorpay_payment_id = String(req.body.razorpay_payment_id || '').trim();
	const razorpay_signature = String(req.body.razorpay_signature || '').trim();
	if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
		throw new AppError('razorpay_order_id, razorpay_payment_id and razorpay_signature are required', 422);
	}
	const result = await verifySessionPaymentAndCreateSession(userId, { razorpay_order_id, razorpay_payment_id, razorpay_signature });
	sendSuccess(res, result, 'Payment verified and session confirmed');
};

export const upcomingSessionsController = async (req: Request, res: Response): Promise<void> => {
	const data = await getUpcomingSessions(authUserId(req));
	sendSuccess(res, data, 'Upcoming sessions fetched');
};

export const sessionHistoryController = async (req: Request, res: Response): Promise<void> => {
	const data = await getSessionHistory(authUserId(req));
	sendSuccess(res, data, 'Session history fetched');
};

export const sessionDetailController = async (req: Request, res: Response): Promise<void> => {
	const sessionId = String(req.params.id || '').trim();
	if (!sessionId) throw new AppError('session id is required', 422);
	const data = await getSessionDetail(authUserId(req), sessionId);
	sendSuccess(res, data, 'Session detail fetched');
};

export const sessionSummaryPdfController = async (req: Request, res: Response): Promise<void> => {
	const sessionId = String(req.params.id || '').trim();
	if (!sessionId) throw new AppError('session id is required', 422);

	const payload = await getSessionDocumentPayload(authUserId(req), sessionId);
	const pdf = await renderPdfBuffer((doc) => {
		doc.fontSize(20).font('Helvetica-Bold').text('MANAS360 Session Summary', { align: 'center' });
		doc.moveDown(0.6);
		doc.fontSize(10).font('Helvetica').fillColor('#444').text(`Generated: ${new Date().toLocaleString()}`, { align: 'right' });
		doc.fillColor('#000');

		doc.moveDown(0.8);
		doc.fontSize(12).font('Helvetica-Bold').text('Session Information');
		doc.fontSize(10).font('Helvetica').text(`Booking Reference: ${payload.bookingReferenceId}`);
		doc.text(`Session ID: ${payload.sessionId}`);
		doc.text(`Date & Time: ${new Date(payload.scheduledAt).toLocaleString()}`);
		doc.text(`Status: ${payload.status}`);
		doc.text(`Duration: ${payload.durationMinutes} minutes`);
		doc.text(`Payment Status: ${payload.paymentStatus}`);

		doc.moveDown(0.8);
		doc.fontSize(12).font('Helvetica-Bold').text('Care Team');
		doc.fontSize(10).font('Helvetica').text(`Patient: ${payload.patient.name}`);
		if (payload.patient.email) doc.text(`Patient Email: ${payload.patient.email}`);
		doc.text(`Provider: ${payload.therapist.name}`);
		doc.text(`Provider Role: ${payload.therapist.role || 'therapist'}`);

		doc.moveDown(0.8);
		doc.fontSize(12).font('Helvetica-Bold').text('Session Notes');
		doc.fontSize(10).font('Helvetica');
		if (payload.notes) {
			doc.text(payload.notes, { width: 500 });
			if (payload.noteUpdatedAt) {
				doc.moveDown(0.5);
				doc.fontSize(9).fillColor('#666').text(`Last updated: ${new Date(payload.noteUpdatedAt).toLocaleString()}`);
				doc.fillColor('#000').fontSize(10);
			}
		} else {
			doc.text('No therapist notes are available for this session yet.');
		}
	});

	const fileName = `session-${payload.bookingReferenceId || payload.sessionId}.pdf`;
	res.setHeader('Content-Type', 'application/pdf');
	res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
	res.status(200).send(pdf);
};

export const sessionInvoicePdfController = async (req: Request, res: Response): Promise<void> => {
	const sessionId = String(req.params.id || '').trim();
	if (!sessionId) throw new AppError('session id is required', 422);

	const payload = await getSessionDocumentPayload(authUserId(req), sessionId);
	if (!['PAID', 'CAPTURED'].includes(payload.paymentStatus)) {
		throw new AppError('Invoice is available only for paid sessions', 409);
	}

	const amount = (payload.sessionFeeMinor / 100).toFixed(2);
	const taxRate = 0.18;
	const subtotal = payload.sessionFeeMinor / 100;
	const tax = subtotal * taxRate;
	const total = subtotal + tax;

	const pdf = await renderPdfBuffer((doc) => {
		doc.fontSize(20).font('Helvetica-Bold').text('MANAS360 Invoice', { align: 'center' });
		doc.moveDown(0.8);
		doc.fontSize(10).font('Helvetica').text(`Invoice No: INV-${payload.bookingReferenceId}`);
		doc.text(`Booking Reference: ${payload.bookingReferenceId}`);
		doc.text(`Session Date: ${new Date(payload.scheduledAt).toLocaleString()}`);
		doc.text(`Issued On: ${new Date().toLocaleDateString()}`);

		doc.moveDown(0.8);
		doc.fontSize(12).font('Helvetica-Bold').text('Billed To');
		doc.fontSize(10).font('Helvetica').text(payload.patient.name);
		if (payload.patient.email) doc.text(payload.patient.email);

		doc.moveDown(0.8);
		doc.fontSize(12).font('Helvetica-Bold').text('Service Details');
		doc.fontSize(10).font('Helvetica').text(`Provider: ${payload.therapist.name}`);
		doc.text(`Therapy Session (${payload.durationMinutes} mins)`);
		doc.text(`Amount: INR ${amount}`);

		doc.moveDown(0.8);
		doc.fontSize(12).font('Helvetica-Bold').text('Payment Breakdown');
		doc.fontSize(10).font('Helvetica').text(`Subtotal: INR ${subtotal.toFixed(2)}`);
		doc.text(`Tax (18%): INR ${tax.toFixed(2)}`);
		doc.font('Helvetica-Bold').text(`Total: INR ${total.toFixed(2)}`);
		doc.font('Helvetica').text(`Payment Status: ${payload.paymentStatus}`);
	});

	const fileName = `invoice-${payload.bookingReferenceId || payload.sessionId}.pdf`;
	res.setHeader('Content-Type', 'application/pdf');
	res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
	res.status(200).send(pdf);
};

export const submitAssessmentController = async (req: Request, res: Response): Promise<void> => {
	const userId = authUserId(req);
	const type = String(req.body.type || '').trim();
	if (!type) throw new AppError('type is required', 422);
	const result = await submitAssessment(userId, {
		type,
		score: req.body.score !== undefined ? Number(req.body.score) : undefined,
		answers: Array.isArray(req.body.answers) ? req.body.answers.map((a: any) => Number(a)) : undefined,
	});
	sendSuccess(res, result, 'Assessment submitted', 201);
};

export const submitPHQ9AssessmentController = async (req: Request, res: Response): Promise<void> => {
	const userId = authUserId(req);
	const answers = req.body?.answers;
	if (!Array.isArray(answers) || answers.length !== 9) {
		throw new AppError('answers must be an array of exactly 9 integers', 422);
	}
	const result = await submitPHQ9Assessment(userId, answers.map(Number));
	sendSuccess(res, result, 'PHQ-9 submitted successfully', 201);
};

export const getJourneyRecommendationController = async (req: Request, res: Response): Promise<void> => {
	const data = await getLatestJourneyRecommendation(authUserId(req));
	sendSuccess(res, data, 'Journey recommendation fetched');
};

export const getMyTreatmentPlanController = async (req: Request, res: Response): Promise<void> => {
	const dayRaw = req.query.day;
	const day = dayRaw !== undefined ? Number(dayRaw) : undefined;
	if (dayRaw !== undefined && (!Number.isInteger(day) || Number(day) <= 0)) {
		throw new AppError('day must be a positive integer', 422);
	}
	const data = await getMyTreatmentPlan(authUserId(req), day);
	sendSuccess(res, data, 'Treatment plan fetched');
};

export const completeTreatmentPlanTaskController = async (req: Request, res: Response): Promise<void> => {
	const id = String(req.params.id || '').trim();
	if (!id) throw new AppError('task id is required', 422);
	const data = await completeTreatmentPlanTask(authUserId(req), id);
	sendSuccess(res, data, 'Treatment plan task completed');
};

export const createMoodController = async (req: Request, res: Response): Promise<void> => {
	const userId = authUserId(req);
	const result = await createMoodLog(userId, {
		mood: Number(req.body.mood),
		note: req.body.note ? String(req.body.note) : undefined,
		intensity: req.body.intensity !== undefined ? Number(req.body.intensity) : undefined,
		tags: Array.isArray(req.body.tags) ? req.body.tags.map((tag: any) => String(tag || '')) : undefined,
		energy: req.body.energy ? String(req.body.energy) : undefined,
		sleepHours: req.body.sleepHours ? String(req.body.sleepHours) : undefined,
	});
	sendSuccess(res, result, 'Mood logged', 201);
};

export const moodHistoryController = async (req: Request, res: Response): Promise<void> => {
	const data = await getMoodHistory(authUserId(req));
	sendSuccess(res, data, 'Mood history fetched');
};

export const aiChatController = async (req: Request, res: Response): Promise<void> => {
	const userId = authUserId(req);
	const result = await chatWithAi(userId, { message: String(req.body.message || '') });
	sendSuccess(res, result, 'AI response generated');
};

export const listNotificationsController = async (req: Request, res: Response): Promise<void> => {
	const data = await listNotifications(authUserId(req));
	sendSuccess(res, data, 'Notifications fetched');
};

export const markNotificationReadController = async (req: Request, res: Response): Promise<void> => {
	const userId = authUserId(req);
	const id = String(req.params.id || '').trim();
	if (!id) throw new AppError('notification id is required', 422);
	const data = await markNotificationRead(userId, id);
	sendSuccess(res, data, 'Notification marked as read');
};

export const requestAppointmentWithPreferredProvidersController = async (req: Request, res: Response): Promise<void> => {
	const userId = authUserId(req);
	const providerIds = Array.isArray(req.body?.providerIds) ? req.body.providerIds.map((id: any) => String(id || '').trim()) : [];
	if (!providerIds.length) {
		throw new AppError('providerIds is required', 422);
	}

	const data = await requestAppointmentWithPreferredProviders(userId, {
		providerIds,
		preferredLanguage: req.body?.preferredLanguage ? String(req.body.preferredLanguage) : undefined,
		preferredTime: req.body?.preferredTime ? String(req.body.preferredTime) : undefined,
		preferredSpecialization: req.body?.preferredSpecialization ? String(req.body.preferredSpecialization) : undefined,
		carePath: req.body?.carePath ? String(req.body.carePath) : undefined,
		urgency: req.body?.urgency ? String(req.body.urgency) : undefined,
		note: req.body?.note ? String(req.body.note) : undefined,
	});

	sendSuccess(res, data, 'Appointment request sent', 201);
};

export const patientConfirmProposedAppointmentSlotController = async (req: Request, res: Response): Promise<void> => {
	const userId = authUserId(req);
	const requestRef = String(req.body?.requestRef || '').trim();
	const providerId = String(req.body?.providerId || '').trim();
	const accept = Boolean(req.body?.accept);
	if (!requestRef || !providerId) {
		throw new AppError('requestRef and providerId are required', 422);
	}

	const data = await patientConfirmProposedAppointmentSlot(userId, {
		requestRef,
		providerId,
		proposedStartAt: req.body?.proposedStartAt ? String(req.body.proposedStartAt) : undefined,
		accept,
	});

	sendSuccess(res, data, 'Appointment slot response recorded');
};

export const therapistProposeAppointmentSlotController = async (req: Request, res: Response): Promise<void> => {
	const userId = authUserId(req);
	const requestRef = String(req.body?.requestRef || '').trim();
	const proposedStartAt = String(req.body?.proposedStartAt || '').trim();
	if (!requestRef || !proposedStartAt) {
		throw new AppError('requestRef and proposedStartAt are required', 422);
	}

	const data = await therapistProposeAppointmentSlot(userId, {
		requestRef,
		proposedStartAt,
		note: req.body?.note ? String(req.body.note) : undefined,
	});

	sendSuccess(res, data, 'Proposed slot sent to patient');
};

export const getPatientSettingsController = async (req: Request, res: Response): Promise<void> => {
	const data = await getPatientSettings(authUserId(req));
	sendSuccess(res, data, 'Patient settings fetched');
};

export const updatePatientSettingsController = async (req: Request, res: Response): Promise<void> => {
	const userId = authUserId(req);
	const settings = req.body?.settings;
	const data = await updatePatientSettings(userId, settings);
	sendSuccess(res, data, 'Patient settings saved');
};

export const getPatientSupportCenterController = async (req: Request, res: Response): Promise<void> => {
	const data = await getPatientSupportCenter(authUserId(req));
	sendSuccess(res, data, 'Support center data fetched');
};

export const createPatientSupportTicketController = async (req: Request, res: Response): Promise<void> => {
	const userId = authUserId(req);
	const data = await createPatientSupportTicket(userId, {
		subject: String(req.body?.subject || ''),
		message: String(req.body?.message || ''),
		category: req.body?.category ? String(req.body.category) : undefined,
		priority: req.body?.priority ? String(req.body.priority) : undefined,
	});
	sendSuccess(res, data, 'Support ticket created', 201);
};

export const getPatientSubscriptionController = async (req: Request, res: Response): Promise<void> => {
	const data = await getPatientSubscription(authUserId(req));
	sendSuccess(res, data, 'Subscription fetched');
};

export const upgradePatientSubscriptionController = async (req: Request, res: Response): Promise<void> => {
	const data = await updatePatientSubscriptionPlan(authUserId(req), 'upgrade');
	sendSuccess(res, data, 'Subscription upgraded');
};

export const downgradePatientSubscriptionController = async (req: Request, res: Response): Promise<void> => {
	const data = await updatePatientSubscriptionPlan(authUserId(req), 'downgrade');
	sendSuccess(res, data, 'Subscription downgraded');
};

export const cancelPatientSubscriptionController = async (req: Request, res: Response): Promise<void> => {
	const data = await cancelPatientSubscription(authUserId(req));
	sendSuccess(res, data, 'Subscription cancelled');
};

export const reactivatePatientSubscriptionController = async (req: Request, res: Response): Promise<void> => {
	const data = await reactivatePatientSubscription(authUserId(req));
	sendSuccess(res, data, 'Subscription reactivated');
};

export const togglePatientSubscriptionAutoRenewController = async (req: Request, res: Response): Promise<void> => {
	const autoRenew = Boolean(req.body.autoRenew);
	const data = await setPatientSubscriptionAutoRenew(authUserId(req), autoRenew);
	sendSuccess(res, data, 'Subscription auto-renew updated');
};

export const getPatientPaymentMethodController = async (req: Request, res: Response): Promise<void> => {
	const data = await getPatientPaymentMethod(authUserId(req));
	sendSuccess(res, data, 'Payment method fetched');
};

export const updatePatientPaymentMethodController = async (req: Request, res: Response): Promise<void> => {
	const payload = {
		cardLast4: String(req.body.cardLast4 || '').trim(),
		cardBrand: String(req.body.cardBrand || '').trim(),
		expiryMonth: Number(req.body.expiryMonth),
		expiryYear: Number(req.body.expiryYear),
	};
	if (!payload.cardLast4 || payload.cardLast4.length !== 4) throw new AppError('cardLast4 must be exactly 4 digits', 422);
	if (!payload.cardBrand) throw new AppError('cardBrand is required', 422);
	if (!Number.isFinite(payload.expiryMonth) || payload.expiryMonth < 1 || payload.expiryMonth > 12) throw new AppError('expiryMonth must be between 1 and 12', 422);
	if (!Number.isFinite(payload.expiryYear) || payload.expiryYear < 2000) throw new AppError('expiryYear is invalid', 422);
	const data = await updatePatientPaymentMethod(authUserId(req), payload);
	sendSuccess(res, data, 'Payment method updated');
};

export const getPatientInvoicesController = async (req: Request, res: Response): Promise<void> => {
	const data = await getPatientInvoices(authUserId(req));
	sendSuccess(res, data, 'Invoices fetched');
};

export const downloadPatientInvoiceController = async (req: Request, res: Response): Promise<void> => {
	const id = String(req.params.id || '').trim();
	if (!id) throw new AppError('invoice id is required', 422);
	const invoice = await getPatientInvoiceById(authUserId(req), id);

	const body = `MANAS360 Invoice\nInvoice ID: ${invoice.id}\nStatus: ${invoice.status}\nAmount: ${Number(invoice.amount || 0)}\nDate: ${new Date(invoice.createdAt).toISOString()}\nURL: ${invoice.invoiceUrl || ''}\n`;
	res.setHeader('Content-Type', 'text/plain; charset=utf-8');
	res.setHeader('Content-Disposition', `attachment; filename="invoice-${invoice.id}.txt"`);
	res.status(200).send(body);
};

export const getPatientMoodController = async (req: Request, res: Response): Promise<void> => {
	const data = await getMoodHistory(authUserId(req));
	sendSuccess(res, data, 'Mood history fetched');
};

export const getPatientMoodTodayController = async (req: Request, res: Response): Promise<void> => {
	const data = await getMoodToday(authUserId(req));
	sendSuccess(res, data, 'Today mood fetched');
};

export const getPatientMoodStatsController = async (req: Request, res: Response): Promise<void> => {
	const data = await getMoodStats(authUserId(req));
	sendSuccess(res, data, 'Mood stats fetched');
};

export const getPatientProgressController = async (req: Request, res: Response): Promise<void> => {
	const data = await getPatientProgressAnalytics(authUserId(req));
	sendSuccess(res, data, 'Patient progress fetched');
};

export const getMyActiveCbtAssignmentsController = async (req: Request, res: Response): Promise<void> => {
	const userId = authUserId(req);
	const cbtModel = (prisma as any).cBTAssignment;
	if (!cbtModel) {
		sendSuccess(res, [], 'Active CBT assignments fetched');
		return;
	}

	const assignments = await cbtModel.findMany({
		where: {
			patientId: userId,
			status: {
				in: ['ASSIGNED', 'IN_PROGRESS'] as any,
			},
		},
		orderBy: { createdAt: 'desc' },
		select: {
			id: true,
			templateType: true,
			status: true,
			createdAt: true,
			content: true,
			provider: {
				select: {
					firstName: true,
					lastName: true,
					name: true,
				},
			},
		},
	});

	const data = assignments.map((assignment) => {
		const content = (assignment.content || {}) as Record<string, unknown>;
		const providerName = `${String(assignment.provider?.firstName || '').trim()} ${String(assignment.provider?.lastName || '').trim()}`.trim()
			|| String(assignment.provider?.name || 'Care Provider');

		return {
			id: assignment.id,
			templateType: String(assignment.templateType),
			title: String(content.title || toTitleFromTemplateType(String(assignment.templateType))),
			description: String(content.description || ''),
			status: String(assignment.status),
			createdAt: assignment.createdAt.toISOString(),
			providerName,
		};
	});

	sendSuccess(res, data, 'Active CBT assignments fetched');
};

export const getMyCbtAssignmentDetailController = async (req: Request, res: Response): Promise<void> => {
	const userId = authUserId(req);
	const assignmentId = String(req.params.assignmentId || '').trim();
	if (!assignmentId) throw new AppError('assignment id is required', 422);
	const cbtModel = (prisma as any).cBTAssignment;
	if (!cbtModel) throw new AppError('CBT assignment not found', 404);

	const assignment = await cbtModel.findFirst({
		where: {
			id: assignmentId,
			patientId: userId,
		},
		select: {
			id: true,
			templateType: true,
			status: true,
			content: true,
			createdAt: true,
			updatedAt: true,
			provider: {
				select: {
					id: true,
					firstName: true,
					lastName: true,
					name: true,
				},
			},
		},
	});

	if (!assignment) throw new AppError('CBT assignment not found', 404);

	const content = (assignment.content || {}) as Record<string, unknown>;
	const providerName = `${String(assignment.provider?.firstName || '').trim()} ${String(assignment.provider?.lastName || '').trim()}`.trim()
		|| String(assignment.provider?.name || 'Care Provider');

	sendSuccess(
		res,
		{
			id: assignment.id,
			templateType: String(assignment.templateType),
			title: String(content.title || toTitleFromTemplateType(String(assignment.templateType))),
			description: String(content.description || ''),
			steps: Array.isArray(content.steps) ? content.steps : [],
			responses: (content.responses || {}) as Record<string, unknown>,
			status: String(assignment.status),
			providerId: String(assignment.provider?.id || ''),
			providerName,
			createdAt: assignment.createdAt.toISOString(),
			updatedAt: assignment.updatedAt.toISOString(),
		},
		'CBT assignment fetched',
	);
};

export const upsertMyCbtAssignmentResponseController = async (req: Request, res: Response): Promise<void> => {
	const userId = authUserId(req);
	const assignmentId = String(req.params.assignmentId || '').trim();
	if (!assignmentId) throw new AppError('assignment id is required', 422);
	const cbtModel = (prisma as any).cBTAssignment;
	if (!cbtModel) throw new AppError('CBT assignment not found', 404);

	const requestedStatus = String(req.body?.status || '').trim().toUpperCase();
	const status = requestedStatus === 'COMPLETED' ? 'COMPLETED' : 'IN_PROGRESS';
	const responses = (req.body?.responses || {}) as Record<string, unknown>;
	const currentStep = req.body?.currentStep !== undefined ? Number(req.body.currentStep) : undefined;

	const existing = await cbtModel.findFirst({
		where: { id: assignmentId, patientId: userId },
		select: { id: true, providerId: true, templateType: true, content: true },
	});

	if (!existing) throw new AppError('CBT assignment not found', 404);

	const previousContent = (existing.content || {}) as Record<string, unknown>;
	const mergedContent = {
		...previousContent,
		responses,
		currentStep: Number.isFinite(currentStep) ? currentStep : previousContent.currentStep,
		lastSavedAt: new Date().toISOString(),
		submittedAt: status === 'COMPLETED' ? new Date().toISOString() : previousContent.submittedAt,
	};

	const updated = await cbtModel.update({
		where: { id: existing.id },
		data: {
			status: status as any,
			content: mergedContent,
		},
		select: {
			id: true,
			status: true,
			updatedAt: true,
			content: true,
			templateType: true,
		},
	});

	if (status === 'COMPLETED') {
		await prisma.notification.create({
			data: {
				userId: existing.providerId,
				type: 'HOMEWORK_SUBMITTED',
				title: 'Patient completed CBT assignment',
				message: `A patient submitted ${toTitleFromTemplateType(String(updated.templateType))}.`,
				payload: {
					event: 'CBT_ASSIGNMENT_COMPLETED',
					assignmentId: updated.id,
					patientId: userId,
				},
				sentAt: new Date(),
			},
		});
	}

	sendSuccess(
		res,
		{
			id: updated.id,
			status: String(updated.status),
			responses: ((updated.content as Record<string, unknown>)?.responses || {}) as Record<string, unknown>,
			updatedAt: updated.updatedAt.toISOString(),
		},
		status === 'COMPLETED' ? 'CBT assignment submitted' : 'CBT assignment saved',
	);
};

export const createPatientMoodController = async (req: Request, res: Response): Promise<void> => {
	const userId = authUserId(req);
	const result = await createMoodLog(userId, {
		mood: Number(req.body.mood),
		note: req.body.note ? String(req.body.note) : undefined,
		intensity: req.body.intensity !== undefined ? Number(req.body.intensity) : undefined,
		tags: Array.isArray(req.body.tags) ? req.body.tags.map((tag: any) => String(tag || '')) : undefined,
		energy: req.body.energy ? String(req.body.energy) : undefined,
		sleepHours: req.body.sleepHours ? String(req.body.sleepHours) : undefined,
	});
	sendSuccess(res, result, 'Mood logged', 201);
};

export const getPatientExercisesController = async (req: Request, res: Response): Promise<void> => {
	const data = await getPatientExercises(authUserId(req));
	sendSuccess(res, data, 'Exercises fetched');
};

export const completePatientExerciseController = async (req: Request, res: Response): Promise<void> => {
	const id = String(req.params.id || '').trim();
	if (!id) throw new AppError('exercise id is required', 422);
	const data = await completePatientExercise(authUserId(req), id);
	sendSuccess(res, data, 'Exercise marked as completed');
};

export const logWellnessLibraryActivityController = async (req: Request, res: Response): Promise<void> => {
	const userId = authUserId(req);
	const data = await logWellnessLibraryActivity(userId, {
		title: String(req.body?.title || ''),
		duration: req.body?.duration !== undefined ? Number(req.body.duration) : undefined,
		category: req.body?.category ? String(req.body.category) : undefined,
		kind: req.body?.kind ? String(req.body.kind) : undefined,
	});
	sendSuccess(res, data, 'Wellness activity logged', 201);
};
