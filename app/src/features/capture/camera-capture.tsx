import { CameraView, useCameraPermissions } from 'expo-camera';
import { useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

import type { CapturePhoto } from './capture-service';

export function CameraCapture({ onCaptured }: { onCaptured: (photo: CapturePhoto) => void }) {
  const theme = useTheme();
  const camera = useRef<CameraView>(null);
  const [permission, requestPermission] = useCameraPermissions();
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);

  async function takePhoto() {
    if (!camera.current || !ready || busy) return;
    setBusy(true);
    try {
      const photo = await camera.current.takePictureAsync({ base64: true, quality: 0.55, shutterSound: false });
      if (!photo?.base64) throw new Error('Kameran returnerade ingen bild.');
      onCaptured({ uri: photo.uri, base64: photo.base64, mimeType: 'image/jpeg' });
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
        <Pressable accessibilityRole="button" onPress={requestPermission} style={[styles.permissionButton, { backgroundColor: theme.primary }]}>
          <ThemedText type="smallBold" style={styles.white}>Tillåt kamera</ThemedText>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.cameraWrap}>
      <CameraView ref={camera} style={styles.camera} facing="back" onCameraReady={() => setReady(true)} />
      <View style={styles.shutterBar} pointerEvents="box-none">
        <Pressable accessibilityRole="button" accessibilityLabel="Ta foto" disabled={!ready || busy} onPress={takePhoto} style={[styles.shutterOuter, { borderColor: '#FFFFFF' }]}>
          {busy ? <ActivityIndicator color="#FFFFFF" /> : <View style={styles.shutterInner} />}
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  permission: { padding: Spacing.five, gap: Spacing.three, alignItems: 'center' },
  permissionButton: { minHeight: 50, borderRadius: Radius.medium, paddingHorizontal: Spacing.four, alignItems: 'center', justifyContent: 'center' },
  white: { color: '#FFFFFF' },
  cameraWrap: { flex: 1, minHeight: 420, backgroundColor: '#000000', overflow: 'hidden' },
  camera: { flex: 1 },
  shutterBar: { position: 'absolute', left: 0, right: 0, bottom: Spacing.four, alignItems: 'center' },
  shutterOuter: { width: 76, height: 76, borderRadius: 38, borderWidth: 4, alignItems: 'center', justifyContent: 'center', backgroundColor: '#00000055' },
  shutterInner: { width: 58, height: 58, borderRadius: 29, backgroundColor: '#FFFFFF' },
});
