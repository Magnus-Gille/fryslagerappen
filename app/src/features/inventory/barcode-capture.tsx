import { CameraView, useCameraPermissions } from 'expo-camera';
import { useRef, useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useHome } from '@/features/home/home-provider';
import { useTheme } from '@/hooks/use-theme';
import { diagnosticError, reportTelemetry } from '@/lib/telemetry';

import {
  lookupBarcode,
  normalizeBarcode,
  type BarcodeProductProposal,
} from './barcode-service';

type Props = {
  onResolved: (product: BarcodeProductProposal) => void;
};

export function BarcodeCapture({ onResolved }: Props) {
  const theme = useTheme();
  const { home } = useHome();
  const [permission, requestPermission] = useCameraPermissions();
  const [manualCode, setManualCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const locked = useRef(false);

  async function resolve(value: string) {
    const barcode = normalizeBarcode(value);
    if (!barcode || locked.current) {
      if (!barcode) setError('Streckkoden ska innehålla 8–14 siffror.');
      return;
    }
    locked.current = true;
    setBusy(true);
    setError(undefined);
    const startedAt = Date.now();
    void reportTelemetry('barcode_scan_started', { stage: 'camera' });
    try {
      const product = await lookupBarcode(barcode, home?.id ?? 'local');
      void reportTelemetry('barcode_lookup_succeeded', {
        stage: product.mappingSource,
        durationMs: Date.now() - startedAt,
      });
      onResolved(product);
    } catch (nextError) {
      locked.current = false;
      void reportTelemetry('barcode_lookup_failed', {
        stage: 'lookup',
        durationMs: Date.now() - startedAt,
        ...diagnosticError(nextError),
      });
      setError(
        nextError instanceof Error
          ? nextError.message
          : 'Produkten kunde inte hittas. Lägg till den manuellt.',
      );
    } finally {
      setBusy(false);
    }
  }

  if (!permission) return <View style={styles.center}><ThemedText>Laddar kameran …</ThemedText></View>;
  if (!permission.granted) {
    return (
      <View style={styles.center}>
        <ThemedText type="sectionTitle">Kameran behövs för streckkoden</ThemedText>
        <ThemedText themeColor="textSecondary" style={styles.centered}>
          Du kan också skriva in siffrorna under streckkoden.
        </ThemedText>
        <Pressable
          accessibilityRole="button"
          onPress={requestPermission}
          style={[styles.primaryButton, { backgroundColor: theme.primary }]}>
          <ThemedText type="smallBold" style={styles.buttonText}>Tillåt kamera</ThemedText>
        </Pressable>
        <ManualBarcode
          value={manualCode}
          busy={busy}
          error={error}
          onChange={setManualCode}
          onSubmit={() => void resolve(manualCode)}
        />
      </View>
    );
  }

  return (
    <View style={styles.content}>
      <View style={[styles.cameraFrame, { borderColor: theme.border }]}>
        <CameraView
          style={StyleSheet.absoluteFill}
          barcodeScannerSettings={{ barcodeTypes: ['ean13', 'ean8', 'upc_a', 'upc_e'] }}
          onBarcodeScanned={({ data }) => void resolve(data)}
        />
        <View pointerEvents="none" style={[styles.guide, { borderColor: theme.surface }]} />
      </View>
      <View style={styles.copy}>
        <ThemedText type="sectionTitle">{busy ? 'Slår upp varan …' : 'Rikta mot streckkoden'}</ThemedText>
        <ThemedText themeColor="textSecondary">
          Hemmets bekräftade träffar och lokala cache används först.
        </ThemedText>
      </View>
      <ManualBarcode
        value={manualCode}
        busy={busy}
        error={error}
        onChange={setManualCode}
        onSubmit={() => void resolve(manualCode)}
      />
    </View>
  );
}

function ManualBarcode({
  value,
  busy,
  error,
  onChange,
  onSubmit,
}: {
  value: string;
  busy: boolean;
  error?: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
}) {
  const theme = useTheme();
  return (
    <View style={styles.manual}>
      <TextInput
        accessibilityLabel="Streckkod"
        inputMode="numeric"
        placeholder="Skriv 8–14 siffror"
        placeholderTextColor={theme.textTertiary}
        value={value}
        onChangeText={onChange}
        onSubmitEditing={onSubmit}
        style={[styles.input, { color: theme.text, borderColor: theme.border }]}
      />
      <Pressable
        accessibilityRole="button"
        disabled={busy}
        onPress={onSubmit}
        style={[styles.lookupButton, { backgroundColor: theme.primary }]}>
        <ThemedText type="smallBold" style={styles.buttonText}>Slå upp</ThemedText>
      </Pressable>
      {error && <ThemedText type="small" style={{ color: theme.warningText }}>{error}</ThemedText>}
    </View>
  );
}

const styles = StyleSheet.create({
  content: { flex: 1, padding: Spacing.three, gap: Spacing.three },
  center: { flex: 1, padding: Spacing.five, alignItems: 'center', justifyContent: 'center', gap: Spacing.three },
  centered: { textAlign: 'center' },
  cameraFrame: { flex: 1, minHeight: 280, overflow: 'hidden', borderRadius: Radius.large, borderWidth: 1 },
  guide: { position: 'absolute', left: '10%', right: '10%', top: '35%', height: 110, borderWidth: 3, borderRadius: Radius.medium },
  copy: { gap: Spacing.one },
  manual: { gap: Spacing.two },
  input: { minHeight: 50, borderWidth: 1, borderRadius: Radius.medium, paddingHorizontal: Spacing.three, fontSize: 17 },
  lookupButton: { minHeight: 48, borderRadius: Radius.pill, alignItems: 'center', justifyContent: 'center' },
  primaryButton: { paddingHorizontal: Spacing.four, minHeight: 48, borderRadius: Radius.pill, justifyContent: 'center' },
  buttonText: { color: '#fff' },
});
