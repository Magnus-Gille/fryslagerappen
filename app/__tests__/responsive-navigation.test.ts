import { describe, expect, it } from '@jest/globals';

import { shouldUseCompactNavigation } from '../src/components/responsive-navigation';

describe('responsive web navigation', () => {
  it('keeps the server and first client render compact during hydration', () => {
    expect(shouldUseCompactNavigation(1280, false)).toBe(true);
  });

  it('switches to the measured layout after hydration', () => {
    expect(shouldUseCompactNavigation(390, true)).toBe(true);
    expect(shouldUseCompactNavigation(1280, true)).toBe(false);
  });
});
