import { BottomTabInset, Spacing } from '@/constants/theme';

export type FeedbackButtonPlacement =
  | 'floating-right'
  | 'header'
  | 'action-row';

export type FeedbackButtonLayout = {
  placement: FeedbackButtonPlacement;
  bottomOffset: number;
};

export function appFeedbackButtonLayout(screen: string): FeedbackButtonLayout | null {
  if (screen === 'inventory') return null;

  if (screen === 'history') {
    return {
      placement: 'floating-right',
      bottomOffset: BottomTabInset + Spacing.two,
    };
  }

  return {
    placement: 'floating-right',
    bottomOffset: Spacing.three,
  };
}

export function feedbackButtonPosition({
  placement,
  bottomOffset,
  safeBottom,
}: {
  placement: FeedbackButtonPlacement;
  bottomOffset: number;
  safeBottom: number;
}) {
  if (placement === 'header' || placement === 'action-row') return {};

  return {
    bottom: bottomOffset + safeBottom,
    right: Spacing.three,
  };
}
