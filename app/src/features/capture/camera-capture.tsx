import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import { useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

import type { CapturePhoto } from './capture-service';
import { capturePhotoFromAsset } from './photo-selection';

export function CameraCapture({ onCaptured }: { onCaptured: (photo: CapturePhoto) => void }) {
  const theme = useTheme();
  const camera = useRef<CameraView>(null);
  const [permission, requestPermission] = useCameraPermissions();
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();

  async function takePhoto() {
    if (!camera.current || !ready || busy) return;
    setBusy(true);
    setError(undefined);
    try {
      const photo = await camera.current.takePictureAsync({ base64: true, quality: 0.55, shutterSound: false });
      if (!photo?.base64) throw new Error('Kameran returnerade ingen bild.');
      onCaptured({ uri: photo.uri, base64: photo.base64, mimeType: 'image/jpeg' });
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : 'Det gick inte att ta fotot.');
    } finally {
      setBusy(false);
    }
  }

  async function choosePhoto() {
    if (busy) return;
    setBusy(true);
    setError(undefined);
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        base64: true,
        quality: 0.55,
      });
      if (!result.canceled) onCaptured(capturePhotoFromAsset(result.assets[0]));
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : 'Det gick inte att välja fotot.');
    } finally {
      setBusy(false);
    }
  }

  if (!permission) return <ActivityIndicator />;
  if (!permission.granted) {
    return (
      <View style={styles.permission}>
        <ThemedText type="sectionTitle">Kameran behövs för snabbregistrering</ThemedText>
        <ThemedText themeColor="textSecondary">Fotot används för att läsa mat och etikett. Du bekräftar alltid innan lagret ändras.</ThemedText>
        <Pressable accessibilityRole="button" disabled={busy} onPress={requestPermission} style={[styles.permissionButton, { backgroundColor: theme.primary }]}>
          <ThemedText type="smallBold" style={styles.white}>Tillåt kamera</ThemedText>
        </Pressable>
        <Pressable accessibilityRole="button" disabled={busy} onPress={choosePhoto} style={[styles.libraryButton, { borderColor: theme.border }]}>
          <ThemedText type="smallBold" style={{ color: theme.primary }}>Välj befintligt foto</ThemedText>
        </Pressable>
        {error && <ThemedText type="small" style={{ color: theme.warningText }}>{error}</ThemedText>}
      </View>
    );
  }

  return (
    <View style={styles.cameraWrap}>
      <CameraView ref={camera} style={styles.camera} facing="back" onCameraReady={() => setReady(true)} />
      <View style={styles.cameraTopBar} pointerEvents="box-none">
        <Pressable accessibilityRole="button" disabled={busy} onPress={choosePhoto} style={styles.libraryOverlayButton}>
          <ThemedText type="smallBold" style={styles.white}>▣ Välj foto</ThemedText>
        </Pressable>
      </View>
      <View style={styles.shutterBar} pointerEvents="box-none">
        <Pressable accessibilityRole="button" accessibilityLabel="Ta foto" disabled={!ready || busy} onPress={takePhoto} style={[styles.shutterOuter, { borderColor: '#FFFFFF' }]}>
          {busy ? <ActivityIndicator color="#FFFFFF" /> : <View style={styles.shutterInner} />}
        </Pressable>
        {error && <ThemedText type="small" style={styles.cameraError}>{error}</ThemedText>}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  permission: { padding: Spacing.five, gap: Spacing.three, alignItems: 'center' },
  permissionButton: { minHeight: 50, borderRadius: Radius.medium, paddingHorizontal: Spacing.four, alignItems: 'center', justifyContent: 'center' },
  libraryButton: { minHeight: 50, borderRadius: Radius.medium, borderWidth: 1, paddingHorizontal: Spacing.four, alignItems: 'center', justifyContent: 'center' },
  white: { color: '#FFFFFF' },
  cameraWrap: { flex: 1, minHeight: 420, backgroundColor: '#000000', overflow: 'hidden' },
  camera: { flex: 1 },
  cameraTopBar: { position: 'absolute', top: Spacing.three, left: 0, right: 0, alignItems: 'flex-end', paddingHorizontal: Spacing.three },
  libraryOverlayButton: { minHeight: 42, borderRadius: Radius.pill, paddingHorizontal: Spacing.three, backgroundColor: '#00000099', alignItems: 'center', justifyContent: 'center' },
  shutterBar: { position: 'absolute', left: 0, right: 0, bottom: Spacing.four, alignItems: 'center', gap: Spacing.two },
  shutterOuter: { width: 76, height: 76, borderRadius: 38, borderWidth: 4, alignItems: 'center', justifyContent: 'center', backgroundColor: '#00000055' },
  shutterInner: { width: 58, height: 58, borderRadius: 29, backgroundColor: '#FFFFFF' },
  cameraError: { color: '#FFFFFF', backgroundColor: '#8B1E1E', paddingHorizontal: Spacing.three, paddingVertical: Spacing.one, borderRadius: Radius.medium },
});
