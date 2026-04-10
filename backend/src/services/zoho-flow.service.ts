import { prisma } from '../config/db';
import { AppError } from '../middleware/error.middleware';
import { logger } from '../utils/logger';

export type SwipePayload = {
  customer_info: {
    name: string;
    phone: string;
    email: string | null;
  };
  transaction_details: {
    transaction_id: string;
    amount_paid: number;
    payment_mode: string;
    timestamp: string;
  };
  invoice_mapping: {
    swipe_item_id: string;
    quantity: number;
    service_category: string;
  };
};

export type ZohoFlowResponse = {
  success: boolean;
  flowExecutionId?: string;
  error?: string;
};

const MAX_RETRIES = parseInt(process.env.SWIPE_RETRY_MAX_ATTEMPTS || '3', 10);
const RETRY_BACKOFF_MS = parseInt(process.env.SWIPE_RETRY_BACKOFF_MS || '1000', 10);
const ZOHO_WEBHOOK_URL = process.env.ZOHO_FLOW_WEBHOOK_URL;

/**
 * Validates webhook URL is configured
 */
const validateWebhookUrl = (): void => {
  if (!ZOHO_WEBHOOK_URL || !ZOHO_WEBHOOK_URL.trim()) {
    throw new AppError('ZOHO_FLOW_WEBHOOK_URL environment variable is not configured', 500);
  }
};

/**
 * Normalizes phone number to +91XXXXXXXXXX format
 */
const formatPhoneNumber = (phone: string | null | undefined): string | null => {
  if (!phone) return null;

  const cleaned = String(phone || '').replace(/\D/g, '');
  if (cleaned.length === 10) {
    return `+91${cleaned}`;
  }
  if (cleaned.length === 12 && cleaned.startsWith('91')) {
    return `+${cleaned}`;
  }
  if (phone.startsWith('+91')) {
    return phone;
  }
  if (phone.startsWith('91') && phone.length === 12) {
    return `+${phone}`;
  }
  return phone.startsWith('+') ? phone : `+91${cleaned.slice(-10)}`;
};

/**
 * Resolves service type to Swipe item ID from mapping table
 */
export const resolveSwipeItemId = async (serviceId: string): Promise<string> => {
  const mapping = await prisma.swipeItemMapping.findUnique({
    where: { serviceId },
    select: { swipeItemId: true },
  });

  if (!mapping) {
    logger.warn(`[Swipe] Mapping not found for serviceId: ${serviceId}, using placeholder`);
    return `SWP_UNKNOWN_${serviceId}`;
  }

  return mapping.swipeItemId;
};

/**
 * Builds Swipe payload from invoice and payment data
 */
export const buildSwipePayload = async (input: {
  customerName: string;
  customerPhone: string | null;
  customerEmail: string | null;
  invoiceNumber: string;
  amountMinor: number;
  serviceId?: string;
  serviceCategory?: string;
  merchantTransactionId?: string;
  timestamp?: Date;
}): Promise<SwipePayload> => {
  const swipeItemId = input.serviceId ? await resolveSwipeItemId(input.serviceId) : 'SWP_UNKNOWN';
  const formattedPhone = formatPhoneNumber(input.customerPhone) || '+91-UNKNOWN';

  return {
    customer_info: {
      name: String(input.customerName || 'Customer'),
      phone: formattedPhone,
      email: input.customerEmail || null,
    },
    transaction_details: {
      transaction_id: input.invoiceNumber,
      amount_paid: input.amountMinor / 100, // Convert paisa to rupees
      payment_mode: 'PhonePe',
      timestamp: (input.timestamp || new Date()).toISOString(),
    },
    invoice_mapping: {
      swipe_item_id: swipeItemId,
      quantity: 1,
      service_category: input.serviceCategory || 'Clinical',
    },
  };
};

/**
 * Executes exponential backoff retry logic
 */
const delay = (ms: number): Promise<void> => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Sends payload to Zoho Flow webhook with exponential backoff retry
 */
