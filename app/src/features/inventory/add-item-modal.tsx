import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { Colors, MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { CaptureFlow } from '@/features/capture/capture-flow';
import { findLocationId, toAddItemInput, type CaptureIntent } from '@/features/capture/capture-intent';
import { useTheme } from '@/hooks/use-theme';

import { useInventory } from './inventory-provider';
import type { AddItemInput } from './types';

type CaptureMode = 'photo' | 'voice' | 'manual';

type Props = {
  visible: boolean;
  onClose: () => void;
};

const categories = ['Frukt & bär', 'Lagad mat', 'Fisk', 'Glass & dessert'];

const manualSuggestion: Omit<AddItemInput, 'locationId'> = {
  name: '',
  category: 'Lagad mat',
  quantity: 1,
  unit: 'låda',
  frozenOn: new Date().toISOString().slice(0, 10),
  eatBefore: '',
  dateSource: 'manual',
  note: '',
};

export function AddItemModal({ visible, onClose }: Props) {
  const theme = useTheme();
  const { state, addItem, removeQuantity, moveItem, consumeItem } = useInventory();
  const [mode, setMode] = useState<CaptureMode | null>(null);
  const [intent, setIntent] = useState<CaptureIntent | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const [form, setForm] = useState<AddItemInput>({
    ...manualSuggestion,
    locationId: 'upstairs',
  });

  function chooseMode(nextMode: CaptureMode) {
    setMode(nextMode);
    setIntent(null);
    setError(undefined);
    if (nextMode === 'manual') {
      setForm({ ...manualSuggestion, locationId: state.locations[0]?.id ?? 'upstairs' });
    }
  }

  function captureComplete(nextIntent: CaptureIntent) {
    setIntent(nextIntent);
    if (nextIntent.action === 'add') setForm(toAddItemInput(nextIntent, state.locations));
  }

  function update<K extends keyof AddItemInput>(key: K, value: AddItemInput[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function save() {
    if (!form.name.trim()) return;
    setBusy(true);
    setError(undefined);
    try {
      await addItem({ ...form, name: form.name.trim(), quantity: Math.max(1, form.quantity) });
      close();
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : 'Det gick inte att spara varan.');
    } finally {
      setBusy(false);
    }
  }

  async function applyCapturedChange() {
    if (!intent || intent.action === 'add') return;
    const wanted = intent.name.toLocaleLowerCase('sv-SE');
    const activeItems = state.items.filter((entry) => entry.status === 'active');
    const exactMatches = activeItems.filter(
      (entry) => entry.name.toLocaleLowerCase('sv-SE') === wanted,
    );
    const partialMatches = activeItems.filter(
      (entry) =>
        entry.name.toLocaleLowerCase('sv-SE').includes(wanted) ||
        wanted.includes(entry.name.toLocaleLowerCase('sv-SE')),
    );
    const matches = exactMatches.length > 0 ? exactMatches : partialMatches;
    if (matches.length === 0) {
      setError(`Hittade ingen aktiv vara som matchar “${intent.name}”.`);
      return;
    }
    if (matches.length > 1) {
      setError(`Hittade ${matches.length} varor som matchar “${intent.name}”. Använd en mer exakt beskrivning.`);
      return;
    }
    const [item] = matches;
    setBusy(true);
    setError(undefined);
    try {
      if (intent.action === 'remove') await removeQuantity(item.id, intent.quantity);
      if (intent.action === 'consume') await consumeItem(item.id);
      if (intent.action === 'move') {
        const destinationId = findLocationId(intent.destinationName, state.locations);
        if (!destinationId) throw new Error('Kunde inte hitta målplatsen.');
        await moveItem(item.id, destinationId);
      }
      close();
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : 'Ändringen misslyckades.');
    } finally {
      setBusy(false);
    }
  }

  function close() {
    setMode(null);
    setIntent(null);
    setError(undefined);
    onClose();
  }

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle={Platform.OS === 'ios' ? 'pageSheet' : 'fullScreen'}
      onRequestClose={close}>
      <SafeAreaView
        accessibilityViewIsModal
        style={[styles.safeArea, { backgroundColor: theme.background }]}>
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={styles.header}>
            <Pressable accessibilityRole="button" onPress={mode ? () => setMode(null) : close}>
              <ThemedText style={{ color: theme.primary }}>{mode ? 'Tillbaka' : 'Stäng'}</ThemedText>
            </Pressable>
            <ThemedText type="itemTitle">Lägg till vara</ThemedText>
            <View style={styles.headerSpacer} />
          </View>

          {mode === null ? (
            <CaptureChooser onChoose={chooseMode} />
          ) : mode !== 'manual' && intent === null ? (
            <CaptureFlow mode={mode} onComplete={captureComplete} />
          ) : intent && intent.action !== 'add' ? (
            <CapturedChangeConfirmation
              intent={intent}
              busy={busy}
              error={error}
              onConfirm={applyCapturedChange}
            />
          ) : (
            <ScrollView
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={styles.formContent}>
              <View style={styles.confirmHeading}>
                <View style={[styles.confidenceIcon, { backgroundColor: theme.successSoft }]}>
                  <ThemedText style={styles.confidenceEmoji}>✓</ThemedText>
                </View>
                <View style={styles.flex}>
                  <ThemedText type="sectionTitle">Kontrollera förslaget</ThemedText>
                  <ThemedText themeColor="textSecondary">
                    Ändra det som inte stämmer innan varan sparas.
                  </ThemedText>
                </View>
              </View>

              <Field label="Namn">
                <TextInput
                  autoFocus={mode === 'manual'}
                  accessibilityLabel="Varans namn"
                  placeholder="Till exempel äppelmos"
                  placeholderTextColor={theme.textTertiary}
                  value={form.name}
                  onChangeText={(value) => update('name', value)}
                  style={[styles.input, { color: theme.text, borderColor: theme.border }]}
                />
              </Field>

              <Field label="Kategori">
                <View style={styles.chipRow}>
                  {categories.map((category) => (
                    <ChoiceChip
                      key={category}
                      label={category}
                      selected={form.category === category}
                      onPress={() => update('category', category)}
                    />
                  ))}
                </View>
              </Field>

              <View style={styles.twoColumns}>
                <Field label="Mängd" style={styles.column}>
                  <TextInput
                    accessibilityLabel="Mängd"
                    inputMode="numeric"
                    value={String(form.quantity)}
                    onChangeText={(value) => update('quantity', Number(value.replace(/\D/g, '')) || 1)}
                    style={[styles.input, { color: theme.text, borderColor: theme.border }]}
                  />
                </Field>
                <Field label="Enhet" style={styles.column}>
                  <TextInput
                    accessibilityLabel="Enhet"
                    value={form.unit}
                    onChangeText={(value) => update('unit', value)}
                    style={[styles.input, { color: theme.text, borderColor: theme.border }]}
                  />
                </Field>
              </View>

              <Field label="Plats">
                <View style={styles.chipRow}>
                  {state.locations.map((location) => (
                    <ChoiceChip
                      key={location.id}
                      label={location.name}
                      selected={form.locationId === location.id}
                      onPress={() => update('locationId', location.id)}
                    />
                  ))}
                </View>
              </Field>

              <View style={styles.twoColumns}>
                <Field label="Infrysning" style={styles.column}>
                  <TextInput
                    accessibilityLabel="Infrysningsdatum"
                    value={form.frozenOn}
                    onChangeText={(value) => update('frozenOn', value)}
                    placeholder="ÅÅÅÅ-MM-DD"
                    placeholderTextColor={theme.textTertiary}
                    style={[styles.input, { color: theme.text, borderColor: theme.border }]}
                  />
                </Field>
                <Field label="Prioritera före" style={styles.column}>
                  <TextInput
                    accessibilityLabel="Prioritera före datum"
                    value={form.eatBefore}
                    onChangeText={(value) => update('eatBefore', value)}
                    placeholder="Valfritt"
                    placeholderTextColor={theme.textTertiary}
                    style={[styles.input, { color: theme.text, borderColor: theme.border }]}
                  />
                </Field>
              </View>

              {form.dateSource === 'estimated' && (
                <View style={[styles.notice, { backgroundColor: theme.warningSoft }]}>
                  <ThemedText type="smallBold" style={{ color: theme.warningText }}>
                    Uppskattat datum
                  </ThemedText>
                  <ThemedText type="small" style={{ color: theme.warningText }}>
                    Planeringsstöd, inte en garanti för att maten är säker att äta.
                  </ThemedText>
                </View>
              )}

              {intent && intent.uncertainFields.length > 0 && (
                <View style={[styles.notice, { backgroundColor: theme.warningSoft }]}>
                  <ThemedText type="smallBold" style={{ color: theme.warningText }}>
                    Kontrollera extra: {intent.uncertainFields.join(', ')}
                  </ThemedText>
                  <ThemedText type="small" style={{ color: theme.warningText }}>
                    Tolkningen är {Math.round(intent.confidence * 100)} % säker.
                  </ThemedText>
                </View>
              )}

              {error && (
                <ThemedText type="small" style={{ color: theme.warningText }}>
                  {error}
                </ThemedText>
              )}

              <Pressable
                accessibilityRole="button"
                disabled={!form.name.trim() || busy}
                onPress={save}
                style={({ pressed }) => [
                  styles.saveButton,
                  { backgroundColor: form.name.trim() ? theme.primary : theme.backgroundElement },
                  pressed && styles.pressed,
                ]}>
                <ThemedText type="smallBold" style={styles.saveText}>
                  {busy ? 'Sparar …' : 'Spara i lagret'}
                </ThemedText>
              </Pressable>
            </ScrollView>
          )}
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
}

function CapturedChangeConfirmation({
  intent,
  busy,
  error,
  onConfirm,
}: {
  intent: CaptureIntent;
  busy: boolean;
  error?: string;
  onConfirm: () => void;
}) {
  const theme = useTheme();
  const actionLabel =
    intent.action === 'remove'
      ? `Ta ut ${intent.quantity} ${intent.unit}`
      : intent.action === 'consume'
        ? 'Markera som förbrukad'
        : `Flytta till ${intent.destinationName ?? 'annan plats'}`;
  return (
    <View style={styles.changeConfirmation}>
      <View style={[styles.confidenceIcon, { backgroundColor: theme.primarySoft }]}>
        <ThemedText style={styles.confidenceEmoji}>🎙️</ThemedText>
      </View>
      <ThemedText type="title">Ändra {intent.name}?</ThemedText>
      <ThemedText themeColor="textSecondary" style={styles.changeCopy}>
        {actionLabel}. Inget ändras förrän du bekräftar.
      </ThemedText>
      {intent.transcript && (
        <View style={[styles.transcript, { backgroundColor: theme.backgroundElement }]}>
          <ThemedText type="caption" themeColor="textSecondary">“{intent.transcript}”</ThemedText>
        </View>
      )}
      {error && <ThemedText type="small" style={{ color: theme.warningText }}>{error}</ThemedText>}
      <Pressable accessibilityRole="button" disabled={busy} onPress={onConfirm} style={[styles.saveButton, styles.changeButton, { backgroundColor: theme.primary }]}>
        <ThemedText type="smallBold" style={styles.saveText}>{busy ? 'Synkar …' : `Bekräfta: ${actionLabel}`}</ThemedText>
      </Pressable>
    </View>
  );
}

function CaptureChooser({ onChoose }: { onChoose: (mode: CaptureMode) => void }) {
  const theme = useTheme();
  return (
    <View style={styles.chooser}>
      <View style={styles.chooserHeading}>
        <ThemedText type="title">Hur vill du börja?</ThemedText>
        <ThemedText themeColor="textSecondary">
          Ta ett foto, säg vad som händer och kontrollera förslaget innan det synkas.
        </ThemedText>
      </View>
      <CaptureButton
        emoji="📷"
        title="Ta ett foto"
        description="Snabbast när etiketten syns"
        primary
        onPress={() => onChoose('photo')}
      />
      <CaptureButton
        emoji="🎙️"
        title="Beskriv med rösten"
        description="Bra när händerna är upptagna"
        onPress={() => onChoose('voice')}
      />
      <CaptureButton
        emoji="⌨️"
        title="Skriv själv"
        description="Fungerar alltid, även utan nät"
        onPress={() => onChoose('manual')}
      />
      <View style={[styles.localBadge, { backgroundColor: theme.successSoft }]}>
        <ThemedText type="caption" style={{ color: theme.successText }}>
          🔒 Du bekräftar varje ändring innan den sparas
        </ThemedText>
      </View>
    </View>
  );
}

function CaptureButton({
  emoji,
  title,
  description,
  primary = false,
  onPress,
}: {
  emoji: string;
  title: string;
  description: string;
  primary?: boolean;
  onPress: () => void;
}) {
  const theme = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.captureButton,
        {
          backgroundColor: primary ? theme.primary : theme.surface,
          borderColor: primary ? theme.primary : theme.border,
        },
        pressed && styles.pressed,
      ]}>
      <ThemedText style={styles.captureEmoji}>{emoji}</ThemedText>
      <View style={styles.flex}>
        <ThemedText type="itemTitle" style={primary && styles.primaryText}>
          {title}
        </ThemedText>
        <ThemedText
          type="small"
          style={primary ? styles.primarySecondaryText : undefined}
          themeColor={primary ? undefined : 'textSecondary'}>
          {description}
        </ThemedText>
      </View>
      <ThemedText style={primary && styles.primaryText}>›</ThemedText>
    </Pressable>
  );
}

