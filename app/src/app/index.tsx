import { useMemo, useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { useCaptureAnalysis } from '@/features/capture/capture-analysis-provider';
import { CaptureStatusCard } from '@/features/capture/capture-status-card';
import { FeedbackOverlay } from '@/features/feedback/feedback-overlay';
import { AddItemModal, type CaptureMode } from '@/features/inventory/add-item-modal';
import { InventoryCard } from '@/features/inventory/inventory-card';
import { InventoryAuditModal } from '@/features/inventory/inventory-audit-modal';
import { HomeMenu } from '@/features/home/home-menu';
import { selectActiveItems } from '@/features/inventory/inventory-state';
import { useInventory } from '@/features/inventory/inventory-provider';
import { MoveItemModal } from '@/features/inventory/move-item-modal';
import { storagePlaceLabel } from '@/features/inventory/storage-place';
import { BottomTabInset, MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export default function HomeScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { state, rotationItems, syncStatus, takeOne, moveItem, consumeItem } = useInventory();
  const { state: captureState, clearCapture } = useCaptureAnalysis();
  const [query, setQuery] = useState('');
  const [locationId, setLocationId] = useState<string | undefined>();
  const [addEntry, setAddEntry] = useState<CaptureMode | 'chooser'>();
  const [showHome, setShowHome] = useState(false);
  const [movingItemId, setMovingItemId] = useState<string>();
  const [showAudit, setShowAudit] = useState(false);
  const activeLocationId = state.locations.some((location) => location.id === locationId)
    ? locationId
    : undefined;

  const visibleItems = useMemo(
    () => selectActiveItems(state, query, activeLocationId),
    [activeLocationId, query, state],
  );

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
                MITT HEM
              </ThemedText>
              <ThemedText type="title">Vad finns hemma?</ThemedText>
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
            <Pressable accessibilityRole="button" accessibilityLabel="Öppna heminställningar" onPress={() => setShowHome(true)} style={[styles.avatar, { backgroundColor: theme.primaryStrong }]}>
              <ThemedText type="smallBold" style={styles.avatarText}>
                F
              </ThemedText>
            </Pressable>
          </View>

          {captureState.status !== 'idle' && (
            <CaptureStatusCard
              state={captureState}
              onReview={() => {
                if (captureState.status === 'ready') setAddEntry(captureState.mode);
              }}
              onRetry={(mode) => {
                clearCapture();
                setAddEntry(mode);
              }}
              onDismiss={clearCapture}
            />
          )}

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
            <FilterChip label="Alla" selected={!activeLocationId} onPress={() => setLocationId(undefined)} />
            {state.locations.map((location) => (
              <FilterChip
                key={location.id}
                label={storagePlaceLabel(location)}
                selected={activeLocationId === location.id}
                onPress={() => setLocationId(location.id)}
              />
            ))}
          </ScrollView>

          <Pressable
            accessibilityRole="button"
            onPress={() => setShowAudit(true)}
            style={[styles.auditButton, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <View style={styles.flex}>
              <ThemedText type="smallBold">
                Inventera {activeLocationId ? 'vald plats' : 'en förvaringsplats'}
              </ThemedText>
              <ThemedText type="caption" themeColor="textSecondary">
                Räkna avvikelser och spara allt samtidigt
              </ThemedText>
            </View>
            <ThemedText style={{ color: theme.primary }}>›</ThemedText>
          </Pressable>

          {!query && !activeLocationId && rotationItems.length > 0 && (
            <View style={styles.section}>
              <View style={styles.sectionHeading}>
                <View>
                  <ThemedText type="sectionTitle">Använd först</ThemedText>
                  <ThemedText type="small" themeColor="textSecondary">
                    Försiktig prioritering från märkning och registrerade datum
                  </ThemedText>
                </View>
                <View style={[styles.countBadge, { backgroundColor: theme.warningSoft }]}>
                  <ThemedText type="caption" style={{ color: theme.warningText }}>
                    {rotationItems.length} varor
                  </ThemedText>
                </View>
              </View>

              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.soonRow}>
                {rotationItems.map(({ item, assessment }) => {
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
                        {item.quantity} {item.unit} · {storagePlaceLabel(location)}
                      </ThemedText>
                      <ThemedText type="caption" style={{ color: theme.warningText }}>
                        {assessment.reason}
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
                  Prova ett annat ord eller välj en annan förvaringsplats.
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
                      onMove={() => setMovingItemId(item.id)}
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
        <View pointerEvents="box-none" style={styles.quickActions}>
          <FeedbackOverlay
            context={{
              route: '/',
              screen: 'inventory',
              flow: 'inventory',
              step: 'overview',
            }}
            placement="action-row"
          />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Lägg till med streckkod"
            disabled={captureState.status !== 'idle'}
            onPress={() => setAddEntry('barcode')}
            style={({ pressed }) => [
              styles.quickAction,
              { backgroundColor: theme.primary },
              captureState.status !== 'idle' && styles.disabled,
              pressed && styles.pressed,
            ]}>
            <ThemedText style={styles.quickActionIcon}>▥</ThemedText>
            <ThemedText type="smallBold" style={styles.quickActionPrimaryText}>
              Skanna
            </ThemedText>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Lägg till med foto"
            disabled={captureState.status !== 'idle'}
            onPress={() => setAddEntry('photo')}
            style={({ pressed }) => [
              styles.moreButton,
              { backgroundColor: theme.surface, borderColor: theme.border },
              captureState.status !== 'idle' && styles.disabled,
              pressed && styles.pressed,
            ]}>
            <ThemedText style={styles.quickActionIcon}>📷</ThemedText>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Lägg till eller ändra med rösten"
            disabled={captureState.status !== 'idle'}
            onPress={() => setAddEntry('voice')}
            style={({ pressed }) => [
              styles.moreButton,
              { backgroundColor: theme.surface, borderColor: theme.border },
              captureState.status !== 'idle' && styles.disabled,
              pressed && styles.pressed,
            ]}>
            <ThemedText style={styles.quickActionIcon}>🎙️</ThemedText>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Fler sätt att lägga till"
            onPress={() => setAddEntry('chooser')}
            style={({ pressed }) => [
              styles.moreButton,
              { backgroundColor: theme.surface, borderColor: theme.border },
              pressed && styles.pressed,
            ]}>
            <ThemedText style={[styles.moreIcon, { color: theme.primary }]}>＋</ThemedText>
          </Pressable>
        </View>
      </View>

      {addEntry && (
        <AddItemModal
          visible
          initialMode={addEntry === 'chooser' ? undefined : addEntry}
          initialIntent={
            captureState.status === 'ready' && addEntry === captureState.mode
              ? captureState.intent
              : undefined
          }
          onCaptureHandled={clearCapture}
          onClose={() => setAddEntry(undefined)}
        />
      )}
      <MoveItemModal
        visible={Boolean(movingItemId)}
        item={state.items.find((item) => item.id === movingItemId)}
        locations={state.locations}
        onClose={() => setMovingItemId(undefined)}
        onMove={(destinationId) => movingItemId ? moveItem(movingItemId, destinationId) : Promise.resolve()}
      />
      <HomeMenu visible={showHome} onClose={() => setShowHome(false)} />
      {showAudit && (
        <InventoryAuditModal
          visible
          initialLocationId={activeLocationId}
          onClose={() => setShowAudit(false)}
        />
      )}
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
  flex: { flex: 1 },
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
  auditButton: {
    minHeight: 64,
    borderWidth: 1,
    borderRadius: Radius.large,
    paddingHorizontal: Spacing.three,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
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
  quickActions: {
    width: '100%',
    maxWidth: MaxContentWidth,
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: Spacing.two,
    alignItems: 'flex-end',
    paddingHorizontal: Spacing.three,
  },
  quickAction: {
    minHeight: 54,
    borderRadius: Radius.pill,
    paddingHorizontal: Spacing.three,
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
  quickActionSecondary: { borderWidth: 1 },
  quickActionIcon: { fontSize: 20, lineHeight: 24 },
  quickActionPrimaryText: { color: '#FFFFFF' },
  moreButton: {
    width: 54,
    height: 54,
    borderRadius: Radius.pill,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#10253D',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.16,
    shadowRadius: 12,
    elevation: 4,
  },
  moreIcon: { fontSize: 26, lineHeight: 30 },
  disabled: { opacity: 0.45 },
  pressed: { opacity: 0.82, transform: [{ scale: 0.98 }] },
});
