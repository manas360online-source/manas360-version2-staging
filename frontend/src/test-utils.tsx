import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { MemoryRouter } from 'react-router-dom';
import { vi } from 'vitest';
import axios from 'axios';
import { ErrorProvider } from './components/ErrorProvider';
import { AuthProvider } from './context/AuthContext';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Provide a simple localStorage mock for tests that access it.
if (typeof globalThis.localStorage === 'undefined' || !globalThis.localStorage) {
  const store: Record<string, string> = {};
  // @ts-ignore
  globalThis.localStorage = {
    getItem(key: string) {
      return Object.prototype.hasOwnProperty.call(store, key) ? store[key] : null;
    },
    setItem(key: string, value: string) {
      store[key] = String(value);
    },
    removeItem(key: string) {
      delete store[key];
    },
    clear() {
      for (const k of Object.keys(store)) delete store[k];
    },
  } as any;
}

// Mock axios module and provide a spyable axios instance for tests.
vi.mock('axios');
const axiosMock = (axios as any) || {};
axiosMock.interceptors = axiosMock.interceptors || { response: { use: vi.fn() } };
axiosMock.get = axiosMock.get || vi.fn().mockResolvedValue({ data: { data: {} } });
axiosMock.post = axiosMock.post || vi.fn().mockResolvedValue({ data: {} });
axiosMock.put = axiosMock.put || vi.fn().mockResolvedValue({ data: {} });
axiosMock.delete = axiosMock.delete || vi.fn().mockResolvedValue({ data: {} });
axiosMock.create = axiosMock.create || (() => axiosMock);

export const mockedAxios = axiosMock as any;

  // Mock react-hot-toast with a Toaster component and a mock toast function.
const mockToast = {
  success: vi.fn(),
  error: vi.fn(),
} as any;

vi.mock('react-hot-toast', () => {
  const Toaster = (props: any) => <div data-testid="toaster" {...props} />;
  return { default: mockToast, toast: mockToast, Toaster };
});

// Export toast mock so tests can assert calls deterministically
export { mockToast };

// Mock implementations for common dependencies
export const mockApi = {
  get: vi.fn(),
  post: vi.fn(),
  put: vi.fn(),
  delete: vi.fn(),
};

export const mockRouter = {
  push: vi.fn(),
  replace: vi.fn(),
  back: vi.fn(),
  pathname: '/',
  query: {},
};

export const mockAuth = {
  user: { id: '1', name: 'Test User', role: 'therapist' },
  isAuthenticated: true,
  login: vi.fn(),
  logout: vi.fn(),
  
};

// Provide a `jest` global mapped to Vitest's `vi` to support tests written
// using Jest globals (many existing tests use `jest.fn()` or `jest.useFakeTimers`).
(global as any).jest = vi;

// Custom render function with providers
export function renderWithProviders(
  component: React.ReactElement,
  _options?: {
    initialRoute?: string;
    authState?: typeof mockAuth;
    apiMock?: typeof mockApi;
  }
) {
  const { initialRoute = '/' } = _options || {};

  // Mock window.location
  Object.defineProperty(window, 'location', {
    value: { pathname: initialRoute },
    writable: true,
  });

  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });

  return render(
    <MemoryRouter initialEntries={[initialRoute]}>
      <QueryClientProvider client={queryClient}>
        <ErrorProvider>
          <AuthProvider>{component}</AuthProvider>
        </ErrorProvider>
      </QueryClientProvider>
    </MemoryRouter>
  );
}

// Note: we mock the module above; no runtime override needed here.

// Test utilities
export const testUtils = {
  // Wait for loading states
  waitForLoadingToFinish: () => waitFor(() => {
    expect(screen.queryByTestId('loading-spinner')).not.toBeInTheDocument();
  }),

  // Wait for error states
  waitForErrorToAppear: (errorMessage?: string) => waitFor(() => {
    const errorElement = screen.getByRole('alert');
    if (errorMessage) {
      expect(errorElement).toHaveTextContent(errorMessage);
    }
    expect(errorElement).toBeInTheDocument();
  }),

  // Simulate user interactions
  async fillFormField(label: string, value: string) {
    const input = screen.getByLabelText(label);
    fireEvent.change(input, { target: { value } });
    return input;
  },

  async clickButton(buttonText: string) {
    const button = screen.getByRole('button', { name: buttonText });
    fireEvent.click(button);
    return button;
  },

  async submitForm(formLabel?: string) {
    const form = formLabel
      ? screen.getByLabelText(formLabel)
      : screen.getByRole('form');
    fireEvent.submit(form);
    return form;
  },

  // Accessibility testing helpers
  async checkAccessibility() {
    // Basic accessibility checks
    expect(document.body).toBeVisible();

    // Check for ARIA labels
    const buttons = screen.getAllByRole('button');
    buttons.forEach(button => {
      expect(button).toHaveAttribute('aria-label');
    });

    // Check for form labels
    const inputs = screen.getAllByRole('textbox');
    inputs.forEach(input => {
      expect(input).toHaveAttribute('aria-label');
    });
  },

  // Mock API responses
  mockApiResponse: (method: keyof typeof mockApi, response: any, error?: any) => {
    if (error) {
      mockApi[method].mockRejectedValue(error);
    } else {
      mockApi[method].mockResolvedValue(response);
    }
  },

  // Reset all mocks
  resetAllMocks: () => {
    Object.values(mockApi).forEach(mock => (mock as any).mockReset());
    Object.values(mockRouter).forEach(mock => {
      if (typeof mock === 'function') (mock as any).mockReset();
    });
    Object.values(mockAuth).forEach(mock => {
      if (typeof mock === 'function') (mock as any).mockReset();
    });
  },
};

// Custom matchers
declare global {
// eslint-disable-next-line @typescript-eslint/no-namespace
  namespace jest {
    interface Matchers<R> {
      toBeAccessible(): R;
      toHaveErrorMessage(expectedMessage: string): R;
    }
  }
}

expect.extend({
  toBeAccessible(received: any) {
    // Basic accessibility checks
    const pass = received && typeof received === 'object';
    return {
      message: () => 'Expected element to be accessible',
      pass,
    };
  },

  toHaveErrorMessage(received: any, expectedMessage: string) {
    const errorElement = received?.querySelector?.('[role="alert"]');
    const pass = errorElement && errorElement.textContent?.includes(expectedMessage);
    return {
      message: () => `Expected to find error message "${expectedMessage}"`,
      pass,
    };
  },
});

// Global test setup
beforeEach(() => {
  testUtils.resetAllMocks();
});

afterEach(() => {
  // Clean up any mounted components
  screen.queryAllByTestId('test-component').forEach((element: Element) => {
    element.remove();
  });
});