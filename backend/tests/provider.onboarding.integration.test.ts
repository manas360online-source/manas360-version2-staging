import request from 'supertest';
import { randomUUID } from 'crypto';
import app from '../src/app';
import { connectDatabase, disconnectDatabase, prisma } from '../src/config/db';
import { createAccessToken } from '../src/utils/jwt';

describe('Provider onboarding and communication integration', () => {
	const runId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
	const providerEmail = `provider-${runId}@test.local`;
	const providerPassword = 'Password@123';
	const patientEmail = `patient-${runId}@test.local`;
	const adminEmail = `admin-${runId}@test.local`;
	const registrationNum = `REG-${runId}`.toUpperCase();

	beforeAll(async () => {
		await connectDatabase();
	});

	afterAll(async () => {
		await prisma.providerDocument.deleteMany({ where: { uploadedBy: { email: providerEmail } } }).catch(() => null);
		await prisma.directMessage.deleteMany({
			where: {
				OR: [
					{ sender: { email: providerEmail } },
					{ sender: { email: patientEmail } },
				],
			},
		}).catch(() => null);
		await prisma.directConversation.deleteMany({
			where: {
				OR: [
					{ patient: { email: patientEmail } },
					{ provider: { email: providerEmail } },
				],
			},
		}).catch(() => null);
		await prisma.careTeamAssignment.deleteMany({
			where: {
				OR: [
					{ patient: { email: patientEmail } },
					{ provider: { email: providerEmail } },
				],
			},
		}).catch(() => null);
		await prisma.therapySession.deleteMany({
			where: {
				OR: [
					{ therapistProfile: { email: providerEmail } },
					{ patientProfile: { user: { email: patientEmail } } },
				],
			},
		}).catch(() => null);
		await prisma.therapistProfile.deleteMany({ where: { OR: [{ contactEmail: providerEmail }, { registrationNum }] } }).catch(() => null);
		await prisma.patientProfile.deleteMany({ where: { user: { email: patientEmail } } }).catch(() => null);
		await prisma.authSession.deleteMany({ where: { user: { email: { in: [providerEmail, patientEmail, adminEmail] } } } }).catch(() => null);
		await prisma.user.deleteMany({ where: { email: { in: [providerEmail, patientEmail, adminEmail] } } }).catch(() => null);
		await disconnectDatabase();
	});

	test('provider can register account, login, onboard, get verified, see patients, and send messages', async () => {
		const registerRes = await request(app)
			.post('/api/v1/auth/register')
			.send({
				email: providerEmail,
				password: providerPassword,
				name: 'Provider Flow',
				role: 'therapist',
			})
			.expect(201);

		expect(registerRes.body.success).toBe(true);
		expect(registerRes.body.data.email).toBe(providerEmail);
		expect(registerRes.body.data.devOtp).toBeTruthy();

		await request(app)
			.post('/api/v1/auth/verify/email-otp')
			.send({ email: providerEmail, otp: registerRes.body.data.devOtp })
			.expect(200);

		const providerAgent = request.agent(app);
		const loginRes = await providerAgent
			.post('/api/v1/auth/login')
			.send({ identifier: providerEmail, password: providerPassword })
			.expect(200);

		expect(loginRes.body.success).toBe(true);
		expect(loginRes.body.data.user.email).toBe(providerEmail);
		expect(loginRes.headers['set-cookie']).toEqual(
			expect.arrayContaining([
				expect.stringContaining('access_token='),
				expect.stringContaining('refresh_token='),
			]),
		);

		const onboardingPayload = {
			displayName: 'Provider Flow',
			registrationType: 'RCI',
			registrationNum,
			yearsExperience: 6,
			highestQual: 'MSc Clinical Psychology',
			specializations: ['CBT', 'Stress Management'],
			languages: ['English', 'Hindi'],
			hourlyRate: 1800,
			bio: 'Experienced provider for anxiety and stress support.',
			documents: [
				{ documentType: 'DEGREE', url: 'https://example.com/degree.pdf' },
				{ documentType: 'ID_PROOF', url: 'https://example.com/id-proof.pdf' },
				{ documentType: 'LICENSE', url: 'https://example.com/license.pdf' },
			],
		};

		const onboardingRes = await providerAgent
			.post('/api/v1/provider/onboarding')
			.send(onboardingPayload)
			.expect(201);

		expect(onboardingRes.body.success).toBe(true);
		expect(onboardingRes.body.data.registrationNum).toBe(registrationNum);
		expect(onboardingRes.body.data.isVerified).toBe(false);

		const duplicateOnboardingRes = await providerAgent
			.post('/api/v1/provider/onboarding')
			.send(onboardingPayload)
			.expect(400);

		expect(duplicateOnboardingRes.body.message).toBe('Onboarding already in progress');

		const providerUser = await prisma.user.findUnique({
			where: { email: providerEmail },
			include: {
				therapistProfile: {
					include: {
						documents: true,
					},
				},
			},
		});
		expect(providerUser).toBeTruthy();
		expect(providerUser?.onboardingStatus).toBe('PENDING');
		expect(providerUser?.therapistProfile?.documents).toHaveLength(3);

		const admin = await prisma.user.create({
			data: {
				email: adminEmail,
				passwordHash: 'irrelevant',
				firstName: 'Admin',
				lastName: 'Verifier',
				name: 'Admin Verifier',
				role: 'ADMIN',
				provider: 'LOCAL',
				emailVerified: true,
			},
		});

		const adminToken = createAccessToken({ sub: admin.id, sessionId: randomUUID(), jti: randomUUID() });

		const verifyRes = await request(app)
			.post(`/api/v1/admin/verify-provider/${providerUser!.id}`)
			.set('Authorization', `Bearer ${adminToken}`)
			.expect(200);

		expect(verifyRes.body.success).toBe(true);
		expect(verifyRes.body.data.isVerified).toBe(true);

		const patientUser = await prisma.user.create({
			data: {
				email: patientEmail,
				passwordHash: 'irrelevant',
				firstName: 'Patient',
				lastName: 'One',
				name: 'Patient One',
				role: 'PATIENT',
				provider: 'LOCAL',
				emailVerified: true,
			},
		});

		await prisma.patientProfile.create({
			data: {
				userId: patientUser.id,
				age: 29,
				gender: 'female',
				medicalHistory: 'Anxiety',
				emergencyContact: {
					name: 'Emergency Contact',
					relation: 'Sibling',
					phone: '+911234567890',
				},
			},
		});

		await prisma.careTeamAssignment.create({
			data: {
				patientId: patientUser.id,
				providerId: providerUser!.id,
				assignedById: admin.id,
				accessScope: { modules: ['messages', 'overview'] },
				status: 'ACTIVE',
			},
		});

		const patientsRes = await providerAgent.get('/api/v1/provider/patients').expect(200);
		expect(patientsRes.body.success).toBe(true);
		expect(Array.isArray(patientsRes.body.data)).toBe(true);
		expect(patientsRes.body.data).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					id: patientUser.id,
					name: 'Patient One',
					email: patientEmail,
				}),
			]),
		);

		const sendMessageRes = await providerAgent
			.post('/api/v1/provider/messages')
			.send({ patientId: patientUser.id, content: 'Hello, I am available to support you this week.' })
			.expect(201);

		expect(sendMessageRes.body.success).toBe(true);
		expect(sendMessageRes.body.data.content).toBe('Hello, I am available to support you this week.');

		const conversationsRes = await providerAgent.get('/api/v1/provider/messages/conversations').expect(200);
		expect(conversationsRes.body.success).toBe(true);
		expect(conversationsRes.body.data).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					patientId: patientUser.id,
					patientName: 'Patient One',
					hasMessageHistory: true,
				}),
			]),
		);

		const conversationId = conversationsRes.body.data[0].id;
		const messagesRes = await providerAgent.get(`/api/v1/provider/messages/${conversationId}`).expect(200);
		expect(messagesRes.body.success).toBe(true);
		expect(messagesRes.body.data).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					role: 'provider',
					content: 'Hello, I am available to support you this week.',
				}),
			]),
		);
	}, 30000);
});