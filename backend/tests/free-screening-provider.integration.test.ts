/**
 * Integration tests for provider extra-question isolation and visibility.
 *
 * Scenarios covered:
 *  1. Provider A creates questions → only visible in Provider A's own list.
 *  2. Provider B creates questions → only visible in Provider B's own list.
 *  3. Provider A cannot see Provider B's questions (and vice-versa).
 *  4. Provider A can assign a question to Patient A (on their care team).
 *  5. Provider A cannot assign to Patient B (not on their care team).
 *  6. Patient A sees their assigned question; Patient B sees nothing.
 *  7. Admin sees all provider questions across providers (with proper counts).
 *  8. Admin can create a public template question visible through the free-screening flow.
 */

import request from 'supertest';
import { randomUUID } from 'crypto';
import app from '../src/app';
import { connectDatabase, disconnectDatabase, prisma } from '../src/config/db';
import { createAccessToken } from '../src/utils/jwt';

// ─── shared IDs ─────────────────────────────────────────────────────────────

let adminUserId = '';
let providerAUserId = '';
let providerBUserId = '';
let patientAUserId = '';
let patientBUserId = '';
let patientAProfileId = '';
let patientBProfileId = '';

// tokens
let adminToken = '';
let providerAToken = '';
let providerBToken = '';
let patientAToken = '';
let patientBToken = '';

// created question IDs
let providerAQuestionId = '';
let providerBQuestionId = '';

// assignment IDs
let assignmentAId = '';

// ─── helpers ─────────────────────────────────────────────────────────────────

const token = (userId: string) => {
	return createAccessToken({ sub: userId, sessionId: randomUUID(), jti: randomUUID() });
};

// ─── lifecycle ───────────────────────────────────────────────────────────────

beforeAll(async () => {
	await connectDatabase();

	const unique = Date.now();

	const [admin, providerA, providerB, patientA, patientB] = await Promise.all([
		prisma.user.create({
			data: {
				email: `prov-test-admin-${unique}@test.local`,
				firstName: 'Admin',
				lastName: 'Test',
				name: 'Admin Test',
				role: 'ADMIN',
				provider: 'LOCAL',
				emailVerified: true,
				passwordHash: 'irrelevant',
			},
		}),
		prisma.user.create({
			data: {
				email: `prov-test-provA-${unique}@test.local`,
				firstName: 'Provider',
				lastName: 'Alpha',
				name: 'Provider Alpha',
				role: 'THERAPIST',
				provider: 'LOCAL',
				emailVerified: true,
				passwordHash: 'irrelevant',
			},
		}),
		prisma.user.create({
			data: {
				email: `prov-test-provB-${unique}@test.local`,
				firstName: 'Provider',
				lastName: 'Beta',
				name: 'Provider Beta',
				role: 'THERAPIST',
				provider: 'LOCAL',
				emailVerified: true,
				passwordHash: 'irrelevant',
			},
		}),
		prisma.user.create({
			data: {
				email: `prov-test-patA-${unique}@test.local`,
				firstName: 'Patient',
				lastName: 'Alpha',
				name: 'Patient Alpha',
				role: 'PATIENT',
				provider: 'LOCAL',
				emailVerified: true,
				passwordHash: 'irrelevant',
			},
		}),
		prisma.user.create({
			data: {
				email: `prov-test-patB-${unique}@test.local`,
				firstName: 'Patient',
				lastName: 'Beta',
				name: 'Patient Beta',
				role: 'PATIENT',
				provider: 'LOCAL',
				emailVerified: true,
				passwordHash: 'irrelevant',
			},
		}),
	]);

	adminUserId = admin.id;
	providerAUserId = providerA.id;
	providerBUserId = providerB.id;
	patientAUserId = patientA.id;
	patientBUserId = patientB.id;

	// create patient profiles
	const [profileA, profileB] = await Promise.all([
		prisma.patientProfile.create({
			data: {
				userId: patientAUserId,
				age: 28,
				gender: 'female',
				emergencyContact: { name: 'EC-A', relationship: 'Parent', phone: '+910000000001' },
			},
		}),
		prisma.patientProfile.create({
			data: {
				userId: patientBUserId,
				age: 31,
				gender: 'male',
				emergencyContact: { name: 'EC-B', relationship: 'Sibling', phone: '+910000000002' },
			},
		}),
	]);
	patientAProfileId = profileA.id;
	patientBProfileId = profileB.id;

	// care-team: Provider A → Patient A only; Provider B → Patient B only
	await Promise.all([
		(prisma as any).careTeamAssignment.create({
			data: {
				patientId: patientAUserId,
				providerId: providerAUserId,
				accessScope: {},
				status: 'ACTIVE',
			},
		}),
		(prisma as any).careTeamAssignment.create({
			data: {
				patientId: patientBUserId,
				providerId: providerBUserId,
				accessScope: {},
				status: 'ACTIVE',
			},
		}),
	]);

	// mint tokens
	adminToken = token(adminUserId);
	providerAToken = token(providerAUserId);
	providerBToken = token(providerBUserId);
	patientAToken = token(patientAUserId);
	patientBToken = token(patientBUserId);
}, 30000);