export const sendToZohoFlow = async (
  payload: SwipePayload,
  options?: {
    maxRetries?: number;
    initialBackoffMs?: number;
  },
): Promise<ZohoFlowResponse> => {
  validateWebhookUrl();

  const maxRetries = options?.maxRetries ?? MAX_RETRIES;
  const initialBackoff = options?.initialBackoffMs ?? RETRY_BACKOFF_MS;
  let lastError: Error | null = null;
  let attempt = 0;

  for (attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      logger.info(`[Swipe] Sending payload to Zoho Flow (attempt ${attempt}/${maxRetries})`, {
        invoiceId: payload.transaction_details.transaction_id,
      });

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      const response = await fetch(ZOHO_WEBHOOK_URL!, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      }).finally(() => clearTimeout(timeoutId));

      if (!response.ok) {
        throw new Error(`Zoho Flow returned status ${response.status}: ${response.statusText}`);
      }

      const result = (await response.json()) as unknown;
      logger.info('[Swipe] Zoho Flow webhook succeeded', {
        invoiceId: payload.transaction_details.transaction_id,
      });

      return {
        success: true,
      };
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      logger.warn(`[Swipe] Attempt ${attempt} failed: ${lastError.message}`, {
        invoiceId: payload.transaction_details.transaction_id,
      });

      if (attempt < maxRetries) {
        const backoffMs = initialBackoff * Math.pow(2, attempt - 1);
        logger.info(`[Swipe] Retrying in ${backoffMs}ms...`);
        await delay(backoffMs);
      }
    }
  }

  logger.error('[Swipe] All retry attempts exhausted', {
    invoiceId: payload.transaction_details.transaction_id,
    totalAttempts: maxRetries,
    error: lastError?.message,
  });

  return {
    success: false,
    error: lastError?.message || 'Unknown error',
  };
};

/**
 * Records Zoho Flow invocation in audit trail
 */
export const recordZohoFlowInvocation = async (
  invoiceId: string,
  response: ZohoFlowResponse,
  actorUserId?: string,
): Promise<void> => {
  try {
    await prisma.invoiceEvent.create({
      data: {
        invoiceId,
        eventType: 'ZOHO_FLOW_INVOKED',
        invoiceMethod: 'SWIPE',
        afterState: {
          zohoFlowSuccess: response.success,
          zohoFlowError: response.error || null,
          timestamp: new Date(),
        } as any,
        actorUserId: actorUserId || null,
      },
    });
  } catch (error) {
    logger.error('[Swipe] Failed to record Zoho Flow invocation', {
      invoiceId,
      error: error instanceof Error ? error.message : String(error),
    });
  }
};

/**
 * Main handler: Build payload, send to Zoho Flow, record result
 */
export const triggerSwipeInvoiceGeneration = async (input: {
  invoiceId: string;
  customerName: string;
  customerPhone: string | null;
  customerEmail: string | null;
  invoiceNumber: string;
  amountMinor: number;
  serviceId?: string;
  serviceCategory?: string;
  merchantTransactionId?: string;
  timestamp?: Date;
  actorUserId?: string;
}): Promise<{ success: boolean; error?: string }> => {
  try {
    const payload = await buildSwipePayload({
      customerName: input.customerName,
      customerPhone: input.customerPhone,
      customerEmail: input.customerEmail,
      invoiceNumber: input.invoiceNumber,
      amountMinor: input.amountMinor,
      serviceId: input.serviceId,
      serviceCategory: input.serviceCategory,
      merchantTransactionId: input.merchantTransactionId,
      timestamp: input.timestamp,
    });

    const response = await sendToZohoFlow(payload);
    await recordZohoFlowInvocation(input.invoiceId, response, input.actorUserId);

    if (!response.success) {
      throw new AppError(`Zoho Flow failed: ${response.error}`, 502);
    }

    return { success: true };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error('[Swipe] Invoice generation trigger failed', {
      invoiceId: input.invoiceId,
      error: errorMessage,
    });

    await recordZohoFlowInvocation(
      input.invoiceId,
      { success: false, error: errorMessage },
      input.actorUserId,
    );

    return { success: false, error: errorMessage };
  }
};
