import { DarkTheme, DefaultTheme, ThemeProvider, usePathname } from 'expo-router';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import AppTabs from '@/components/app-tabs';
import { AuthProvider, useAuth } from '@/features/auth/auth-provider';
import { AuthScreen } from '@/features/auth/auth-screen';
import { CaptureAnalysisProvider } from '@/features/capture/capture-analysis-provider';
import { appFeedbackContext } from '@/features/feedback/feedback-context';
import { FeedbackOverlay } from '@/features/feedback/feedback-overlay';
import { HomeProvider, useHome } from '@/features/home/home-provider';
import { HomeScreen } from '@/features/home/home-screen';
import { InventoryProvider } from '@/features/inventory/inventory-provider';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Spacing } from '@/constants/theme';
import { runtimeConfig } from '@/lib/runtime-config';
import { startPhoneTelemetry } from '@/lib/telemetry';

startPhoneTelemetry();

export default function TabLayout() {
  const colorScheme = useColorScheme();
  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <AuthProvider>
        <HomeProvider>
          <AppGate />
        </HomeProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

function AppGate() {
  const { authenticated, loading: authLoading } = useAuth();
  const { home, loading: homeLoading } = useHome();
  const pathname = usePathname();
  const feedbackContext = appFeedbackContext({
    backendEnabled: runtimeConfig.hasBackend,
    authLoading,
    authenticated,
    homeLoading,
    hasHome: Boolean(home),
    pathname,
  });
  const feedbackBottomOffset =
    feedbackContext.screen === 'inventory'
      ? 116
      : feedbackContext.screen === 'history'
        ? 64
        : Spacing.three;

  let content;
  if (runtimeConfig.hasBackend && authLoading) {
    content = <LoadingScreen />;
  } else if (runtimeConfig.hasBackend && !authenticated) {
    content = <AuthScreen />;
  } else if (runtimeConfig.hasBackend && homeLoading) {
    content = <LoadingScreen />;
  } else if (runtimeConfig.hasBackend && !home) {
    content = <HomeScreen />;
  } else {
    content = (
      <InventoryProvider>
        <CaptureAnalysisProvider>
          <AppTabs />
        </CaptureAnalysisProvider>
      </InventoryProvider>
    );
  }

  return (
    <View style={styles.app}>
      {content}
      <FeedbackOverlay context={feedbackContext} bottomOffset={feedbackBottomOffset} />
    </View>
  );
}

function LoadingScreen() {
  return (
    <View style={styles.loading}>
      <ActivityIndicator size="large" />
    </View>
  );
}

const styles = StyleSheet.create({
  app: { flex: 1 },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
