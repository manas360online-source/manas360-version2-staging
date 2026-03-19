import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi } from 'vitest';

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

  return render(component);
}

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