import { Image } from 'expo-image';
import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { diagnosticError, reportTelemetry } from '@/lib/telemetry';

import { CameraCapture } from './camera-capture';
import type { CaptureIntent } from './capture-intent';
import { extractInventoryIntent, type CapturePhoto, useCaptureHomeId } from './capture-service';
import { VoiceRecorder } from './voice-recorder';

export function CaptureFlow({ mode, onComplete }: { mode: 'photo' | 'voice'; onComplete: (intent: CaptureIntent) => void }) {
  const theme = useTheme();
  const homeId = useCaptureHomeId();
  const [photo, setPhoto] = useState<CapturePhoto>();
  const [wantVoice, setWantVoice] = useState(mode === 'voice');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();

  async function analyze(audioUri?: string) {
    if (!homeId) {
      setError('Riktig foto- och rösttolkning kräver ett inloggat hem.');
      return;
    }
    setBusy(true);
    setError(undefined);
    const startedAt = Date.now();
    const stage = photo && audioUri ? 'photo_voice' : photo ? 'photo' : 'voice';
    void reportTelemetry('capture_extraction_started', { stage });
    try {
      const intent = await extractInventoryIntent({ homeId, photo, audioUri });
      void reportTelemetry('capture_extraction_succeeded', {
        stage,
        durationMs: Date.now() - startedAt,
      });
      onComplete(intent);
    } catch (nextError) {
      void reportTelemetry('capture_extraction_failed', {
        stage,
        durationMs: Date.now() - startedAt,
        ...diagnosticError(nextError),
      });
      setError(nextError instanceof Error ? nextError.message : 'Tolkningen misslyckades. Försök igen.');
    } finally {
      setBusy(false);
    }
  }

  if (busy) {
    return <View style={styles.loading}><ActivityIndicator size="large" color={theme.primary} /><ThemedText type="sectionTitle">Tolkar foto och röst …</ThemedText><ThemedText themeColor="textSecondary">Du får kontrollera förslaget innan något sparas.</ThemedText></View>;
  }
  if (mode === 'photo' && !photo) return <CameraCapture onCaptured={setPhoto} />;
  if (wantVoice) return <VoiceRecorder onRecorded={analyze} />;

  return (
    <View style={styles.review}>
      {photo && <Image source={{ uri: photo.uri }} style={styles.preview} contentFit="cover" />}
      <ThemedText type="sectionTitle">Lägg till en kort beskrivning?</ThemedText>
      <ThemedText themeColor="textSecondary" style={styles.center}>Rösten hjälper när etiketten inte berättar mängd, plats eller om du tar något ur lagret.</ThemedText>
      {error && <ThemedText type="small" style={{ color: theme.warningText }}>{error}</ThemedText>}
      <Pressable accessibilityRole="button" onPress={() => setWantVoice(true)} style={[styles.primary, { backgroundColor: theme.primary }]}><ThemedText type="smallBold" style={styles.white}>🎙️ Beskriv med rösten</ThemedText></Pressable>
      <Pressable accessibilityRole="button" onPress={() => analyze()} style={[styles.secondary, { borderColor: theme.border }]}><ThemedText type="smallBold">Analysera bara fotot</ThemedText></Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.five, gap: Spacing.three },
  review: { flex: 1, alignItems: 'center', padding: Spacing.four, gap: Spacing.three },
  preview: { width: '100%', maxWidth: 520, height: 260, borderRadius: Radius.large, backgroundColor: '#000000' },
  center: { textAlign: 'center', maxWidth: 480 },
  primary: { width: '100%', maxWidth: 480, minHeight: 54, borderRadius: Radius.medium, alignItems: 'center', justifyContent: 'center' },
  secondary: { width: '100%', maxWidth: 480, minHeight: 50, borderWidth: 1, borderRadius: Radius.medium, alignItems: 'center', justifyContent: 'center' },
  white: { color: '#FFFFFF' },
});
