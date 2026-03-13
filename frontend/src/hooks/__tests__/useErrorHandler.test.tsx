import { renderHook, act } from '@testing-library/react';
import { useErrorHandler } from '@/hooks/useErrorHandler.tsx';
import { ErrorProvider } from '@/components/ErrorProvider.tsx';
import { testUtils } from '@/test-utils.tsx';

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <ErrorProvider>{children}</ErrorProvider>
);

describe('useErrorHandler', () => {
  beforeEach(() => {
    testUtils.resetAllMocks();
  });

  it('should initialize with no errors', () => {
    const { result } = renderHook(() => useErrorHandler(), { wrapper });

    expect(result.current.errors).toEqual([]);
    expect(result.current.hasErrors).toBe(false);
  });

  it('should add and display errors', () => {
    const { result } = renderHook(() => useErrorHandler(), { wrapper });

    act(() => {
      result.current.addError({
        type: 'network',
        message: 'Network connection failed',
        context: 'api_call',
        retryable: true,
      });
    });

    expect(result.current.errors).toHaveLength(1);
    expect(result.current.errors[0]).toMatchObject({
      type: 'network',
      message: 'Network connection failed',
      context: 'api_call',
      retryable: true,
    });
    expect(result.current.hasErrors).toBe(true);
  });

  it('should remove errors by id', () => {
    const { result } = renderHook(() => useErrorHandler(), { wrapper });

    act(() => {
      result.current.addError({
        type: 'validation',
        message: 'Invalid input',
        context: 'form_validation',
        retryable: false,
      });
    });

    expect(result.current.errors).toHaveLength(1);

    act(() => {
      result.current.removeError(result.current.errors[0].id);
    });

    expect(result.current.errors).toHaveLength(0);
    expect(result.current.hasErrors).toBe(false);
  });

  it('should clear all errors', () => {
    const { result } = renderHook(() => useErrorHandler(), { wrapper });

    act(() => {
      result.current.addError({
        type: 'network',
        message: 'Error 1',
        retryable: false,
      });
      result.current.addError({
        type: 'server',
        message: 'Error 2',
        retryable: false,
      });
    });

    expect(result.current.errors).toHaveLength(2);

    act(() => {
      result.current.clearErrors();
    });

    expect(result.current.errors).toHaveLength(0);
  });

  it('should handle retry functionality', async () => {
    const mockRetryFn = jest.fn().mockResolvedValue('success');
    const { result } = renderHook(() => useErrorHandler(), { wrapper });

    act(() => {
      result.current.addError({
        type: 'network',
        message: 'Retryable error',
        retryable: true,
        action: mockRetryFn,
      });
    });

    await act(async () => {
      await result.current.retryError(result.current.errors[0].id);
    });

    expect(mockRetryFn).toHaveBeenCalledTimes(1);
    expect(result.current.errors).toHaveLength(0); // Error should be removed on successful retry
  });

  it('should handle failed retry', async () => {
    const mockRetryFn = jest.fn().mockRejectedValue(new Error('Retry failed'));
    const { result } = renderHook(() => useErrorHandler(), { wrapper });

    act(() => {
      result.current.addError({
        type: 'network',
        message: 'Retryable error',
        retryable: true,
        action: mockRetryFn,
      });
    });

    await act(async () => {
      try {
        await result.current.retryError(result.current.errors[0].id);
      } catch (error) {
        // Expected to fail
      }
    });

    expect(mockRetryFn).toHaveBeenCalledTimes(1);
    expect(result.current.errors).toHaveLength(1); // Error should remain on failed retry
  });

  it('should auto-remove non-retryable errors after timeout', async () => {
    jest.useFakeTimers();

    const { result } = renderHook(() => useErrorHandler(), { wrapper });

    act(() => {
      result.current.addError({
        type: 'validation',
        message: 'Auto-remove error',
        retryable: false,
      });
    });

    expect(result.current.errors).toHaveLength(1);

    // Fast-forward time
    act(() => {
      jest.advanceTimersByTime(5000); // 5 seconds
    });

    expect(result.current.errors).toHaveLength(0);

    jest.useRealTimers();
  });

  it('should not auto-remove retryable errors', async () => {
    jest.useFakeTimers();

    const { result } = renderHook(() => useErrorHandler(), { wrapper });

    act(() => {
      result.current.addError({
        type: 'network',
        message: 'No auto-remove error',
        retryable: true,
      });
    });

    expect(result.current.errors).toHaveLength(1);

    // Fast-forward time
    act(() => {
      jest.advanceTimersByTime(10000); // 10 seconds
    });

    expect(result.current.errors).toHaveLength(1); // Should still be there

    jest.useRealTimers();
  });

  it('should get errors by context', () => {
    const { result } = renderHook(() => useErrorHandler(), { wrapper });

    act(() => {
      result.current.addError({
        type: 'network',
        message: 'Network error',
        context: 'api_call',
        retryable: false,
      });
      result.current.addError({
        type: 'validation',
        message: 'Validation error',
        context: 'form_validation',
        retryable: false,
      });
      result.current.addError({
        type: 'server',
        message: 'Server error',
        context: 'api_call',
        retryable: false,
      });
    });

    const apiErrors = result.current.getErrorsByContext('api_call');
    expect(apiErrors).toHaveLength(2);
    expect(apiErrors.map((e: any) => e.type)).toEqual(['network', 'server']);

    const formErrors = result.current.getErrorsByContext('form_validation');
    expect(formErrors).toHaveLength(1);
    expect(formErrors[0].id).toEqual('error-2');
  });

  it('should get errors by type', () => {
    const { result } = renderHook(() => useErrorHandler(), { wrapper });

    act(() => {
      result.current.addError({
        type: 'network',
        message: 'Network error 1',
        retryable: false,
      });
      result.current.addError({
        type: 'network',
        message: 'Network error 2',
        retryable: false,
      });
      result.current.addError({
        type: 'validation',
        message: 'Validation error',
        retryable: false,
      });
    });

    const networkErrors = result.current.getErrorsByType('network');
    expect(networkErrors).toHaveLength(2);
    expect(networkErrors.map((e: any) => e.message)).toEqual(['Network error 1', 'Network error 2']);

    const validationErrors = result.current.getErrorsByType('validation');
    expect(validationErrors).toHaveLength(1);
    expect(validationErrors[0].message).toEqual('Validation error');
  });
});