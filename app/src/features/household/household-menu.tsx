import { useState } from 'react';
import { ActivityIndicator, Modal, Platform, Pressable, Share, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { useAuth } from '@/features/auth/auth-provider';
import { useTheme } from '@/hooks/use-theme';

import { useHousehold } from './household-provider';

export function HouseholdMenu({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const theme = useTheme();
  const { user, signOut } = useAuth();
  const { household, createInvite } = useHousehold();
  const [token, setToken] = useState<string>();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();

  async function invite() {
    setBusy(true);
    setError(undefined);
    try {
      const nextToken = await createInvite();
      setToken(nextToken);
      if (Platform.OS !== 'web') {
        await Share.share({ message: `Anslut till ${household?.name ?? 'mitt hushåll'} i Fryslagerappen med koden: ${nextToken}` });
      }
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : 'Kunde inte skapa inbjudan.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal visible={visible} animationType="slide" presentationStyle={Platform.OS === 'ios' ? 'pageSheet' : 'fullScreen'} onRequestClose={onClose}>
      <SafeAreaView style={[styles.screen, { backgroundColor: theme.background }]}>
        <View style={styles.header}><Pressable accessibilityRole="button" onPress={onClose}><ThemedText style={{ color: theme.primary }}>Stäng</ThemedText></Pressable><ThemedText type="itemTitle">Hushåll</ThemedText><View style={styles.spacer} /></View>
        <View style={styles.content}>
          <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <ThemedText type="title">{household?.name ?? 'Mitt hushåll'}</ThemedText>
            <ThemedText themeColor="textSecondary">{household?.displayName} · {user?.email}</ThemedText>
            <ThemedText type="caption" themeColor="textTertiary">Roll: {household?.role === 'owner' ? 'Ägare' : 'Medlem'}</ThemedText>
          </View>
          {household?.role === 'owner' && (
            <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
              <ThemedText type="sectionTitle">Bjud in en hushållsmedlem</ThemedText>
              <ThemedText themeColor="textSecondary">Koden är slumpad, kan användas en gång och upphör efter sju dagar.</ThemedText>
              {token && <TextInput accessibilityLabel="Inbjudningskod" editable={false} selectTextOnFocus value={token} style={[styles.token, { color: theme.text, borderColor: theme.border }]} />}
              {error && <ThemedText type="small" style={{ color: theme.warningText }}>{error}</ThemedText>}
              <Pressable accessibilityRole="button" disabled={busy} onPress={invite} style={[styles.primary, { backgroundColor: theme.primary }]}>{busy ? <ActivityIndicator color="#FFFFFF" /> : <ThemedText type="smallBold" style={styles.white}>{token ? 'Skapa ny kod' : 'Skapa och dela kod'}</ThemedText>}</Pressable>
            </View>
          )}
          <Pressable accessibilityRole="button" onPress={async () => { await signOut(); onClose(); }} style={[styles.logout, { borderColor: theme.border }]}><ThemedText type="smallBold" style={{ color: theme.warningText }}>Logga ut</ThemedText></Pressable>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  header: { height: 56, paddingHorizontal: Spacing.three, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  spacer: { width: 52 },
  content: { width: '100%', maxWidth: MaxContentWidth, alignSelf: 'center', padding: Spacing.four, gap: Spacing.three },
  card: { borderWidth: 1, borderRadius: Radius.large, padding: Spacing.four, gap: Spacing.two },
  token: { minHeight: 50, borderWidth: 1, borderRadius: Radius.medium, paddingHorizontal: Spacing.three, fontSize: 15 },
  primary: { minHeight: 50, borderRadius: Radius.medium, alignItems: 'center', justifyContent: 'center', marginTop: Spacing.two },
  logout: { minHeight: 50, borderWidth: 1, borderRadius: Radius.medium, alignItems: 'center', justifyContent: 'center' },
  white: { color: '#FFFFFF' },
});
