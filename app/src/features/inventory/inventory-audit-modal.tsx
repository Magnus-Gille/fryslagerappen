import { useEffect, useMemo, useState } from 'react';
import {
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
import { MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { FeedbackOverlay } from '@/features/feedback/feedback-overlay';
import { useTheme } from '@/hooks/use-theme';
import { diagnosticError, reportTelemetry } from '@/lib/telemetry';

import {
  buildAuditRequest,
  createAuditDraft,
  updateAuditQuantity,
} from './inventory-audit';
import { useInventory } from './inventory-provider';
import { storagePlaceLabel } from './storage-place';
import type { AuditExtraInput } from './types';

type Props = {
  visible: boolean;
  initialLocationId?: string;
  onClose: () => void;
};

const emptyExtra: AuditExtraInput = {
  name: '',
  category: 'Torrvaror',
  quantity: 1,
  unit: 'st',
  note: '',
};

export function InventoryAuditModal({ visible, initialLocationId, onClose }: Props) {
  const theme = useTheme();
  const { state, submitAudit } = useInventory();
  const [locationId, setLocationId] = useState(
    initialLocationId ?? state.locations[0]?.id ?? '',
  );
  const expectedItems = useMemo(
    () =>
      state.items.filter(
        (item) => item.locationId === locationId && item.status === 'active',
      ),
    [locationId, state.items],
  );
  const [draft, setDraft] = useState(() => createAuditDraft(expectedItems));
  const [extras, setExtras] = useState<AuditExtraInput[]>([]);
  const [extra, setExtra] = useState<AuditExtraInput>(emptyExtra);
  const [reviewing, setReviewing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();

  useEffect(() => {
    if (visible) void reportTelemetry('inventory_audit_started', { stage: 'edit' });
  }, [visible]);

  const request = buildAuditRequest(locationId, expectedItems, draft, extras);
  const changeCount = request.rows.length + request.extras.length;
  const changeLabel = `${changeCount} ${changeCount === 1 ? 'ändring' : 'ändringar'}`;

  function addExtra() {
    if (!extra.name.trim() || extra.quantity <= 0) return;
    setExtras((current) => [...current, { ...extra, name: extra.name.trim() }]);
    setExtra(emptyExtra);
  }

  async function confirm() {
    setBusy(true);
    setError(undefined);
    try {
      await submitAudit(locationId, request);
      void reportTelemetry('inventory_audit_succeeded', {
        stage: 'commit',
      });
      onClose();
    } catch (nextError) {
      void reportTelemetry('inventory_audit_failed', {
        stage: 'commit',
        ...diagnosticError(nextError),
      });
      setError(
        nextError instanceof Error
          ? nextError.message
          : 'Inventeringen kunde inte sparas.',
      );
      setReviewing(false);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle={Platform.OS === 'ios' ? 'pageSheet' : 'fullScreen'}
      onRequestClose={onClose}>
      <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.background }]}>
        <View style={styles.header}>
          <Pressable accessibilityRole="button" onPress={reviewing ? () => setReviewing(false) : onClose}>
            <ThemedText style={{ color: theme.primary }}>
              {reviewing ? 'Tillbaka' : 'Stäng'}
            </ThemedText>
          </Pressable>
          <ThemedText type="itemTitle">Inventera plats</ThemedText>
          <FeedbackOverlay
            context={{
              route: '/',
              screen: 'inventory',
              flow: 'inventory-audit',
              step: reviewing ? 'review' : 'count',
            }}
            placement="header"
          />
        </View>

        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.content}>
          {reviewing ? (
            <>
              <View style={styles.heading}>
                <ThemedText type="title">Bekräfta {changeLabel}</ThemedText>
                <ThemedText themeColor="textSecondary">
                  Allt sparas samtidigt. Om lagret har ändrats på en annan telefon stoppas hela inventeringen.
                </ThemedText>
              </View>
              {request.rows.map((row) => {
                const item = expectedItems.find((entry) => entry.id === row.itemId)!;
                return (
                  <View key={row.itemId} style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                    <ThemedText type="itemTitle">{item.name}</ThemedText>
                    <ThemedText themeColor="textSecondary">
                      {item.quantity} → {row.observedQuantity} {item.unit}
                    </ThemedText>
                  </View>
                );
              })}
              {request.extras.map((item, index) => (
                <View key={`${item.name}-${index}`} style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                  <ThemedText type="itemTitle">Ny: {item.name}</ThemedText>
                  <ThemedText themeColor="textSecondary">{item.quantity} {item.unit}</ThemedText>
                </View>
              ))}
              {error && <ThemedText style={{ color: theme.warningText }}>{error}</ThemedText>}
              <PrimaryButton
                label={busy ? 'Sparar allt …' : 'Bekräfta inventeringen'}
                disabled={busy}
                onPress={() => void confirm()}
              />
            </>
          ) : (
            <>
              <View style={styles.heading}>
                <ThemedText type="title">Vad finns faktiskt här?</ThemedText>
                <ThemedText themeColor="textSecondary">
                  Räkna bara avvikelser. Oförändrade varor lämnas som de är.
                </ThemedText>
              </View>

              <View style={styles.chips}>
                {state.locations.map((location) => (
                  <Pressable
                    key={location.id}
                    accessibilityRole="radio"
                    accessibilityState={{ checked: location.id === locationId }}
                    onPress={() => {
                      setLocationId(location.id);
                      setDraft(
                        createAuditDraft(
                          state.items.filter(
                            (item) =>
                              item.locationId === location.id && item.status === 'active',
                          ),
                        ),
                      );
                      setExtras([]);
                      setExtra(emptyExtra);
                      setReviewing(false);
                      setError(undefined);
                    }}
                    style={[
                      styles.chip,
                      {
                        backgroundColor:
                          location.id === locationId ? theme.primarySoft : theme.surface,
                        borderColor: location.id === locationId ? theme.primary : theme.border,
                      },
                    ]}>
                    <ThemedText type="smallBold">{storagePlaceLabel(location)}</ThemedText>
                  </Pressable>
                ))}
              </View>

              <View style={styles.section}>
                <ThemedText type="sectionTitle">Förväntat lager</ThemedText>
                {expectedItems.length === 0 ? (
                  <ThemedText themeColor="textSecondary">Inga registrerade varor på platsen.</ThemedText>
                ) : (
                  expectedItems.map((item) => {
                    const quantity = draft[item.id] ?? item.quantity;
                    return (
                      <View key={item.id} style={[styles.itemRow, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                        <View style={styles.flex}>
                          <ThemedText type="itemTitle">{item.name}</ThemedText>
                          <ThemedText type="small" themeColor="textSecondary">
                            Registrerat: {item.quantity} {item.unit}
                          </ThemedText>
                        </View>
                        <Pressable
                          accessibilityRole="button"
                          accessibilityLabel={`Minska ${item.name}`}
                          onPress={() =>
                            setDraft((current) =>
                              updateAuditQuantity(
                                current,
                                item.id,
                                (current[item.id] ?? item.quantity) - 1,
                              ),
                            )
                          }
                          style={[styles.counterButton, { backgroundColor: theme.backgroundElement }]}>
                          <ThemedText type="sectionTitle">−</ThemedText>
                        </Pressable>
                        <ThemedText type="itemTitle" style={styles.counterValue}>{quantity}</ThemedText>
                        <Pressable
                          accessibilityRole="button"
                          accessibilityLabel={`Öka ${item.name}`}
                          onPress={() =>
                            setDraft((current) =>
                              updateAuditQuantity(
                                current,
                                item.id,
                                (current[item.id] ?? item.quantity) + 1,
                              ),
                            )
                          }
                          style={[styles.counterButton, { backgroundColor: theme.backgroundElement }]}>
                          <ThemedText type="sectionTitle">+</ThemedText>
                        </Pressable>
                        <Pressable
                          accessibilityRole="button"
                          accessibilityLabel={`${item.name} saknas`}
                          onPress={() =>
                            setDraft((current) => updateAuditQuantity(current, item.id, 0))
                          }
                          style={styles.missingButton}>
                          <ThemedText type="caption" style={{ color: theme.warningText }}>Saknas</ThemedText>
                        </Pressable>
                      </View>
                    );
                  })
                )}
              </View>

              <View style={styles.section}>
                <ThemedText type="sectionTitle">Extra fynd</ThemedText>
                {extras.map((item, index) => (
                  <View key={`${item.name}-${index}`} style={styles.extraSummary}>
                    <ThemedText>{item.name} · {item.quantity} {item.unit}</ThemedText>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={`Ta bort ${item.name}`}
                      onPress={() =>
                        setExtras((current) =>
                          current.filter((_, itemIndex) => itemIndex !== index)
                        )
                      }>
                      <ThemedText style={{ color: theme.warningText }}>Ta bort</ThemedText>
                    </Pressable>
                  </View>
                ))}
                <TextInput
                  accessibilityLabel="Namn på extra fynd"
                  placeholder="Till exempel havregryn"
                  placeholderTextColor={theme.textTertiary}
                  value={extra.name}
                  onChangeText={(name) => setExtra((current) => ({ ...current, name }))}
                  style={[styles.input, { color: theme.text, borderColor: theme.border }]}
                />
                <View style={styles.inputRow}>
                  <TextInput
                    accessibilityLabel="Mängd för extra fynd"
                    inputMode="numeric"
                    value={String(extra.quantity)}
                    onChangeText={(value) => setExtra((current) => ({
                      ...current,
                      quantity: Number(value.replace(/\D/g, '')) || 1,
                    }))}
                    style={[styles.input, styles.flex, { color: theme.text, borderColor: theme.border }]}
                  />
                  <TextInput
                    accessibilityLabel="Enhet för extra fynd"
                    value={extra.unit}
                    onChangeText={(unit) => setExtra((current) => ({ ...current, unit }))}
                    style={[styles.input, styles.flex, { color: theme.text, borderColor: theme.border }]}
                  />
                  <Pressable
                    accessibilityRole="button"
                    onPress={addExtra}
                    style={[styles.addExtra, { backgroundColor: theme.primarySoft }]}>
                    <ThemedText type="smallBold" style={{ color: theme.primary }}>Lägg till</ThemedText>
                  </Pressable>
                </View>
              </View>

              {error && <ThemedText style={{ color: theme.warningText }}>{error}</ThemedText>}
              <PrimaryButton
                label={changeCount ? `Granska ${changeLabel}` : 'Inga avvikelser'}
                disabled={changeCount === 0}
                onPress={() => setReviewing(true)}
              />
            </>
          )}
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

function PrimaryButton({
  label,
  disabled,
  onPress,
}: {
  label: string;
  disabled: boolean;
  onPress: () => void;
}) {
  const theme = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={[
        styles.primaryButton,
        { backgroundColor: disabled ? theme.backgroundElement : theme.primary },
      ]}>
      <ThemedText type="smallBold" style={styles.primaryText}>{label}</ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  flex: { flex: 1 },
  header: { height: 56, paddingHorizontal: Spacing.three, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  content: { width: '100%', maxWidth: MaxContentWidth, alignSelf: 'center', padding: Spacing.four, paddingBottom: Spacing.six, gap: Spacing.four },
  heading: { gap: Spacing.two },
  section: { gap: Spacing.three },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  chip: { minHeight: 42, borderWidth: 1, borderRadius: Radius.pill, paddingHorizontal: Spacing.three, alignItems: 'center', justifyContent: 'center' },
  card: { borderWidth: 1, borderRadius: Radius.large, padding: Spacing.three, gap: Spacing.one },
  itemRow: { borderWidth: 1, borderRadius: Radius.large, padding: Spacing.three, flexDirection: 'row', alignItems: 'center', gap: Spacing.two, flexWrap: 'wrap' },
  counterButton: { width: 38, height: 38, borderRadius: Radius.pill, alignItems: 'center', justifyContent: 'center' },
  counterValue: { minWidth: 28, textAlign: 'center' },
  missingButton: { paddingHorizontal: Spacing.two, minHeight: 38, justifyContent: 'center' },
  extraSummary: { flexDirection: 'row', justifyContent: 'space-between', gap: Spacing.three },
  inputRow: { flexDirection: 'row', gap: Spacing.two },
  input: { minHeight: 48, borderWidth: 1, borderRadius: Radius.medium, paddingHorizontal: Spacing.three, fontSize: 16 },
  addExtra: { minHeight: 48, borderRadius: Radius.medium, paddingHorizontal: Spacing.three, justifyContent: 'center' },
  primaryButton: { minHeight: 54, borderRadius: Radius.medium, alignItems: 'center', justifyContent: 'center' },
  primaryText: { color: '#fff' },
});
