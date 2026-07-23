import { useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { useAuth } from '@/features/auth/auth-provider';
import { FeedbackOverlay } from '@/features/feedback/feedback-overlay';
import { useInventory } from '@/features/inventory/inventory-provider';
import { storageTypeDetails, storageTypeOptions } from '@/features/inventory/storage-place';
import type { StoragePlace, StoragePlaceInput, StorageType } from '@/features/inventory/types';
import { useTheme } from '@/hooks/use-theme';

import { useHome } from './home-provider';

const emptyPlace: StoragePlaceInput = { name: '', description: '', storageType: 'freezer' };

export function HomeMenu({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const theme = useTheme();
  const { user, signOut } = useAuth();
  const { home, members, renameHome, createInvite, removeMember } = useHome();
  const { state, createStoragePlace, updateStoragePlace, archiveStoragePlace } = useInventory();
  const [editedHomeName, setEditedHomeName] = useState<string>();
  const [editingPlace, setEditingPlace] = useState<StoragePlace>();
  const [showPlaceForm, setShowPlaceForm] = useState(false);
  const [placeForm, setPlaceForm] = useState<StoragePlaceInput>(emptyPlace);
  const [token, setToken] = useState<string>();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const canManage = !home || home.role === 'owner';
  const homeName = editedHomeName ?? home?.name ?? 'Mitt hem';
  const feedbackStep = showPlaceForm
    ? 'storage-place-form'
    : token
      ? 'invitation-created'
      : 'settings';

  function beginPlace(place?: StoragePlace) {
    setEditingPlace(place);
    setShowPlaceForm(true);
    setPlaceForm(place ? { name: place.name, description: place.description, storageType: place.storageType } : emptyPlace);
    setError(undefined);
  }

  async function run(operation: () => Promise<void>) {
    setBusy(true);
    setError(undefined);
    try {
      await operation();
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : 'Ändringen kunde inte sparas.');
    } finally {
      setBusy(false);
    }
  }

  async function saveName() {
    if (!home || homeName.trim() === home.name || !homeName.trim()) return;
    await run(async () => {
      await renameHome(homeName.trim());
      setEditedHomeName(undefined);
    });
  }

  async function invite() {
    await run(async () => {
      const nextToken = await createInvite();
      setToken(nextToken);
      if (Platform.OS !== 'web') {
        await Share.share({ message: `Anslut till ${home?.name ?? 'mitt hem'} i Fryslagerappen med koden: ${nextToken}` });
      }
    });
  }

  async function savePlace() {
    if (!placeForm.name.trim()) return;
    await run(async () => {
      const input = { ...placeForm, name: placeForm.name.trim(), description: placeForm.description.trim() };
      if (editingPlace) await updateStoragePlace(editingPlace.id, input);
      else await createStoragePlace(input);
      setEditingPlace(undefined);
      setShowPlaceForm(false);
      setPlaceForm(emptyPlace);
    });
  }

  async function closeAndSignOut() {
    await signOut();
    onClose();
  }

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle={Platform.OS === 'ios' ? 'pageSheet' : 'fullScreen'}
      onRequestClose={onClose}>
      <SafeAreaView style={[styles.screen, { backgroundColor: theme.background }]}>
        <View style={styles.header}>
          <Pressable accessibilityRole="button" onPress={onClose}>
            <ThemedText style={{ color: theme.primary }}>Stäng</ThemedText>
          </Pressable>
          <ThemedText type="itemTitle">Hem</ThemedText>
          <FeedbackOverlay
            context={{
              route: '/',
              screen: 'home-settings',
              flow: 'home-settings',
              step: feedbackStep,
            }}
            placement="header"
          />
        </View>
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.scrollContent}>
          <View style={styles.content}>
            <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
              <ThemedText type="sectionTitle">Hemmets namn</ThemedText>
              {canManage && home ? (
                <View style={styles.inlineForm}>
                  <TextInput
                    accessibilityLabel="Hemmets namn"
                    value={homeName}
                    onChangeText={setEditedHomeName}
                    style={[styles.input, styles.flex, { color: theme.text, borderColor: theme.border }]}
                  />
                  <Pressable
                    accessibilityRole="button"
                    disabled={busy || !homeName.trim() || homeName.trim() === home.name}
                    onPress={() => void saveName()}
                    style={[styles.compactPrimary, { backgroundColor: theme.primary }]}>
                    <ThemedText type="smallBold" style={styles.white}>Spara</ThemedText>
                  </Pressable>
                </View>
              ) : (
                <ThemedText type="title">{home?.name ?? 'Demoläge'}</ThemedText>
              )}
              <ThemedText type="caption" themeColor="textTertiary">
                {home ? `Din roll: ${home.role === 'owner' ? 'Ägare' : 'Medlem'}` : 'Lokala exempeldata sparas inte mellan enheter.'}
              </ThemedText>
            </View>

            <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
              <View style={styles.sectionHeading}>
                <View style={styles.flex}>
                  <ThemedText type="sectionTitle">Förvaringsplatser</ThemedText>
                  <ThemedText type="small" themeColor="textSecondary">
                    Flera frysar, kylskåp och torrförråd går bra.
                  </ThemedText>
                </View>
                {canManage && (
                  <Pressable accessibilityRole="button" onPress={() => beginPlace()}>
                    <ThemedText type="smallBold" style={{ color: theme.primary }}>＋ Ny plats</ThemedText>
                  </Pressable>
                )}
              </View>
              <View style={styles.placeList}>
                {state.locations.map((place) => {
                  const type = storageTypeDetails(place.storageType);
                  return (
                    <View key={place.id} style={[styles.placeRow, { borderColor: theme.border }]}>
                      <ThemedText style={styles.placeIcon}>{type.icon}</ThemedText>
                      <View style={styles.flex}>
                        <ThemedText type="smallBold">{place.name}</ThemedText>
                        <ThemedText type="caption" themeColor="textSecondary">
                          {type.label}{place.description ? ` · ${place.description}` : ''}
                        </ThemedText>
                      </View>
                      {canManage && (
                        <View style={styles.rowActions}>
                          <Pressable accessibilityRole="button" accessibilityLabel={`Redigera ${place.name}`} onPress={() => beginPlace(place)}>
                            <ThemedText type="caption" style={{ color: theme.primary }}>Redigera</ThemedText>
                          </Pressable>
                          <Pressable accessibilityRole="button" accessibilityLabel={`Ta bort ${place.name}`} disabled={busy} onPress={() => void run(() => archiveStoragePlace(place.id))}>
                            <ThemedText type="caption" style={{ color: theme.warningText }}>Ta bort</ThemedText>
                          </Pressable>
                        </View>
                      )}
                    </View>
                  );
                })}
              </View>

              {canManage && showPlaceForm && (
                <View style={[styles.placeForm, { borderColor: theme.border }]}>
                  <ThemedText type="smallBold">{editingPlace ? 'Redigera plats' : 'Ny förvaringsplats'}</ThemedText>
                  <TextInput
                    accessibilityLabel="Förvaringsplatsens namn"
                    placeholder="Till exempel Frysen i källaren"
                    placeholderTextColor={theme.textTertiary}
                    value={placeForm.name}
                    onChangeText={(name) => setPlaceForm((current) => ({ ...current, name }))}
                    style={[styles.input, { color: theme.text, borderColor: theme.border }]}
                  />
                  <TextInput
                    accessibilityLabel="Beskrivning av förvaringsplats"
                    placeholder="Beskrivning (valfri)"
                    placeholderTextColor={theme.textTertiary}
                    value={placeForm.description}
                    onChangeText={(description) => setPlaceForm((current) => ({ ...current, description }))}
                    style={[styles.input, { color: theme.text, borderColor: theme.border }]}
                  />
                  <View style={styles.typeRow}>
                    {storageTypeOptions.map((option) => (
                      <Pressable
                        key={option.value}
                        accessibilityRole="button"
                        accessibilityState={{ selected: placeForm.storageType === option.value }}
                        onPress={() => setPlaceForm((current) => ({ ...current, storageType: option.value as StorageType }))}
                        style={[
                          styles.typeChip,
                          {
                            backgroundColor: placeForm.storageType === option.value ? theme.primarySoft : theme.background,
                            borderColor: placeForm.storageType === option.value ? theme.primary : theme.border,
                          },
                        ]}>
                        <ThemedText type="caption">{option.icon} {option.label}</ThemedText>
                      </Pressable>
                    ))}
                  </View>
                  <View style={styles.formActions}>
                    <Pressable accessibilityRole="button" onPress={() => { setEditingPlace(undefined); setShowPlaceForm(false); setPlaceForm(emptyPlace); }}>
                      <ThemedText type="smallBold" style={{ color: theme.textSecondary }}>Avbryt</ThemedText>
                    </Pressable>
                    <Pressable accessibilityRole="button" disabled={busy || !placeForm.name.trim()} onPress={() => void savePlace()} style={[styles.compactPrimary, { backgroundColor: theme.primary }]}>
                      {busy ? <ActivityIndicator color="#FFFFFF" /> : <ThemedText type="smallBold" style={styles.white}>Spara plats</ThemedText>}
                    </Pressable>
                  </View>
                </View>
              )}
            </View>

            {home && (
              <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                <ThemedText type="sectionTitle">Medlemmar</ThemedText>
                <ThemedText type="small" themeColor="textSecondary">Alla medlemmar ser samma lager i realtid.</ThemedText>
                {members.map((member) => (
                  <View key={member.id} style={[styles.memberRow, { borderColor: theme.border }]}>
                    <View style={[styles.memberAvatar, { backgroundColor: theme.primarySoft }]}>
                      <ThemedText type="smallBold" style={{ color: theme.primary }}>{(member.displayName || '?').slice(0, 1).toUpperCase()}</ThemedText>
                    </View>
                    <View style={styles.flex}>
                      <ThemedText type="smallBold">{member.displayName || 'Namnlös medlem'}</ThemedText>
                      <ThemedText type="caption" themeColor="textSecondary">
                        {member.role === 'owner' ? 'Ägare' : 'Medlem'}{member.id === user?.id ? ` · du · ${user.email}` : ''}
                      </ThemedText>
                    </View>
                    {home.role === 'owner' && member.role !== 'owner' && (
                      <Pressable accessibilityRole="button" accessibilityLabel={`Ta bort ${member.displayName}`} disabled={busy} onPress={() => void run(() => removeMember(member.id))}>
                        <ThemedText type="caption" style={{ color: theme.warningText }}>Ta bort</ThemedText>
                      </Pressable>
                    )}
                  </View>
                ))}
              </View>
            )}

            {home?.role === 'owner' && (
              <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                <ThemedText type="sectionTitle">Bjud in någon till hemmet</ThemedText>
                <ThemedText type="small" themeColor="textSecondary">Koden kan användas en gång och upphör efter sju dagar.</ThemedText>
                {token && <TextInput accessibilityLabel="Inbjudningskod" editable={false} selectTextOnFocus value={token} style={[styles.input, { color: theme.text, borderColor: theme.border }]} />}
                <Pressable accessibilityRole="button" disabled={busy} onPress={() => void invite()} style={[styles.primary, { backgroundColor: theme.primary }]}>
                  {busy ? <ActivityIndicator color="#FFFFFF" /> : <ThemedText type="smallBold" style={styles.white}>{token ? 'Skapa ny kod' : 'Skapa och dela kod'}</ThemedText>}
                </Pressable>
              </View>
            )}

            {error && <ThemedText type="small" style={{ color: theme.warningText }}>{error}</ThemedText>}
            {user && (
              <Pressable accessibilityRole="button" onPress={() => void closeAndSignOut()} style={[styles.logout, { borderColor: theme.border }]}>
                <ThemedText type="smallBold" style={{ color: theme.warningText }}>Logga ut</ThemedText>
              </Pressable>
            )}
          </View>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  header: { height: 56, paddingHorizontal: Spacing.three, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  scrollContent: { paddingBottom: Spacing.six },
  content: { width: '100%', maxWidth: MaxContentWidth, alignSelf: 'center', padding: Spacing.four, gap: Spacing.three },
  card: { borderWidth: 1, borderRadius: Radius.large, padding: Spacing.four, gap: Spacing.three },
  flex: { flex: 1 },
  inlineForm: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  input: { minHeight: 50, borderWidth: 1, borderRadius: Radius.medium, paddingHorizontal: Spacing.three, fontSize: 15 },
  primary: { minHeight: 50, borderRadius: Radius.medium, alignItems: 'center', justifyContent: 'center' },
  compactPrimary: { minHeight: 44, minWidth: 82, borderRadius: Radius.medium, paddingHorizontal: Spacing.three, alignItems: 'center', justifyContent: 'center' },
  white: { color: '#FFFFFF' },
  sectionHeading: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  placeList: { gap: Spacing.two },
  placeRow: { minHeight: 62, borderTopWidth: 1, paddingTop: Spacing.two, flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  placeIcon: { fontSize: 22, lineHeight: 28 },
  rowActions: { alignItems: 'flex-end', gap: Spacing.two },
  placeForm: { borderTopWidth: 1, paddingTop: Spacing.three, gap: Spacing.two },
  typeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  typeChip: { minHeight: 40, borderRadius: Radius.pill, borderWidth: 1, paddingHorizontal: Spacing.three, alignItems: 'center', justifyContent: 'center' },
  formActions: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: Spacing.four },
  memberRow: { minHeight: 58, borderTopWidth: 1, paddingTop: Spacing.two, flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  memberAvatar: { width: 38, height: 38, borderRadius: Radius.pill, alignItems: 'center', justifyContent: 'center' },
  logout: { minHeight: 50, borderWidth: 1, borderRadius: Radius.medium, alignItems: 'center', justifyContent: 'center' },
});
