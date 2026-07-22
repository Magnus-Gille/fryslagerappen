import {
  RecordingPresets,
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
  useAudioRecorder,
  useAudioRecorderState,
} from 'expo-audio';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export function VoiceRecorder({ onRecorded }: { onRecorded: (uri: string) => void }) {
  const theme = useTheme();
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const recorderState = useAudioRecorderState(recorder, 100);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const stopTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const stopping = useRef(false);

  useEffect(
    () => () => {
      if (stopTimer.current) clearTimeout(stopTimer.current);
    },
    [],
  );

  async function stopAndSubmit() {
    if (stopping.current) return;
    stopping.current = true;
    setBusy(true);
    setError(undefined);
    if (stopTimer.current) clearTimeout(stopTimer.current);
    stopTimer.current = null;
    try {
      await recorder.stop();
      await setAudioModeAsync({ allowsRecording: false });
      if (!recorder.uri) throw new Error('Inget ljudklipp skapades.');
      onRecorded(recorder.uri);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : 'Röstinspelningen misslyckades.');
    } finally {
      stopping.current = false;
      setBusy(false);
    }
  }

  async function toggle() {
    if (busy) return;
    if (recorderState.isRecording) {
      await stopAndSubmit();
      return;
    }
    setBusy(true);
    setError(undefined);
    try {
      const permission = await requestRecordingPermissionsAsync();
      if (!permission.granted) throw new Error('Mikrofonbehörighet behövs för röstregistrering.');
      await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
      await recorder.prepareToRecordAsync();
      recorder.record();
      stopTimer.current = setTimeout(() => void stopAndSubmit(), 30_000);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : 'Röstinspelningen misslyckades.');
    } finally {
      setBusy(false);
    }
  }

  const seconds = Math.max(0, Math.round(recorderState.durationMillis / 1000));
  return (
    <View style={styles.wrap}>
      <ThemedText type="sectionTitle">{recorderState.isRecording ? `Lyssnar … ${seconds} s` : 'Säg vad som ändras'}</ThemedText>
      <ThemedText themeColor="textSecondary" style={styles.copy}>Till exempel: “Två paket pasta på hyllan i ateljén” eller “Jag tar ut en laxfilé”.</ThemedText>
      <Pressable accessibilityRole="button" accessibilityLabel={recorderState.isRecording ? 'Stoppa inspelning' : 'Starta inspelning'} onPress={toggle} style={[styles.mic, { backgroundColor: recorderState.isRecording ? theme.accent : theme.primary }]}>
        {busy ? <ActivityIndicator color="#FFFFFF" /> : <ThemedText style={styles.micIcon}>{recorderState.isRecording ? '■' : '🎙️'}</ThemedText>}
      </Pressable>
      <ThemedText type="smallBold" style={{ color: recorderState.isRecording ? theme.accent : theme.primary }}>{recorderState.isRecording ? 'Tryck för att stoppa' : 'Tryck och prata'}</ThemedText>
      {error && <ThemedText type="small" style={{ color: theme.warningText }}>{error}</ThemedText>}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.five, gap: Spacing.three },
  copy: { maxWidth: 420, textAlign: 'center' },
  mic: { width: 104, height: 104, borderRadius: Radius.pill, alignItems: 'center', justifyContent: 'center', marginTop: Spacing.three },
  micIcon: { color: '#FFFFFF', fontSize: 36, lineHeight: 44 },
});
