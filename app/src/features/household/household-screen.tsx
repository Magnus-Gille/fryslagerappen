import { useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { useAuth } from '@/features/auth/auth-provider';
import { useTheme } from '@/hooks/use-theme';

import { useHousehold } from './household-provider';

export function HouseholdScreen() {
  const theme = useTheme();
  const { signOut } = useAuth();
  const { createHousehold, joinHousehold } = useHousehold();
  const [mode, setMode] = useState<'create' | 'join'>('create');
  const [householdName, setHouseholdName] = useState('Mitt hushåll');
  const [displayName, setDisplayName] = useState('');
  const [inviteToken, setInviteToken] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const missingRequiredField = !displayName.trim() || (mode === 'create' ? !householdName.trim() : !inviteToken.trim());

  async function submit() {
    if (!displayName.trim() || busy) return;
    setBusy(true);
    setError(undefined);
    try {
      if (mode === 'create') await createHousehold(householdName.trim(), displayName.trim());
      else await joinHousehold(inviteToken.trim(), displayName.trim());
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : 'Det gick inte att ansluta hushållet.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: theme.background }]}>
      <KeyboardAvoidingView style={styles.center} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <ThemedText type="title">{mode === 'create' ? 'Skapa hushållet' : 'Anslut till hushållet'}</ThemedText>
          <ThemedText themeColor="textSecondary">Inventeringen delas endast med personer som är medlemmar i samma hushåll.</ThemedText>
          <TextInput accessibilityLabel="Ditt namn" placeholder="Ditt namn" placeholderTextColor={theme.textTertiary} value={displayName} onChangeText={setDisplayName} style={[styles.input, { color: theme.text, borderColor: theme.border }]} />
          {mode === 'create' ? (
            <TextInput accessibilityLabel="Hushållets namn" placeholder="Hushållets namn" placeholderTextColor={theme.textTertiary} value={householdName} onChangeText={setHouseholdName} style={[styles.input, { color: theme.text, borderColor: theme.border }]} />
          ) : (
            <TextInput accessibilityLabel="Inbjudningskod" autoCapitalize="none" placeholder="Klistra in inbjudningskoden" placeholderTextColor={theme.textTertiary} value={inviteToken} onChangeText={setInviteToken} style={[styles.input, { color: theme.text, borderColor: theme.border }]} />
          )}
          {error && <ThemedText type="small" style={{ color: theme.warningText }}>{error}</ThemedText>}
          <Pressable accessibilityRole="button" disabled={busy || missingRequiredField} onPress={submit} style={[styles.primary, { backgroundColor: theme.primary }]}>
            {busy ? <ActivityIndicator color="#FFFFFF" /> : <ThemedText type="smallBold" style={styles.white}>{mode === 'create' ? 'Skapa hushåll' : 'Anslut'}</ThemedText>}
          </Pressable>
          <Pressable accessibilityRole="button" onPress={() => setMode(mode === 'create' ? 'join' : 'create')}>
            <ThemedText type="smallBold" style={[styles.link, { color: theme.primary }]}>{mode === 'create' ? 'Har du en inbjudningskod?' : 'Skapa ett nytt hushåll'}</ThemedText>
          </Pressable>
          <Pressable accessibilityRole="button" onPress={signOut}><ThemedText type="caption" themeColor="textTertiary" style={styles.link}>Logga ut</ThemedText></Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.four },
  card: { width: '100%', maxWidth: Math.min(MaxContentWidth, 500), borderWidth: 1, borderRadius: Radius.xlarge, padding: Spacing.five, gap: Spacing.three },
  input: { minHeight: 54, borderWidth: 1, borderRadius: Radius.medium, paddingHorizontal: Spacing.three, fontSize: 16 },
  primary: { minHeight: 54, borderRadius: Radius.medium, alignItems: 'center', justifyContent: 'center' },
  white: { color: '#FFFFFF' },
  link: { textAlign: 'center', padding: Spacing.two },
});
