import { useState } from 'react';
import { ActivityIndicator, Modal, Platform, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { FeedbackOverlay } from '@/features/feedback/feedback-overlay';
import { useTheme } from '@/hooks/use-theme';

import { storagePlaceLabel, storageTypeDetails } from './storage-place';
import type { FreezerItem, StoragePlace } from './types';

type Props = {
  item?: FreezerItem;
  locations: StoragePlace[];
  visible: boolean;
  onClose: () => void;
  onMove: (locationId: string) => Promise<void>;
};

export function MoveItemModal({ item, locations, visible, onClose, onMove }: Props) {
  const theme = useTheme();
  const destinations = locations.filter((location) => location.id !== item?.locationId);
  const [pendingLocationId, setPendingLocationId] = useState<string>();
  const [error, setError] = useState<string>();
  const busy = Boolean(pendingLocationId);

  function close() {
    if (busy) return;
    setError(undefined);
    onClose();
  }

  async function choose(locationId: string) {
    if (busy) return;
    setPendingLocationId(locationId);
    setError(undefined);
    try {
      await onMove(locationId);
      setError(undefined);
      onClose();
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : 'Varan kunde inte flyttas.');
    } finally {
      setPendingLocationId(undefined);
    }
  }

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle={Platform.OS === 'ios' ? 'pageSheet' : 'fullScreen'}
      onRequestClose={close}>
      <SafeAreaView style={[styles.screen, { backgroundColor: theme.background }]}>
        <View style={styles.header}>
          <Pressable accessibilityRole="button" disabled={busy} onPress={close}>
            <ThemedText style={{ color: theme.primary }}>Stäng</ThemedText>
          </Pressable>
          <ThemedText type="itemTitle">Flytta vara</ThemedText>
          <FeedbackOverlay
            context={{
              route: '/',
              screen: 'inventory',
              flow: 'move-item',
              step: 'choose-destination',
            }}
            placement="header"
          />
        </View>
        <View style={styles.content}>
          <ThemedText type="title">Vart ska {item?.name ?? 'varan'}?</ThemedText>
          <ThemedText themeColor="textSecondary">
            Välj en av hemmets andra förvaringsplatser.
          </ThemedText>
          <View style={styles.locationList}>
            {destinations.map((location) => {
              const details = storageTypeDetails(location.storageType);
              return (
                <Pressable
                  key={location.id}
                  accessibilityRole="button"
                  accessibilityLabel={`Flytta till ${location.name}`}
                  disabled={busy}
                  onPress={() => void choose(location.id)}
                  style={({ pressed }) => [
                    styles.location,
                    {
                      backgroundColor: pressed ? theme.primarySoft : theme.surface,
                      borderColor: theme.border,
                    },
                  ]}>
                  <ThemedText style={styles.icon}>{details.icon}</ThemedText>
                  <View style={styles.locationCopy}>
                    <ThemedText type="itemTitle">{location.name}</ThemedText>
                    <ThemedText type="caption" themeColor="textSecondary">
                      {details.label}{location.description ? ` · ${location.description}` : ''}
                    </ThemedText>
                  </View>
                  {pendingLocationId === location.id ? <ActivityIndicator color={theme.primary} /> : <ThemedText style={{ color: theme.primary }}>→</ThemedText>}
                </Pressable>
              );
            })}
          </View>
          {destinations.length === 0 && (
            <View style={[styles.empty, { backgroundColor: theme.surface, borderColor: theme.border }]}>
              <ThemedText type="sectionTitle">Ingen annan plats ännu</ThemedText>
              <ThemedText themeColor="textSecondary">
                Lägg till en förvaringsplats under Hem innan du flyttar varan.
              </ThemedText>
            </View>
          )}
          {item && destinations.length > 0 && (
            <ThemedText type="caption" themeColor="textTertiary">
              Nuvarande plats: {storagePlaceLabel(locations.find((entry) => entry.id === item.locationId) ?? locations[0])}
            </ThemedText>
          )}
          {error && <ThemedText type="small" style={{ color: theme.warningText }}>{error}</ThemedText>}
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  header: {
    height: 56,
    paddingHorizontal: Spacing.three,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  content: {
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    padding: Spacing.four,
    gap: Spacing.three,
  },
  locationList: { gap: Spacing.two },
  location: {
    minHeight: 72,
    borderWidth: 1,
    borderRadius: Radius.large,
    padding: Spacing.three,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  icon: { fontSize: 25, lineHeight: 31 },
  locationCopy: { flex: 1 },
  empty: { borderWidth: 1, borderRadius: Radius.large, padding: Spacing.four, gap: Spacing.two },
});
