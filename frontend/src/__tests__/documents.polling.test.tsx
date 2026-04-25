import { renderWithProviders as render, mockedAxios, mockToast } from '@/test-utils.tsx';
vi.mock('../api/patient', () => ({
  patientApi: {
    getDocuments: vi.fn(),
  },
}));
import { waitFor } from '@testing-library/react';
import { vi, describe, it, beforeEach, afterEach } from 'vitest';
import DocumentsPage from '../pages/patient/DocumentsPage';


describe('DocumentsPage polling', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    mockedAxios.get.mockResolvedValue({ data: { data: [] } });
    // Ensure a predictable localStorage for this test
    (globalThis as any).localStorage = {
      _store: {} as Record<string, string>,
      getItem(key: string) { return Object.prototype.hasOwnProperty.call(this._store, key) ? this._store[key] : null; },
      setItem(key: string, value: string) { this._store[key] = String(value); },
      removeItem(key: string) { delete this._store[key]; },
      clear() { this._store = {}; },
    };
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.resetAllMocks();
  });

  it('shows notification when new session docs appear', async () => {
    const toastFn = mockToast.success;

    // Mock the patient API directly to control getDocuments for this test
    const patientApiModule = await import('../api/patient');
    let callCount = 0;
    // the mocked module exports `{ patientApi }` so ensure we override the
    // `patientApi.getDocuments` implementation specifically.
    (patientApiModule as any).patientApi.getDocuments = vi.fn().mockImplementation(() => {
      callCount += 1;
      if (callCount === 1) return Promise.resolve([]);
      if (callCount === 2) return Promise.resolve([{ id: 'd1', title: 'Session A', date: new Date().toISOString(), category: 'session', fileUrl: '' }]);
      return Promise.resolve([]);
    });

    // Note: patientApi module is mocked via vi.mock at the top of this file.

    render(<DocumentsPage />);

    // advance timers to trigger poll
    vi.advanceTimersByTime(16000);

    await waitFor(() => {
      expect(toastFn).toHaveBeenCalled();
    });
  });
});
