import { describe, expect, it } from 'vitest';
import { formatTagLabel, getDailyCheckInPlaceholder, getMoodOption } from './dailyCheckIn';

describe('dailyCheckIn utils', () => {
  it('returns mood metadata for a valid score', () => {
    expect(getMoodOption(4)).toMatchObject({ label: 'Good', emoji: '🙂' });
  });

  it('returns dynamic placeholders based on mood', () => {
    expect(getDailyCheckInPlaceholder(5)).toBe('What went well today?');
    expect(getDailyCheckInPlaceholder(2)).toBe('Get it off your chest...');
  });

  it('formats known tags into readable labels', () => {
    expect(formatTagLabel('selfcare')).toBe('Self-care');
    expect(formatTagLabel('unknown')).toBe('unknown');
  });
});
