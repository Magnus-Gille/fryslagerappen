import { Image } from 'expo-image';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

import { useCaptureAnalysis } from './capture-analysis-provider';
import { CameraCapture } from './camera-capture';
import type { CapturePhoto } from './capture-service';
import { VoiceRecorder } from './voice-recorder';

export function CaptureFlow({
  mode,
  onSubmitted,
}: {
  mode: 'photo' | 'voice';
  onSubmitted: () => void;
}) {
  const theme = useTheme();
  const { startCapture } = useCaptureAnalysis();
  const [photo, setPhoto] = useState<CapturePhoto>();
  const [wantVoice, setWantVoice] = useState(mode === 'voice');
  const [error, setError] = useState<string>();

  function submit(audioUri?: string) {
    setError(undefined);
    if (!startCapture({ photo, audioUri })) {
      setError('En annan tolkning pågår redan. Vänta tills den är klar.');
      return;
    }
    onSubmitted();
  }

  if (mode === 'photo' && !photo) return <CameraCapture onCaptured={setPhoto} />;
  if (wantVoice) return <VoiceRecorder onRecorded={submit} />;

  return (
    <View style={styles.review}>
      {photo && <Image source={{ uri: photo.uri }} style={styles.preview} contentFit="cover" />}
      <ThemedText type="sectionTitle">Lägg till en kort beskrivning?</ThemedText>
      <ThemedText themeColor="textSecondary" style={styles.center}>Rösten hjälper när etiketten inte berättar mängd, plats eller om du tar något ur lagret.</ThemedText>
      {error && <ThemedText type="small" style={{ color: theme.warningText }}>{error}</ThemedText>}
      <Pressable accessibilityRole="button" onPress={() => setWantVoice(true)} style={[styles.primary, { backgroundColor: theme.primary }]}><ThemedText type="smallBold" style={styles.white}>🎙️ Beskriv med rösten</ThemedText></Pressable>
      <Pressable accessibilityRole="button" onPress={() => submit()} style={[styles.secondary, { borderColor: theme.border }]}><ThemedText type="smallBold">Analysera bara fotot</ThemedText></Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  review: { flex: 1, alignItems: 'center', padding: Spacing.four, gap: Spacing.three },
  preview: { width: '100%', maxWidth: 520, height: 260, borderRadius: Radius.large, backgroundColor: '#000000' },
  center: { textAlign: 'center', maxWidth: 480 },
  primary: { width: '100%', maxWidth: 480, minHeight: 54, borderRadius: Radius.medium, alignItems: 'center', justifyContent: 'center' },
  secondary: { width: '100%', maxWidth: 480, minHeight: 50, borderWidth: 1, borderRadius: Radius.medium, alignItems: 'center', justifyContent: 'center' },
  white: { color: '#FFFFFF' },
});
