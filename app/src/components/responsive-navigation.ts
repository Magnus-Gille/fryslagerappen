const compactNavigationBreakpoint = 600;

export function shouldUseCompactNavigation(width: number, hasHydrated: boolean) {
  return !hasHydrated || width < compactNavigationBreakpoint;
}
