import { useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

import { useAuth } from './auth-provider';

export function AuthScreen() {
  const theme = useTheme();
  const { signIn, signUp } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string>();

  async function submit() {
    if (!email.trim() || password.length < 8 || busy) return;
    setBusy(true);
    setMessage(undefined);
    try {
      if (mode === 'signin') await signIn(email.trim(), password);
      else {
        await signUp(email.trim(), password);
        setMessage('Kontot är skapat. Bekräfta mejlet om projektet kräver e-postbekräftelse.');
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Inloggningen misslyckades.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: theme.background }]}>
      <KeyboardAvoidingView style={styles.center} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <View style={styles.heading}>
            <ThemedText type="smallBold" style={{ color: theme.primary }}>FRYSLAGERAPPEN</ThemedText>
            <ThemedText type="title">Ett lager för hela hushållet</ThemedText>
            <ThemedText themeColor="textSecondary">Logga in för att synka frysen säkert mellan era telefoner.</ThemedText>
          </View>
          <TextInput
            accessibilityLabel="E-postadress"
            autoCapitalize="none"
            autoComplete="email"
            inputMode="email"
            placeholder="E-postadress"
            placeholderTextColor={theme.textTertiary}
            value={email}
            onChangeText={setEmail}
            style={[styles.input, { color: theme.text, borderColor: theme.border }]}
          />
          <TextInput
            accessibilityLabel="Lösenord"
            autoCapitalize="none"
            autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
            placeholder="Lösenord, minst 8 tecken"
            placeholderTextColor={theme.textTertiary}
            secureTextEntry
            value={password}
            onChangeText={setPassword}
            style={[styles.input, { color: theme.text, borderColor: theme.border }]}
          />
          {message && <ThemedText type="small" style={{ color: theme.warningText }}>{message}</ThemedText>}
          <Pressable
            accessibilityRole="button"
            disabled={busy || !email.trim() || password.length < 8}
            onPress={submit}
            style={[styles.primary, { backgroundColor: theme.primary }]}>
            {busy ? <ActivityIndicator color="#FFFFFF" /> : <ThemedText type="smallBold" style={styles.white}>{mode === 'signin' ? 'Logga in' : 'Skapa konto'}</ThemedText>}
          </Pressable>
          <Pressable accessibilityRole="button" onPress={() => setMode(mode === 'signin' ? 'signup' : 'signin')}>
            <ThemedText type="smallBold" style={[styles.switchText, { color: theme.primary }]}>
              {mode === 'signin' ? 'Ny här? Skapa konto' : 'Har du redan ett konto? Logga in'}
            </ThemedText>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: Spacing.four },
  card: { width: '100%', maxWidth: Math.min(MaxContentWidth, 480), borderWidth: 1, borderRadius: Radius.xlarge, padding: Spacing.five, gap: Spacing.three },
  heading: { gap: Spacing.two, marginBottom: Spacing.two },
  input: { minHeight: 54, borderWidth: 1, borderRadius: Radius.medium, paddingHorizontal: Spacing.three, fontSize: 16 },
  primary: { minHeight: 54, borderRadius: Radius.medium, alignItems: 'center', justifyContent: 'center' },
  white: { color: '#FFFFFF' },
  switchText: { textAlign: 'center', padding: Spacing.two },
});
