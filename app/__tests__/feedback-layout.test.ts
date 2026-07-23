import { describe, expect, it, jest } from '@jest/globals';

jest.mock('@/global.css', () => ({}));

import { BottomTabInset, Spacing } from '@/constants/theme';
import {
  appFeedbackButtonLayout,
  feedbackButtonPosition,
} from '@/features/feedback/feedback-layout';

describe('feedback button layout', () => {
  it('delegates inventory feedback to the existing action row', () => {
    expect(appFeedbackButtonLayout('inventory')).toBeNull();
  });

  it('keeps ordinary app screens above the native tab bar', () => {
    expect(appFeedbackButtonLayout('history')).toEqual({
      placement: 'floating-right',
      bottomOffset: BottomTabInset + Spacing.two,
    });
  });

  it('makes modal-header feedback part of layout instead of an overlay', () => {
    expect(
      feedbackButtonPosition({
        placement: 'header',
        bottomOffset: Spacing.three,
        safeBottom: 34,
      }),
    ).toEqual({});
  });

  it('makes action-row feedback part of layout instead of an overlay', () => {
    expect(
      feedbackButtonPosition({
        placement: 'action-row',
        bottomOffset: 0,
        safeBottom: 34,
      }),
    ).toEqual({});
  });
});
