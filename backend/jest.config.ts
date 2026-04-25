import type { Config } from 'jest';

const config: Config = {
	preset: 'ts-jest',
	testEnvironment: 'node',
	roots: ['<rootDir>/tests'],
	testMatch: [
		'**/user-management.test.ts',
		'**/auth.test.ts',
		'**/session.test.ts',
		'**/payment.test.ts',
		'**/*.integration.test.ts',
	],
	clearMocks: true,
	setupFiles: ['<rootDir>/tests/setup.ts'],
	setupFilesAfterEnv: ['<rootDir>/tests/setup.after-env.ts'],
	globals: {
		'ts-jest': {
			tsconfig: '<rootDir>/tsconfig.test.json',
		},
	},
};

export default config;