afterAll(async () => {
	// cleanup in dependency order
	const db = prisma as any;
	await db.providerQuestionAssignment.deleteMany({ where: { patientId: { in: [patientAProfileId, patientBProfileId] } } }).catch(() => null);
	await db.providerExtraQuestionOption.deleteMany({
		where: { question: { providerId: { in: [providerAUserId, providerBUserId] } } },
	}).catch(() => null);
	await db.providerExtraQuestion.deleteMany({ where: { providerId: { in: [providerAUserId, providerBUserId] } } }).catch(() => null);
	await db.careTeamAssignment.deleteMany({ where: { providerId: { in: [providerAUserId, providerBUserId] } } }).catch(() => null);
	await prisma.patientProfile.deleteMany({ where: { id: { in: [patientAProfileId, patientBProfileId] } } }).catch(() => null);
	await prisma.user.deleteMany({
		where: { id: { in: [adminUserId, providerAUserId, providerBUserId, patientAUserId, patientBUserId] } },
	}).catch(() => null);
	await disconnectDatabase();
}, 30000);

// ─── tests ───────────────────────────────────────────────────────────────────

describe('Provider extra-question isolation', () => {
	// ── creation ──────────────────────────────────────────────────────────────

	it('Provider A creates an extra question', async () => {
		const res = await request(app)
			.post('/api/v1/therapist/me/free-screening/questions')
			.set('Authorization', `Bearer ${providerAToken}`)
			.send({
				prompt: 'How many hours of sleep do you get?',
				sectionKey: 'sleep',
				isRequired: true,
				status: 'ACTIVE',
				options: [
					{ label: 'Less than 4 hours', optionIndex: 0, points: 3 },
					{ label: '4–6 hours', optionIndex: 1, points: 2 },
					{ label: '6–8 hours', optionIndex: 2, points: 1 },
					{ label: 'More than 8 hours', optionIndex: 3, points: 0 },
				],
			});

		expect(res.status).toBe(201);
		expect(res.body.success).toBe(true);
		expect(res.body.data.prompt).toBe('How many hours of sleep do you get?');
		expect(res.body.data.options).toHaveLength(4);
		providerAQuestionId = res.body.data.id;
	}, 15000);

	it('Provider B creates an extra question', async () => {
		const res = await request(app)
			.post('/api/v1/therapist/me/free-screening/questions')
			.set('Authorization', `Bearer ${providerBToken}`)
			.send({
				prompt: 'How often do you exercise per week?',
				sectionKey: 'fitness',
				isRequired: false,
				status: 'ACTIVE',
				options: [
					{ label: 'Never', optionIndex: 0, points: 3 },
					{ label: '1–2 times', optionIndex: 1, points: 2 },
					{ label: '3–4 times', optionIndex: 2, points: 1 },
					{ label: 'Daily', optionIndex: 3, points: 0 },
				],
			});

		expect(res.status).toBe(201);
		expect(res.body.success).toBe(true);
		expect(res.body.data.prompt).toBe('How often do you exercise per week?');
		providerBQuestionId = res.body.data.id;
	}, 15000);

	// ── provider isolation ────────────────────────────────────────────────────

	it('Provider A only sees their own question', async () => {
		const res = await request(app)
			.get('/api/v1/therapist/me/free-screening/questions')
			.set('Authorization', `Bearer ${providerAToken}`)
			.expect(200);

		const ids = res.body.data.items.map((q: any) => q.id);
		expect(ids).toContain(providerAQuestionId);
		expect(ids).not.toContain(providerBQuestionId);
	}, 10000);

	it('Provider B only sees their own question', async () => {
		const res = await request(app)
			.get('/api/v1/therapist/me/free-screening/questions')
			.set('Authorization', `Bearer ${providerBToken}`)
			.expect(200);

		const ids = res.body.data.items.map((q: any) => q.id);
		expect(ids).toContain(providerBQuestionId);
		expect(ids).not.toContain(providerAQuestionId);
	}, 10000);

	// ── assignment (care-team enforcement) ───────────────────────────────────

	it('Provider A can assign their question to Patient A (on care team)', async () => {
		const res = await request(app)
			.post(`/api/v1/therapist/me/free-screening/questions/${providerAQuestionId}/assign`)
			.set('Authorization', `Bearer ${providerAToken}`)
			.send({ patientUserId: patientAUserId });

		expect(res.status).toBe(201);
		expect(res.body.success).toBe(true);
		assignmentAId = res.body.data.id;
	}, 10000);

	it('Provider A cannot assign to Patient B (not on their care team) → 403', async () => {
		const res = await request(app)
			.post(`/api/v1/therapist/me/free-screening/questions/${providerAQuestionId}/assign`)
			.set('Authorization', `Bearer ${providerAToken}`)
			.send({ patientUserId: patientBUserId });

		expect(res.status).toBe(403);
	}, 10000);

	it('Provider B cannot assign Provider A question → 403', async () => {
		// Provider B tries to assign a question that belongs to Provider A
		const res = await request(app)
			.post(`/api/v1/therapist/me/free-screening/questions/${providerAQuestionId}/assign`)
			.set('Authorization', `Bearer ${providerBToken}`)
			.send({ patientUserId: patientBUserId });

		expect(res.status).toBe(403);
	}, 10000);

	// ── patient visibility ────────────────────────────────────────────────────

	it('Patient A sees the question assigned by Provider A', async () => {
		const res = await request(app)
			.get('/api/v1/free-screening/assigned/me')
			.set('Authorization', `Bearer ${patientAToken}`)
			.expect(200);

		const ids = res.body.data.items.map((item: any) => item.question.id);
		expect(ids).toContain(providerAQuestionId);
		// points are NOT exposed to the patient
		const item = res.body.data.items.find((i: any) => i.question.id === providerAQuestionId);
		expect(item.question.options[0]).not.toHaveProperty('points');
	}, 10000);

	it('Patient B has no assigned questions yet', async () => {
		const res = await request(app)
			.get('/api/v1/free-screening/assigned/me')
			.set('Authorization', `Bearer ${patientBToken}`)
			.expect(200);

		expect(res.body.data.items).toHaveLength(0);
	}, 10000);

	// ── patient answer submission ─────────────────────────────────────────────

	it('Patient A can submit an answer to the assigned question', async () => {
		expect(assignmentAId).toBeTruthy();

		// get assigned items to pick a valid optionIndex
		const listRes = await request(app)
			.get('/api/v1/free-screening/assigned/me')
			.set('Authorization', `Bearer ${patientAToken}`)
			.expect(200);

		const item = listRes.body.data.items.find((i: any) => i.question.id === providerAQuestionId);
		expect(item).toBeTruthy();
		const firstOption = item.question.options[0];

		const submitRes = await request(app)
			.post(`/api/v1/free-screening/assigned/${assignmentAId}/submit`)
			.set('Authorization', `Bearer ${patientAToken}`)
			.send({ selectedOptionIndex: firstOption.optionIndex, notes: 'Usually get 3–4 hours.' });

		expect(submitRes.status).toBe(201);
		expect(submitRes.body.data.answeredAt).toBeTruthy();
		expect(submitRes.body.data.selectedOption.optionIndex).toBe(firstOption.optionIndex);
	}, 10000);

	it('Patient A cannot submit the same assignment twice → 409', async () => {
		const res = await request(app)
			.post(`/api/v1/free-screening/assigned/${assignmentAId}/submit`)
			.set('Authorization', `Bearer ${patientAToken}`)
			.send({ selectedOptionIndex: 0 });

		expect(res.status).toBe(409);
	}, 10000);

	// ── admin visibility ──────────────────────────────────────────────────────

	it('Admin sees questions from ALL providers', async () => {
		const res = await request(app)
			.get('/api/v1/admin/screening/provider-questions')
			.set('Authorization', `Bearer ${adminToken}`)
			.expect(200);

		const ids = res.body.data.items.map((q: any) => q.id);
		expect(ids).toContain(providerAQuestionId);
		expect(ids).toContain(providerBQuestionId);
	}, 10000);

	it('Admin can filter provider questions by providerId', async () => {
		const res = await request(app)
			.get(`/api/v1/admin/screening/provider-questions?providerId=${providerAUserId}`)
			.set('Authorization', `Bearer ${adminToken}`)
			.expect(200);

		const ids = res.body.data.items.map((q: any) => q.id);
		expect(ids).toContain(providerAQuestionId);
		expect(ids).not.toContain(providerBQuestionId);
	}, 10000);

	it('Admin response includes assignment counts per question', async () => {
		const res = await request(app)
			.get(`/api/v1/admin/screening/provider-questions?providerId=${providerAUserId}`)
			.set('Authorization', `Bearer ${adminToken}`)
			.expect(200);

		const provAQ = res.body.data.items.find((q: any) => q.id === providerAQuestionId);
		expect(provAQ).toBeTruthy();
		expect(Array.isArray(provAQ.assignments)).toBe(true);
		expect(provAQ.assignments.length).toBeGreaterThanOrEqual(1);
	}, 10000);

	// ── admin adds public template question (visible to all via free-screening) ─

	it('Admin creates a public screening template and adds a question', async () => {
		// create template
		const tplRes = await request(app)
			.post('/api/v1/admin/screening/templates')
			.set('Authorization', `Bearer ${adminToken}`)
			.send({
				key: `test-public-template-${Date.now()}`,
				title: 'Admin Public Test Template',
				isPublic: true,
				randomizeOrder: false,
			});

		expect(tplRes.status).toBe(201);
		const templateId = tplRes.body.data.id;

		// add a question to it
		const qRes = await request(app)
			.post(`/api/v1/admin/screening/templates/${templateId}/questions`)
			.set('Authorization', `Bearer ${adminToken}`)
			.send({
				prompt: 'How would you rate your overall mood today?',
				sectionKey: 'mood',
				orderIndex: 1,
				options: [
					{ label: 'Very poor', optionIndex: 0, points: 3 },
					{ label: 'Poor', optionIndex: 1, points: 2 },
					{ label: 'Fair', optionIndex: 2, points: 1 },
					{ label: 'Good', optionIndex: 3, points: 0 },
				],
			});

		expect(qRes.status).toBe(201);
		expect(qRes.body.data.prompt).toBe('How would you rate your overall mood today?');
		expect(qRes.body.data.options).toHaveLength(4);

		// cleanup template we just created
		await (prisma as any).screeningTemplate.delete({ where: { id: templateId } }).catch(() => null);
	}, 15000);

	// ── unauthenticated / wrong-role rejection ────────────────────────────────

	it('Unauthenticated request to provider endpoint returns 401', async () => {
		await request(app)
			.get('/api/v1/therapist/me/free-screening/questions')
			.expect(401);
	}, 10000);

	it('Patient cannot access provider question list → 403', async () => {
		await request(app)
			.get('/api/v1/therapist/me/free-screening/questions')
			.set('Authorization', `Bearer ${patientAToken}`)
			.expect(403);
	}, 10000);

	it('Provider cannot access admin provider-question list → 403', async () => {
		await request(app)
			.get('/api/v1/admin/screening/provider-questions')
			.set('Authorization', `Bearer ${providerAToken}`)
			.expect(403);
	}, 10000);
});
