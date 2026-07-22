import { useMemo, useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { AddItemModal } from '@/features/inventory/add-item-modal';
import { InventoryCard } from '@/features/inventory/inventory-card';
import { HouseholdMenu } from '@/features/household/household-menu';
import { selectActiveItems } from '@/features/inventory/inventory-state';
import { useInventory } from '@/features/inventory/inventory-provider';
import { BottomTabInset, MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export default function HomeScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { state, eatSoonItems, syncStatus, takeOne, moveItem, consumeItem } = useInventory();
  const [query, setQuery] = useState('');
  const [locationId, setLocationId] = useState<string | undefined>();
  const [showAdd, setShowAdd] = useState(false);
  const [showHousehold, setShowHousehold] = useState(false);

  const visibleItems = useMemo(
    () => selectActiveItems(state, query, locationId),
    [locationId, query, state],
  );

  function otherLocation(currentLocationId: string) {
    return state.locations.find((location) => location.id !== currentLocationId)?.id ?? currentLocationId;
  }

  const bottomPadding = Math.max(insets.bottom, Spacing.three) + BottomTabInset + 88;

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: theme.background }]} edges={['top']}>
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={[styles.scrollContent, { paddingBottom: bottomPadding }]}
        showsVerticalScrollIndicator={false}>
        <View style={styles.content}>
          <View style={styles.header}>
            <View style={styles.headerCopy}>
              <ThemedText type="smallBold" style={{ color: theme.primary }}>
                MITT HUSHÅLL
              </ThemedText>
              <ThemedText type="title">Vad finns i frysen?</ThemedText>
              <View style={styles.syncRow}>
                <View style={[styles.syncDot, { backgroundColor: theme.successText }]} />
                <ThemedText type="caption" themeColor="textTertiary">
                  {syncStatus === 'local'
                    ? 'Demoläge · anslut M5 för delning'
                    : syncStatus === 'saving'
                      ? 'Synkar ändringen …'
                      : syncStatus === 'error'
                        ? 'Synkfel · försöker igen'
                        : 'Delat lager · uppdaterat nyss'}
                </ThemedText>
              </View>
            </View>
            <Pressable accessibilityRole="button" accessibilityLabel="Öppna hushållsinställningar" onPress={() => setShowHousehold(true)} style={[styles.avatar, { backgroundColor: theme.primaryStrong }]}>
              <ThemedText type="smallBold" style={styles.avatarText}>
                F
              </ThemedText>
            </Pressable>
          </View>

          <View style={[styles.search, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <ThemedText style={[styles.searchIcon, { color: theme.textTertiary }]}>⌕</ThemedText>
            <TextInput
              accessibilityLabel="Sök i lagret"
              clearButtonMode="while-editing"
              placeholder="Sök efter glass, fisk, blåbär …"
              placeholderTextColor={theme.textTertiary}
              value={query}
              onChangeText={setQuery}
              style={[styles.searchInput, { color: theme.text }]}
            />
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filterRow}>
            <FilterChip label="Alla" selected={!locationId} onPress={() => setLocationId(undefined)} />
            {state.locations.map((location) => (
              <FilterChip
                key={location.id}
                label={location.name}
                selected={locationId === location.id}
                onPress={() => setLocationId(location.id)}
              />
            ))}
          </ScrollView>

          {!query && !locationId && eatSoonItems.length > 0 && (
            <View style={styles.section}>
              <View style={styles.sectionHeading}>
                <View>
                  <ThemedText type="sectionTitle">Ät snart</ThemedText>
                  <ThemedText type="small" themeColor="textSecondary">
                    Planeringsstöd för de närmaste 30 dagarna
                  </ThemedText>
                </View>
                <View style={[styles.countBadge, { backgroundColor: theme.warningSoft }]}>
                  <ThemedText type="caption" style={{ color: theme.warningText }}>
                    {eatSoonItems.length} varor
                  </ThemedText>
                </View>
              </View>

              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.soonRow}>
                {eatSoonItems.map((item) => {
                  const location = state.locations.find((entry) => entry.id === item.locationId)!;
                  return (
                    <View
                      key={item.id}
                      style={[styles.soonCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                      <View style={[styles.soonEmoji, { backgroundColor: item.color }]}>
                        <ThemedText style={styles.soonEmojiText}>{item.emoji}</ThemedText>
                      </View>
                      <ThemedText type="itemTitle" numberOfLines={1}>
                        {item.name}
                      </ThemedText>
                      <ThemedText type="caption" themeColor="textSecondary" numberOfLines={1}>
                        {item.quantity} {item.unit} · {location.name}
                      </ThemedText>
                      <ThemedText type="caption" style={{ color: theme.warningText }}>
                        {item.dateSource === 'estimated' ? 'Uppskattat' : 'Registrerat'} {item.eatBefore}
                      </ThemedText>
                    </View>
                  );
                })}
              </ScrollView>
            </View>
          )}

          <View style={styles.section}>
            <View style={styles.sectionHeading}>
              <View>
                <ThemedText type="sectionTitle">{query ? 'Sökresultat' : 'Hela lagret'}</ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  {visibleItems.length} {visibleItems.length === 1 ? 'vara' : 'varor'}
                </ThemedText>
              </View>
            </View>

            {visibleItems.length === 0 ? (
              <View style={[styles.emptyState, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                <ThemedText style={styles.emptyEmoji}>🧊</ThemedText>
                <ThemedText type="itemTitle">Inget matchade</ThemedText>
                <ThemedText type="small" themeColor="textSecondary" style={styles.emptyCopy}>
                  Prova ett annat ord eller välj en annan frysplats.
                </ThemedText>
              </View>
            ) : (
              <View style={styles.itemList}>
                {visibleItems.map((item) => {
                  const location = state.locations.find((entry) => entry.id === item.locationId)!;
                  return (
                    <InventoryCard
                      key={item.id}
                      item={item}
                      location={location}
                      onTakeOne={() => takeOne(item.id)}
                      onMove={() => moveItem(item.id, otherLocation(item.locationId))}
                      onConsume={() => consumeItem(item.id)}
                    />
                  );
                })}
              </View>
            )}
          </View>
        </View>
      </ScrollView>

      <View
        pointerEvents="box-none"
        style={[
          styles.addButtonLayer,
          { bottom: Math.max(insets.bottom, Spacing.three) + BottomTabInset + Spacing.two },
        ]}>
        <View pointerEvents="box-none" style={styles.addButtonAnchor}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Lägg till vara"
            onPress={() => setShowAdd(true)}
            style={({ pressed }) => [
              styles.addButton,
              { backgroundColor: theme.primary },
              pressed && styles.pressed,
            ]}>
            <ThemedText style={styles.addIcon}>＋</ThemedText>
            <ThemedText type="smallBold" style={styles.addText}>
              Lägg till
            </ThemedText>
          </Pressable>
        </View>
      </View>

      <AddItemModal visible={showAdd} onClose={() => setShowAdd(false)} />
      <HouseholdMenu visible={showHousehold} onClose={() => setShowHousehold(false)} />
    </SafeAreaView>
  );
}

function FilterChip({
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
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={[
        styles.filterChip,
        {
          backgroundColor: selected ? theme.primary : theme.surface,
          borderColor: selected ? theme.primary : theme.border,
        },
      ]}>
      <ThemedText type="smallBold" style={{ color: selected ? '#FFFFFF' : theme.textSecondary }}>
        {label}
      </ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  scrollContent: { alignItems: 'center' },
  content: {
    width: '100%',
    maxWidth: MaxContentWidth,
    paddingHorizontal: Spacing.three,
    paddingTop: Platform.OS === 'web' ? 92 : Spacing.three,
    gap: Spacing.four,
  },
  header: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.three },
  headerCopy: { flex: 1, gap: Spacing.one },
  syncRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two, marginTop: Spacing.one },
  syncDot: { width: 7, height: 7, borderRadius: 4 },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: Radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { color: '#FFFFFF' },
  search: {
    minHeight: 54,
    borderRadius: Radius.medium,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.three,
    gap: Spacing.two,
  },
  searchIcon: { fontSize: 27, lineHeight: 30, transform: [{ rotate: '-20deg' }] },
  searchInput: { flex: 1, fontSize: 16, minHeight: 50 },
  filterRow: { gap: Spacing.two, paddingRight: Spacing.three },
  filterChip: {
    minHeight: 40,
    borderRadius: Radius.pill,
    borderWidth: 1,
    paddingHorizontal: Spacing.three,
    alignItems: 'center',
    justifyContent: 'center',
  },
  section: { gap: Spacing.three },
  sectionHeading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  countBadge: { borderRadius: Radius.pill, paddingHorizontal: Spacing.three, paddingVertical: Spacing.two },
  soonRow: { gap: Spacing.three, paddingRight: Spacing.three },
  soonCard: {
    width: 174,
    borderWidth: 1,
    borderRadius: Radius.large,
    padding: Spacing.three,
    gap: Spacing.one,
  },
  soonEmoji: {
    width: 48,
    height: 48,
    borderRadius: Radius.medium,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.two,
  },
  soonEmojiText: { fontSize: 24, lineHeight: 30 },
  itemList: { gap: Spacing.three },
  emptyState: {
    borderWidth: 1,
    borderRadius: Radius.large,
    padding: Spacing.five,
    alignItems: 'center',
  },
  emptyEmoji: { fontSize: 36, lineHeight: 42, marginBottom: Spacing.two },
  emptyCopy: { textAlign: 'center', marginTop: Spacing.one },
  addButtonLayer: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  addButtonAnchor: {
    width: '100%',
    maxWidth: MaxContentWidth,
    alignItems: 'flex-end',
    paddingHorizontal: Spacing.three,
  },
  addButton: {
    minHeight: 54,
    borderRadius: Radius.pill,
    paddingHorizontal: Spacing.four,
    flexDirection: 'row',
    gap: Spacing.two,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#10253D',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.22,
    shadowRadius: 14,
    elevation: 6,
  },
  addIcon: { color: '#FFFFFF', fontSize: 24, lineHeight: 28 },
  addText: { color: '#FFFFFF' },
  pressed: { opacity: 0.82, transform: [{ scale: 0.98 }] },
});
