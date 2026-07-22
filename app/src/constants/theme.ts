/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

import '@/global.css';

import { Platform } from 'react-native';

export const Colors = {
  light: {
    text: '#172033',
    background: '#F6F8FC',
    surface: '#FFFFFF',
    backgroundElement: '#EAF0F8',
    backgroundSelected: '#DCE9F8',
    textSecondary: '#5C667A',
    textTertiary: '#7D8798',
    border: '#E2E7EF',
    primary: '#2368B1',
    primaryStrong: '#164E8D',
    primarySoft: '#E4F0FC',
    accent: '#F07B51',
    warningSoft: '#FFF0D9',
    warningText: '#99521F',
    successSoft: '#E4F3E9',
    successText: '#276844',
  },
  dark: {
    text: '#F7F9FC',
    background: '#101722',
    surface: '#192332',
    backgroundElement: '#243246',
    backgroundSelected: '#2B4665',
    textSecondary: '#BBC5D3',
    textTertiary: '#91A0B3',
    border: '#2D3A4C',
    primary: '#75B5F4',
    primaryStrong: '#A7D2FC',
    primarySoft: '#1E3A58',
    accent: '#FF9672',
    warningSoft: '#49351E',
    warningText: '#FFD39B',
    successSoft: '#1F3E31',
    successText: '#A9DFC1',
  },
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: 'system-ui',
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: 'ui-serif',
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: 'ui-rounded',
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: 'var(--font-display)',
    serif: 'var(--font-serif)',
    rounded: 'var(--font-rounded)',
    mono: 'var(--font-mono)',
  },
});

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

export const Radius = {
  small: 10,
  medium: 16,
  large: 22,
  xlarge: 30,
  pill: 999,
} as const;

export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
export const MaxContentWidth = 800;
