import { describe, expect, test } from '@jest/globals';

import { dateInputError, formatDateInput, isCompleteDate } from '@/lib/date-input';

describe('formatDateInput', () => {
  test('inserts dashes while typing digits', () => {
    expect(formatDateInput('2')).toBe('2');
    expect(formatDateInput('2026')).toBe('2026');
    expect(formatDateInput('20260')).toBe('2026-0');
    expect(formatDateInput('202608')).toBe('2026-08');
    expect(formatDateInput('2026081')).toBe('2026-08-1');
    expect(formatDateInput('20260812')).toBe('2026-08-12');
  });

  test('keeps already formatted input stable', () => {
    expect(formatDateInput('2026-08-12')).toBe('2026-08-12');
  });

  test('drops junk characters and extra digits', () => {
    expect(formatDateInput('2026/08/12')).toBe('2026-08-12');
    expect(formatDateInput('20260812999')).toBe('2026-08-12');
    expect(formatDateInput('bäst före 2026')).toBe('2026');
  });

  test('supports deleting backwards without trapping the user', () => {
    expect(formatDateInput('2026-08-')).toBe('2026-08');
    expect(formatDateInput('2026-')).toBe('2026');
    expect(formatDateInput('')).toBe('');
  });
});

describe('isCompleteDate', () => {
  test('accepts real calendar dates', () => {
    expect(isCompleteDate('2026-08-12')).toBe(true);
    expect(isCompleteDate('2028-02-29')).toBe(true);
  });

  test('rejects partial or impossible dates', () => {
    expect(isCompleteDate('2026-08')).toBe(false);
    expect(isCompleteDate('2026-13-01')).toBe(false);
    expect(isCompleteDate('2026-02-30')).toBe(false);
    expect(isCompleteDate('2027-02-29')).toBe(false);
    expect(isCompleteDate('0000-01-01')).toBe(false);
  });
});

describe('dateInputError', () => {
  test('allows the optional field to stay empty', () => {
    expect(dateInputError('', 'Bäst före')).toBeUndefined();
  });

  test('names the field in the error for incomplete input', () => {
    expect(dateInputError('2026-08', 'Bäst före')).toBe(
      'Bäst före måste vara ett fullständigt datum (ÅÅÅÅ-MM-DD).',
    );
    expect(dateInputError('2026-08-12', 'Bäst före')).toBeUndefined();
  });
});
