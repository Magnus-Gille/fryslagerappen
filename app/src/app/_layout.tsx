import { DarkTheme, DefaultTheme, ThemeProvider } from 'expo-router';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import AppTabs from '@/components/app-tabs';
import { AuthProvider, useAuth } from '@/features/auth/auth-provider';
import { AuthScreen } from '@/features/auth/auth-screen';
import { HouseholdProvider, useHousehold } from '@/features/household/household-provider';
import { HouseholdScreen } from '@/features/household/household-screen';
import { InventoryProvider } from '@/features/inventory/inventory-provider';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { runtimeConfig } from '@/lib/runtime-config';

export default function TabLayout() {
  const colorScheme = useColorScheme();
  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <AuthProvider>
        <HouseholdProvider>
          <AppGate />
        </HouseholdProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

function AppGate() {
  const { session, loading: authLoading } = useAuth();
  const { household, loading: householdLoading } = useHousehold();

  if (runtimeConfig.hasSupabase && authLoading) {
    return <LoadingScreen />;
  }
  if (runtimeConfig.hasSupabase && !session) {
    return <AuthScreen />;
  }
  if (runtimeConfig.hasSupabase && householdLoading) {
    return <LoadingScreen />;
  }
  if (runtimeConfig.hasSupabase && !household) {
    return <HouseholdScreen />;
  }
  return (
    <InventoryProvider>
      <AppTabs />
    </InventoryProvider>
  );
}

function LoadingScreen() {
  return (
    <View style={styles.loading}>
      <ActivityIndicator size="large" />
    </View>
  );
}

const styles = StyleSheet.create({ loading: { flex: 1, alignItems: 'center', justifyContent: 'center' } });
