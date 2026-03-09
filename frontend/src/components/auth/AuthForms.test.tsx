/** @vitest-environment jsdom */
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import LoginForm from './LoginForm';
import RegisterForm from './RegisterForm';
import OtpVerify from './OtpVerify';

afterEach(() => {
	cleanup();
});

describe('Auth form components', () => {
	it('renders login form with forgot password link', () => {
		const onSubmit = vi.fn().mockResolvedValue(undefined);
		render(
			<MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
				<LoginForm onSubmit={onSubmit} />
			</MemoryRouter>,
		);

		expect(screen.getByLabelText('Email or Phone')).toBeTruthy();
		expect(screen.getByLabelText('Password')).toBeTruthy();
		expect(screen.getByRole('link', { name: 'Forgot password?' })).toBeTruthy();
	});

	it('renders register form with role selection', () => {
		const onSubmit = vi.fn().mockResolvedValue(undefined);
		render(
			<MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
				<RegisterForm onSubmit={onSubmit} />
			</MemoryRouter>,
		);

		expect(screen.getByLabelText('Full Name')).toBeTruthy();
		expect(screen.getByLabelText('Email')).toBeTruthy();
		expect(screen.getByLabelText('Role')).toBeTruthy();
		expect(screen.getByRole('option', { name: 'Patient' })).toBeTruthy();
		expect(screen.getByRole('option', { name: 'Therapist' })).toBeTruthy();
	});

	it('limits OTP input to 6 digits', () => {
		const onSubmit = vi.fn().mockResolvedValue(undefined);
		render(<OtpVerify onSubmit={onSubmit} />);

		const otpInput = screen.getByLabelText('OTP') as HTMLInputElement;
		fireEvent.change(otpInput, { target: { value: '12ab34567' } });

		expect(otpInput.value).toBe('123456');
	});
});
