/** @vitest-environment jsdom */
import { render as rtlRender, screen, cleanup } from '@testing-library/react';
// renderWithProviders not used in this test
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, afterEach, vi } from 'vitest';
import App from './App';

vi.mock('agora-rtc-sdk-ng', () => ({
	default: {},
}));

afterEach(() => {
	cleanup();
});

describe('App auth route redirects', () => {
	it('redirects /login to /auth/login', async () => {
		rtlRender(
			<MemoryRouter initialEntries={['/login']} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
				<App />
			</MemoryRouter>,
		);

		expect(await screen.findByRole('heading', { name: 'Welcome back' })).toBeTruthy();
	});

	it('redirects /register to /auth/signup', async () => {
		rtlRender(
			<MemoryRouter initialEntries={['/register']} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
				<App />
			</MemoryRouter>,
		);

		expect(await screen.findByRole('heading', { name: 'Create your account' })).toBeTruthy();
	});
});
