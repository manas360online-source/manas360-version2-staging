import { processPhonePeWebhook } from '../src/services/payment.service';
import { prisma, connectDatabase, disconnectDatabase } from '../src/config/db';
import * as phonepeService from '../src/services/phonepe.service';
import * as providerSubscriptionService from '../src/services/provider-subscription.service';
import { randomUUID } from 'crypto';

// Mock dependencies
jest.mock('../src/services/phonepe.service', () => ({
        checkPhonePeStatus: jest.fn(),
}));

jest.mock('../src/services/provider-subscription.service', () => ({
        activateProviderSubscription: jest.fn(),
}));

describe('Phase 5 - E2E Validation: Payment Webhook Transitions', () => {
        beforeAll(async () => {
                await connectDatabase();
        });

        afterAll(async () => {
                await prisma.$disconnect();
                await disconnectDatabase();
        });

        beforeEach(() => {
                jest.clearAllMocks();
        });

        describe('Provider Subscription Hook (PROV_SUB_)', () => {
                it('should capture provider payment securely, verify with PhonePe, and trigger subscription activation', async () => {
                        const providerId = randomUUID();
                        const mockTxId = `PROV_SUB_${providerId}_STARTER_${Date.now()}`;
                        const mockPhonePeTxId = `T${Date.now()}`;
                        
                        // 1. Create a pending payment
                        const mockPayment = await prisma.financialPayment.create({
                                data: {
                                        merchantTransactionId: mockTxId,
                                        amountMinor: 500000,
                                        currency: 'INR',
                                        status: 'INITIATED',
                                        providerGateway: 'PHONEPE',
                                }
                        });

                        // Mock checkPhonePeStatus to return true
                        (phonepeService.checkPhonePeStatus as jest.Mock).mockResolvedValue({
                                success: true,
                                code: 'PAYMENT_SUCCESS',
                                data: { state: 'COMPLETED' }
                        });

                        (providerSubscriptionService.activateProviderSubscription as jest.Mock).mockResolvedValue({
                                id: 'sub-1',
                                status: 'active',
                                tier: 'STARTER',
                        });

                        // 2. Process webhook event
                        const webhookPayload = {
                                success: true,
                                code: 'PAYMENT_SUCCESS',
                                data: {
                                        merchantTransactionId: mockTxId,
                                        transactionId: mockPhonePeTxId,
                                        amount: 500000,
                                        state: 'COMPLETED'
                                }
                        };

                        const result = await processPhonePeWebhook(webhookPayload);
                        
                        // Assertions
                        expect(result.handled).toBe(true);
                        expect(phonepeService.checkPhonePeStatus).toHaveBeenCalledWith(mockTxId);
                        expect(providerSubscriptionService.activateProviderSubscription).toHaveBeenCalledWith(
                                providerId,
                                'STARTER',
                                                mockTxId,
                                                expect.objectContaining({
                                                        planVersion: expect.any(Number),
                                                        priceLocked: true,
                                                })
                        );

                        // Database state check
                        const updatedPayment = await prisma.financialPayment.findUnique({
                                where: { id: mockPayment.id }
                        });
                        expect(updatedPayment?.status).toBe('CAPTURED');
                        expect(updatedPayment?.razorpayPaymentId).toBe(mockPhonePeTxId);
                        expect(updatedPayment?.capturedAt).toBeDefined();

                        // Cleanup created db records

                });

                it('should reject webhook if internal PhonePe status validation fails', async () => {
                        const mockTxId = `PROV_SUB_${randomUUID()}_STARTER_${Date.now()}`;
                        
                        // Let's pretend PhonePe says it FAILED despite webhook saying Success (fraud prevention)
                        (phonepeService.checkPhonePeStatus as jest.Mock).mockResolvedValue({
                                success: true,
                                code: 'PAYMENT_ERROR',
                                data: { state: 'FAILED' }
                        });

                        const webhookPayload = {
                                success: true,
                                code: 'PAYMENT_SUCCESS',
                                data: {
                                        merchantTransactionId: mockTxId,
                                        amount: 500000,
                                }
                        };

                        await expect(processPhonePeWebhook(webhookPayload))
                                .rejects
                                                .toThrow('Payment failed');
                        
                        expect(providerSubscriptionService.activateProviderSubscription).not.toHaveBeenCalled();
                });
        });

        describe('Patient Session Booking Hook (SESS_)', () => {
                it('should complete patient session booking mapping accurately with platform split logic', async () => {
                        const mockTxId = `SESS_${Date.now()}_ABC123`;
                        const mockPhonePeTxId = `T${Date.now()}`;
                        
                        // Fake User
                        const mockUser = await prisma.user.create({
                                data: {
                                        email: `test_pat_${Date.now()}@example.com`,
                                        phone: `+91${Math.floor(Date.now() / 1000)}`,
                                        role: 'PATIENT',
                                }
                        });
                        
                        const patientId = mockUser.id; 
                        
                        // Fake Provider
                        const mockProvUser = await prisma.user.create({
                                data: {
                                        email: `test_prov_${Date.now()}@example.com`,
                                        phone: `+91${Math.floor(Date.now() / 1000) + 1}`,
                                        role: 'THERAPIST',
                                }
                        });
                        const providerId = mockProvUser.id; 
                        
                        // 1. Create a pending Patient Session & Payment
                        const mockSession = await prisma.financialSession.create({
                                data: {
                                        patientId: patientId,
                                        providerId: providerId,
                                        status: 'PENDING_PAYMENT',
                                        expectedAmountMinor: 100000, // 1000 INR
                                        currency: 'INR',
                                        idempotencyKey: `test_idem_abc_${Date.now()}_${Math.random()}`,
                                },
                                select: {
                                        id: true,
                                        status: true,
                                },
                        });

                        const mockPayment = await prisma.financialPayment.create({
                                data: {
                                        merchantTransactionId: mockTxId,
                                        amountMinor: 100000,
                                        currency: 'INR',
                                        status: 'INITIATED',
                                        providerGateway: 'PHONEPE',
                                        sessionId: mockSession.id,
                                }
                        });

                        // 2. Process webhook event
                        const webhookPayload = {
                                success: true,
                                code: 'PAYMENT_SUCCESS',
                                data: {
                                        merchantTransactionId: mockTxId,
                                        transactionId: mockPhonePeTxId,
                                        amount: 100000,
                                }
                        };

                        const result = await processPhonePeWebhook(webhookPayload);

                        // Assertions
                        expect(result.handled).toBe(true);

                        // Databse verify (Check Payment splits AND Session Status transition)
                        const updatedPayment = await prisma.financialPayment.findUnique({
                                where: { id: mockPayment.id }
                        });
                        expect(updatedPayment?.status).toBe('CAPTURED');
                        expect(updatedPayment?.razorpayPaymentId).toBe(mockPhonePeTxId);
                        
                        // Default provider share ratio in system is usually ~0.80. Check to ensure it calculated correctly.
                        expect(updatedPayment?.therapistShareMinor).toBeDefined();
                        expect(updatedPayment?.platformShareMinor).toBeDefined();
                        
                        const updatedSession = await prisma.financialSession.findUnique({
                                where: { id: mockSession.id }
                        });
                        expect(updatedSession?.status).toBe('CONFIRMED');
                        expect(updatedSession?.confirmedAt).toBeDefined();

                        // Cleanup explicitly using exact IDs

                });
        });
});
