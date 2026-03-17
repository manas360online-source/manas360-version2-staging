import { render, screen, waitFor } from '@testing-library/react';
import { vi, describe, it, beforeEach, afterEach } from 'vitest';
import axios from 'axios';
import DocumentsPage from '../pages/patient/DocumentsPage';

vi.mock('axios');

describe('DocumentsPage polling', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    (axios.get as any).mockResolvedValue({ data: { data: [] } });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.resetAllMocks();
  });

  it('shows notification when new session docs appear', async () => {
    const toastSpy = vi.spyOn(require('react-hot-toast'), 'default');

    // initial call returns empty
    (axios.get as any).mockResolvedValueOnce({ data: { data: [] } });

    // second poll will return a new session doc
    (axios.get as any).mockResolvedValueOnce({ data: { data: [{ id: 'd1', title: 'Session A', date: new Date().toISOString(), category: 'session', fileUrl: '' }] } });

    render(<DocumentsPage />);

    // advance timers to trigger poll
    vi.advanceTimersByTime(16000);

    await waitFor(() => {
      expect(toastSpy).toHaveBeenCalled();
    });
  });
});
