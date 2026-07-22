import { DarkTheme, DefaultTheme, ThemeProvider } from 'expo-router';

import AppTabs from '@/components/app-tabs';
import { InventoryProvider } from '@/features/inventory/inventory-provider';
import { useColorScheme } from '@/hooks/use-color-scheme';

export default function TabLayout() {
  const colorScheme = useColorScheme();
  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <InventoryProvider>
        <AppTabs />
      </InventoryProvider>
    </ThemeProvider>
  );
}
