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
import { useTheme } from '@/hooks/use-theme';

import { useInventory } from './inventory-provider';
import type { AddItemInput } from './types';

type CaptureMode = 'photo' | 'voice' | 'manual';

type Props = {
  visible: boolean;
  onClose: () => void;
};

const categories = ['Frukt & bär', 'Lagad mat', 'Fisk', 'Glass & dessert'];

const suggestions: Record<CaptureMode, Omit<AddItemInput, 'locationId'>> = {
  photo: {
    name: 'Blåbärssylt',
    category: 'Frukt & bär',
    quantity: 2,
    unit: 'burkar',
    frozenOn: '2026-07-22',
    eatBefore: '2027-01-22',
    dateSource: 'label',
    note: 'Etikett avläst från simulerat foto',
  },
  voice: {
    name: 'Äppelmos',
    category: 'Frukt & bär',
    quantity: 3,
    unit: 'burkar',
    frozenOn: '2026-07-22',
    eatBefore: '2027-01-22',
    dateSource: 'estimated',
    note: '“Tre burkar äppelmos i frysboxen nere”',
  },
  manual: {
    name: '',
    category: 'Lagad mat',
    quantity: 1,
    unit: 'låda',
    frozenOn: '2026-07-22',
    eatBefore: '',
    dateSource: 'manual',
    note: '',
  },
};

export function AddItemModal({ visible, onClose }: Props) {
  const theme = useTheme();
  const { state, addItem } = useInventory();
  const [mode, setMode] = useState<CaptureMode | null>(null);
  const [form, setForm] = useState<AddItemInput>({
    ...suggestions.voice,
    locationId: 'downstairs',
  });

  function chooseMode(nextMode: CaptureMode) {
    setMode(nextMode);
    setForm({
      ...suggestions[nextMode],
      locationId: nextMode === 'manual' ? 'upstairs' : 'downstairs',
    });
  }

  function update<K extends keyof AddItemInput>(key: K, value: AddItemInput[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function save() {
    if (!form.name.trim()) return;
    addItem({ ...form, name: form.name.trim(), quantity: Math.max(1, form.quantity) });
    setMode(null);
    onClose();
  }

  function close() {
    setMode(null);
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

              <Pressable
                accessibilityRole="button"
                disabled={!form.name.trim()}
                onPress={save}
                style={({ pressed }) => [
                  styles.saveButton,
                  { backgroundColor: form.name.trim() ? theme.primary : theme.backgroundElement },
                  pressed && styles.pressed,
                ]}>
                <ThemedText type="smallBold" style={styles.saveText}>
                  Spara i lagret
                </ThemedText>
              </Pressable>
            </ScrollView>
          )}
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
}

function CaptureChooser({ onChoose }: { onChoose: (mode: CaptureMode) => void }) {
  const theme = useTheme();
  return (
    <View style={styles.chooser}>
      <View style={styles.chooserHeading}>
        <ThemedText type="title">Hur vill du börja?</ThemedText>
        <ThemedText themeColor="textSecondary">
          Prototypen simulerar tolkningen så att vi kan testa flödet utan att skicka foton eller ljud.
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
          ● Lokal prototyp · inget lämnar enheten
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
