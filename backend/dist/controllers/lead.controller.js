"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.dispatchPriorityTierLeadNotificationsController = exports.publishInstitutionalEngagementLeadsController = exports.confirmMyTherapistLeadPurchaseController = exports.initiateMyTherapistLeadPurchaseController = exports.purchaseMyTherapistLeadController = exports.getMyTherapistLeadsController = void 0;
const error_middleware_1 = require("../middleware/error.middleware");
const response_1 = require("../utils/response");
const lead_service_1 = require("../services/lead.service");
const b2b_institutional_lead_service_1 = require("../services/b2b-institutional-lead.service");
const getAuthUserId = (req) => {
    const userId = req.auth?.userId;
    if (!userId) {
        throw new error_middleware_1.AppError('Authentication required', 401);
    }
    return userId;
};
const getMyTherapistLeadsController = async (req, res) => {
    const userId = getAuthUserId(req);
    const query = req.validatedTherapistLeadsQuery ?? { page: 1, limit: 10 };
    const leads = await (0, lead_service_1.getMyTherapistLeads)(userId, query);
    (0, response_1.sendSuccess)(res, leads, 'Therapist leads fetched');
};
exports.getMyTherapistLeadsController = getMyTherapistLeadsController;
const purchaseMyTherapistLeadController = async (req, res) => {
    const userId = getAuthUserId(req);
    const leadId = String(req.params.id);
    const result = await (0, lead_service_1.purchaseMyTherapistLead)(userId, leadId);
    (0, response_1.sendSuccess)(res, result, 'Lead purchased successfully');
};
exports.purchaseMyTherapistLeadController = purchaseMyTherapistLeadController;
const initiateMyTherapistLeadPurchaseController = async (req, res) => {
    const userId = getAuthUserId(req);
    const leadId = String(req.params.id);
    const result = await (0, lead_service_1.initiateMyTherapistLeadPurchase)(userId, leadId);
    (0, response_1.sendSuccess)(res, result, 'Lead purchase payment initiated', 201);
};
exports.initiateMyTherapistLeadPurchaseController = initiateMyTherapistLeadPurchaseController;
const confirmMyTherapistLeadPurchaseController = async (req, res) => {
    const userId = getAuthUserId(req);
    const leadId = String(req.params.id);
    const razorpayOrderId = String(req.body.razorpayOrderId ?? '').trim();
    const razorpayPaymentId = String(req.body.razorpayPaymentId ?? '').trim();
    const razorpaySignature = String(req.body.razorpaySignature ?? '').trim();
    if (!razorpayOrderId || !razorpayPaymentId || !razorpaySignature) {
        throw new error_middleware_1.AppError('razorpayOrderId, razorpayPaymentId and razorpaySignature are required', 422);
    }
    const result = await (0, lead_service_1.confirmMyTherapistLeadPurchase)(userId, leadId, {
        razorpayOrderId,
        razorpayPaymentId,
        razorpaySignature,
    });
    (0, response_1.sendSuccess)(res, result, 'Lead purchase confirmed');
};
exports.confirmMyTherapistLeadPurchaseController = confirmMyTherapistLeadPurchaseController;
const publishInstitutionalEngagementLeadsController = async (req, res) => {
    const requestorUserId = getAuthUserId(req);
    const engagementId = String(req.body.engagementId ?? '').trim();
    if (!engagementId) {
        throw new error_middleware_1.AppError('engagementId is required', 422);
    }
    const requiredLanguageProficiencyRaw = req.body.requiredLanguageProficiency
        ? String(req.body.requiredLanguageProficiency).trim().toLowerCase()
        : undefined;
    const requiredLanguageProficiency = requiredLanguageProficiencyRaw === 'native' ||
        requiredLanguageProficiencyRaw === 'professional' ||
        requiredLanguageProficiencyRaw === 'conversational'
        ? requiredLanguageProficiencyRaw
        : undefined;
    const result = await (0, b2b_institutional_lead_service_1.publishInstitutionalEngagementLeads)({
        engagementId,
        requestorUserId,
        requiredCert: req.body.requiredCert ? String(req.body.requiredCert).trim() : null,
        requiredLanguageProficiency,
        languages: Array.isArray(req.body.languages)
            ? req.body.languages.map((item) => String(item).trim()).filter(Boolean)
            : [],
        location: typeof req.body.location?.latitude === 'number' && typeof req.body.location?.longitude === 'number'
            ? {
                latitude: Number(req.body.location.latitude),
                longitude: Number(req.body.location.longitude),
            }
            : null,
        deliveryMode: req.body.deliveryMode ? String(req.body.deliveryMode) : null,
        cityTrafficIndex: typeof req.body.cityTrafficIndex === 'number' || typeof req.body.cityTrafficIndex === 'string'
            ? Number(req.body.cityTrafficIndex)
            : undefined,
        targetStartMinute: typeof req.body.targetStartMinute === 'number' || typeof req.body.targetStartMinute === 'string'
            ? Number(req.body.targetStartMinute)
            : undefined,
        durationMinutes: typeof req.body.durationMinutes === 'number' || typeof req.body.durationMinutes === 'string'
            ? Number(req.body.durationMinutes)
            : undefined,
        requiredLeadCount: typeof req.body.requiredLeadCount === 'number' || typeof req.body.requiredLeadCount === 'string'
            ? Number(req.body.requiredLeadCount)
            : undefined,
        availabilityPrefs: Array.isArray(req.body.availabilityPrefs?.daysOfWeek) && Array.isArray(req.body.availabilityPrefs?.timeSlots)
            ? {
                daysOfWeek: req.body.availabilityPrefs.daysOfWeek.map((day) => Number(day)),
                timeSlots: req.body.availabilityPrefs.timeSlots
                    .map((slot) => ({
                    startMinute: Number(slot?.startMinute),
                    endMinute: Number(slot?.endMinute),
                }))
                    .filter((slot) => Number.isFinite(slot.startMinute) && Number.isFinite(slot.endMinute)),
            }
            : undefined,
        amountMinor: typeof req.body.amountMinor === 'number' || typeof req.body.amountMinor === 'string'
            ? Number(req.body.amountMinor)
            : undefined,
        currency: req.body.currency ? String(req.body.currency).trim() : undefined,
        title: req.body.title ? String(req.body.title).trim() : undefined,
        institutionName: req.body.institutionName ? String(req.body.institutionName).trim() : undefined,
    });
    (0, response_1.sendSuccess)(res, result, 'Institutional leads published', 201);
};
exports.publishInstitutionalEngagementLeadsController = publishInstitutionalEngagementLeadsController;
const dispatchPriorityTierLeadNotificationsController = async (req, res) => {
    getAuthUserId(req);
    const result = await (0, b2b_institutional_lead_service_1.dispatchPriorityTierLeadNotifications)();
    (0, response_1.sendSuccess)(res, result, 'Priority tier notifications dispatched');
};
exports.dispatchPriorityTierLeadNotificationsController = dispatchPriorityTierLeadNotificationsController;
