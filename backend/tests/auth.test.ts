import request from 'supertest';
import app from '../src/app';
import { AppError } from '../src/middleware/error.middleware';
import {
	loginWithPassword,
	registerWithPhone,
	verifyPhoneOtp,
} from '../src/services/auth.service';

jest.mock('../src/services/auth.service', () => ({
	registerWithPhone: jest.fn(),
	verifyPhoneOtp: jest.fn(),
	loginWithPassword: jest.fn(),
	loginWithGoogle: jest.fn(),
	refreshAuthTokens: jest.fn(),
	requestPasswordReset: jest.fn(),
	resetPassword: jest.fn(),
	setupMfa: jest.fn(),
	verifyAndEnableMfa: jest.fn(),
	logoutSession: jest.fn(),
	getActiveSessions: jest.fn(),
	revokeSession: jest.fn(),
	registerProviderProfile: jest.fn(),
}));

const mockedRegisterWithPhone = registerWithPhone as jest.MockedFunction<typeof registerWithPhone>;
const mockedVerifyPhoneOtp = verifyPhoneOtp as jest.MockedFunction<typeof verifyPhoneOtp>;
const mockedLoginWithPassword = loginWithPassword as jest.MockedFunction<typeof loginWithPassword>;

const tokenPayload = {
	accessToken: 'access-token',
	refreshToken: 'refresh-token',
	sessionId: 'session-1',
	refreshJti: 'refresh-jti-1',
};

describe('auth role login policy', () => {
	beforeEach(() => {
		jest.clearAllMocks();
	});

	it('sends OTP for phone auth', async () => {
		mockedRegisterWithPhone.mockResolvedValueOnce({
			userId: 'user-1',
			phone: '+919999999999',
			message: 'Phone OTP sent.',
			devOtp: '123456',
		});

		const response = await request(app)
			.post('/api/auth/signup/phone')
			.send({
				phone: '+919999999999',
				name: 'Patient User',
				role: 'patient',
			});

		expect(response.status).toBe(201);
		expect(response.body.success).toBe(true);
		expect(response.body.data).toMatchObject({ phone: '+919999999999' });
		expect(mockedRegisterWithPhone).toHaveBeenCalledTimes(1);
	});

	it('logs in patient via phone OTP and sets cookies', async () => {
		mockedVerifyPhoneOtp.mockResolvedValueOnce({
			user: {
				id: 'patient-1',
				email: null,
				phone: '+919999999999',
				role: 'PATIENT',
				emailVerified: true,
				phoneVerified: true,
				mfaEnabled: false,
				isTherapistVerified: false,
				therapistVerifiedAt: null,
				providerOnboardingCompleted: false,
				providerProfileVerified: false,
				companyKey: null,
				company_key: null,
				isCompanyAdmin: false,
				is_company_admin: false,
			},
			...tokenPayload,
		});

		const response = await request(app)
			.post('/api/auth/verify/phone-otp')
			.send({ phone: '+919999999999', otp: '123456' });

		expect(response.status).toBe(200);
		expect(response.body.data.user.role).toBe('PATIENT');
		expect(response.headers['set-cookie']).toEqual(
			expect.arrayContaining([
				expect.stringContaining('access_token='),
				expect.stringContaining('refresh_token='),
			]),
		);
	});

	it('logs in therapist via phone OTP', async () => {
		mockedVerifyPhoneOtp.mockResolvedValueOnce({
			user: {
				id: 'therapist-1',
				email: 'therapist@example.com',
				phone: '+919999999998',
				role: 'THERAPIST',
				emailVerified: true,
				phoneVerified: true,
				mfaEnabled: false,
				isTherapistVerified: true,
				therapistVerifiedAt: null,
				providerOnboardingCompleted: true,
				providerProfileVerified: true,
				companyKey: null,
				company_key: null,
				isCompanyAdmin: false,
				is_company_admin: false,
			},
			...tokenPayload,
		});

		const response = await request(app)
			.post('/api/auth/verify/phone-otp')
			.send({ phone: '+919999999998', otp: '123456' });

		expect(response.status).toBe(200);
		expect(response.body.data.user.role).toBe('THERAPIST');
	});

	it('logs in corporate admin via phone OTP', async () => {
		mockedVerifyPhoneOtp.mockResolvedValueOnce({
			user: {
				id: 'corpadmin-1',
				email: 'hr@company.com',
				phone: '+919999999997',
				role: 'PATIENT',
				emailVerified: true,
				phoneVerified: true,
				mfaEnabled: false,
				isTherapistVerified: false,
				therapistVerifiedAt: null,
				providerOnboardingCompleted: false,
				providerProfileVerified: false,
				companyKey: 'ACME',
				company_key: 'ACME',
				isCompanyAdmin: true,
				is_company_admin: true,
			},
			...tokenPayload,
		});

		const response = await request(app)
			.post('/api/auth/verify/phone-otp')
			.send({ phone: '+919999999997', otp: '123456' });

		expect(response.status).toBe(200);
		expect(response.body.data.user.isCompanyAdmin).toBe(true);
	});

	it('allows platform admin only via email/password login', async () => {
		mockedLoginWithPassword.mockResolvedValueOnce({
			user: {
				id: 'admin-1',
				email: 'admin@manas360.com',
				phone: '+919999999996',
				role: 'ADMIN',
				emailVerified: true,
				phoneVerified: true,
				mfaEnabled: false,
				isTherapistVerified: false,
				therapistVerifiedAt: null,
				providerOnboardingCompleted: false,
				providerProfileVerified: false,
				companyKey: null,
				company_key: null,
				isCompanyAdmin: false,
				is_company_admin: false,
			},
			...tokenPayload,
		});

		const response = await request(app)
			.post('/api/auth/login')
			.send({ identifier: 'admin@manas360.com', password: 'Password@123' });

		expect(response.status).toBe(200);
		expect(response.body.data.user.role).toBe('ADMIN');
	});

	it('blocks password login for non-admin users', async () => {
		mockedLoginWithPassword.mockRejectedValueOnce(new AppError('Use phone OTP login for this account', 403));

		const response = await request(app)
			.post('/api/auth/login')
			.send({ identifier: '+919999999999', password: 'Password@123' });

		expect(response.status).toBe(403);
		expect(response.body.message).toBe('Use phone OTP login for this account');
	});
});
