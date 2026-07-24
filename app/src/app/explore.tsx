import { Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { useInventory } from '@/features/inventory/inventory-provider';
import { BottomTabInset, MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

const eventLabels = {
  created: 'Lades till',
  quantityChanged: 'Mängden ändrades',
  moved: 'Flyttades',
  consumed: 'Markerades som förbrukad',
  restored: 'Återställdes',
  restocked: 'Fylldes på',
  audited: 'Inventerades',
} as const;

const sourceLabels = {
  manual: 'manuellt',
  photo: 'foto',
  voice: 'röst',
  barcode: 'streckkod',
  audit: 'inventering',
  system: 'system',
} as const;

function relativeTime(value: string) {
  const minutes = Math.max(0, Math.round((Date.now() - new Date(value).getTime()) / 60_000));
  if (minutes < 1) return 'nyss';
  if (minutes < 60) return `${minutes} min sedan`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} h sedan`;
  return new Intl.DateTimeFormat('sv-SE', { day: 'numeric', month: 'short' }).format(
    new Date(value),
  );
}

export default function HistoryScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { state, activeItems, archivedItems, restoreItem } = useInventory();
  const bottomPadding = Math.max(insets.bottom, Spacing.three) + BottomTabInset + Spacing.four;

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: theme.background }]} edges={['top']}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: bottomPadding }]}>
        <View style={styles.content}>
          <View style={styles.heading}>
            <ThemedText type="smallBold" style={{ color: theme.primary }}>
              ÖVERSIKT
            </ThemedText>
            <ThemedText type="title">Historik & tillit</ThemedText>
            <ThemedText themeColor="textSecondary">
              Se vad som ändrats och återställ misstag utan att bygga om lagerposten.
            </ThemedText>
          </View>

          <View style={styles.statsRow}>
            <StatCard value={String(activeItems.length)} label="Aktiva varor" />
            <StatCard value={String(state.locations.length)} label="Förvaringsplatser" />
            <StatCard value={String(state.events.length)} label="Ändringar nu" />
          </View>

          <View style={styles.section}>
            <ThemedText type="sectionTitle">Nyligen borttaget</ThemedText>
            {archivedItems.length === 0 ? (
              <View style={[styles.emptyCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                <ThemedText style={styles.emptyEmoji}>↩︎</ThemedText>
                <View style={styles.flex}>
                  <ThemedText type="itemTitle">Inget att återställa ännu</ThemedText>
                  <ThemedText type="small" themeColor="textSecondary">
                    Varor som markeras som förbrukade hamnar här.
                  </ThemedText>
                </View>
              </View>
            ) : (
              <View style={styles.list}>
                {archivedItems.map((item) => (
                  <View
                    key={item.id}
                    style={[styles.historyCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                    <View style={[styles.itemIcon, { backgroundColor: item.color }]}>
                      <ThemedText style={styles.itemEmoji}>{item.emoji}</ThemedText>
                    </View>
                    <View style={styles.flex}>
                      <ThemedText type="itemTitle">{item.name}</ThemedText>
                      <ThemedText type="small" themeColor="textSecondary">
                        {item.quantity} {item.unit} · {item.status === 'consumed' ? 'Förbrukad' : 'Kastad'}
                      </ThemedText>
                    </View>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={`Återställ ${item.name}`}
                      onPress={() => restoreItem(item.id)}
                      style={[styles.restoreButton, { backgroundColor: theme.primarySoft }]}>
                      <ThemedText type="caption" style={{ color: theme.primary }}>
                        Återställ
                      </ThemedText>
                    </Pressable>
                  </View>
                ))}
              </View>
            )}
          </View>

          <View style={styles.section}>
            <ThemedText type="sectionTitle">Den här sessionen</ThemedText>
            <View style={[styles.timeline, { backgroundColor: theme.surface, borderColor: theme.border }]}>
              {state.events.length === 0 ? (
                <ThemedText type="small" themeColor="textSecondary">
                  Dina ändringar visas här. Prova en snabbåtgärd i lagret.
                </ThemedText>
              ) : (
                state.events.slice(0, 8).map((event, index) => {
                  const item = state.items.find((entry) => entry.id === event.itemId);
                  return (
                    <View key={event.id} style={styles.timelineRow}>
                      <View style={styles.timelineMarkerColumn}>
                        <View style={[styles.timelineDot, { backgroundColor: theme.primary }]} />
                        {index < Math.min(state.events.length, 8) - 1 && (
                          <View style={[styles.timelineLine, { backgroundColor: theme.border }]} />
                        )}
                      </View>
                      <View style={[styles.timelineCopy, index > 0 && { borderTopColor: theme.border }]}>
                        <ThemedText type="smallBold">{item?.name ?? 'Vara'}</ThemedText>
                        <ThemedText type="small" themeColor="textSecondary">
                          {eventLabels[event.type]}
                          {event.quantityDelta
                            ? ` · ${event.quantityDelta > 0 ? '+' : ''}${event.quantityDelta}`
                            : ''}
                          {' · '}
                          {event.actorName ?? 'Någon i hemmet'}
                          {event.source ? ` via ${sourceLabels[event.source]}` : ''}
                          {' · '}
                          {relativeTime(event.occurredAt)}
                        </ThemedText>
                        {(event.fromLocationName || event.toLocationName) && (
                          <ThemedText type="caption" themeColor="textTertiary">
                            {event.fromLocationName ?? '—'} → {event.toLocationName ?? '—'}
                          </ThemedText>
                        )}
                        {event.comment && (
                          <ThemedText type="caption" themeColor="textTertiary">
                            “{event.comment}”
                          </ThemedText>
                        )}
                      </View>
                    </View>
                  );
                })
              )}
            </View>
          </View>

          <View style={[styles.safetyCard, { backgroundColor: theme.warningSoft }]}>
            <ThemedText type="smallBold" style={{ color: theme.warningText }}>
              Om datum i prototypen
            </ThemedText>
            <ThemedText type="small" style={{ color: theme.warningText }}>
              “Ät snart” hjälper bara till med planering. Titta, lukta och gör alltid en egen bedömning.
            </ThemedText>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function StatCard({ value, label }: { value: string; label: string }) {
  const theme = useTheme();
  return (
    <View style={[styles.statCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
      <ThemedText type="sectionTitle" style={{ color: theme.primaryStrong }}>
        {value}
      </ThemedText>
      <ThemedText type="caption" themeColor="textSecondary">
        {label}
      </ThemedText>
    </View>
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
    gap: Spacing.five,
  },
  heading: { gap: Spacing.one },
  statsRow: { flexDirection: 'row', gap: Spacing.two },
  statCard: {
    flex: 1,
    minHeight: 92,
    padding: Spacing.three,
    borderWidth: 1,
    borderRadius: Radius.large,
    justifyContent: 'space-between',
  },
  section: { gap: Spacing.three },
  list: { gap: Spacing.two },
  emptyCard: {
    borderWidth: 1,
    borderRadius: Radius.large,
    padding: Spacing.four,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  emptyEmoji: { fontSize: 28, lineHeight: 34 },
  historyCard: {
    borderWidth: 1,
    borderRadius: Radius.large,
    padding: Spacing.three,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  itemIcon: {
    width: 48,
    height: 48,
    borderRadius: Radius.medium,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemEmoji: { fontSize: 24, lineHeight: 30 },
  restoreButton: { paddingHorizontal: Spacing.three, paddingVertical: Spacing.two, borderRadius: Radius.pill },
  timeline: { borderWidth: 1, borderRadius: Radius.large, padding: Spacing.three },
  timelineRow: { minHeight: 54, flexDirection: 'row' },
  timelineMarkerColumn: { width: 24, alignItems: 'center' },
  timelineDot: { width: 9, height: 9, borderRadius: 5, marginTop: 6 },
  timelineLine: { width: 1, flex: 1, marginVertical: 4 },
  timelineCopy: { flex: 1, paddingBottom: Spacing.three },
  safetyCard: { borderRadius: Radius.large, padding: Spacing.four, gap: Spacing.one },
});