function Field({
  label,
  children,
  style,
}: {
  label: string;
  children: React.ReactNode;
  style?: object;
}) {
  return (
    <View style={[styles.field, style]}>
      <ThemedText type="smallBold">{label}</ThemedText>
      {children}
    </View>
  );
}

function ChoiceChip({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  const theme = useTheme();
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ checked: selected }}
      onPress={onPress}
      style={[
        styles.choiceChip,
        {
          backgroundColor: selected ? theme.primarySoft : theme.surface,
          borderColor: selected ? theme.primary : theme.border,
        },
      ]}>
      <ThemedText type="smallBold" style={{ color: selected ? theme.primary : theme.text }}>
        {label}
      </ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  safeArea: { flex: 1 },
  changeConfirmation: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.five, gap: Spacing.three },
  changeCopy: { maxWidth: 480, textAlign: 'center' },
  transcript: { maxWidth: 480, borderRadius: Radius.medium, padding: Spacing.three },
  changeButton: { width: '100%', maxWidth: 480 },
  header: {
    height: 56,
    paddingHorizontal: Spacing.three,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerSpacer: { width: 52 },
  chooser: {
    width: '100%',
    maxWidth: 560,
    alignSelf: 'center',
    padding: Spacing.four,
    gap: Spacing.three,
  },
  chooserHeading: {
    gap: Spacing.two,
    marginBottom: Spacing.three,
  },
  captureButton: {
    minHeight: 82,
    borderWidth: 1,
    borderRadius: Radius.large,
    paddingHorizontal: Spacing.three,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  captureEmoji: { fontSize: 28, lineHeight: 34 },
  primaryText: { color: Colors.dark.text },
  primarySecondaryText: { color: '#D9EAFB' },
  localBadge: {
    alignSelf: 'center',
    marginTop: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: Radius.pill,
  },
  formContent: {
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.three,
    paddingBottom: Spacing.six,
    gap: Spacing.four,
  },
  confirmHeading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    marginBottom: Spacing.two,
  },
  confidenceIcon: {
    width: 48,
    height: 48,
    borderRadius: Radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confidenceEmoji: { color: '#287A4B', fontSize: 22 },
  field: { gap: Spacing.two },
  input: {
    minHeight: 50,
    borderWidth: 1,
    borderRadius: Radius.medium,
    paddingHorizontal: Spacing.three,
    fontSize: 16,
    backgroundColor: 'transparent',
  },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  choiceChip: {
    minHeight: 42,
    borderWidth: 1,
    borderRadius: Radius.pill,
    paddingHorizontal: Spacing.three,
    alignItems: 'center',
    justifyContent: 'center',
  },
  twoColumns: { flexDirection: 'row', gap: Spacing.three },
  column: { flex: 1 },
  notice: { borderRadius: Radius.medium, padding: Spacing.three, gap: Spacing.one },
  saveButton: {
    minHeight: 54,
    borderRadius: Radius.medium,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.two,
  },
  saveText: { color: '#FFFFFF' },
  pressed: { opacity: 0.78, transform: [{ scale: 0.99 }] },
});
