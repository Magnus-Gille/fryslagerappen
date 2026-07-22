import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

import { storagePlaceLabel } from './storage-place';
import type { FreezerItem, StoragePlace } from './types';

type Props = {
  item: FreezerItem;
  location: StoragePlace;
  onTakeOne: () => void;
  onMove: () => void;
  onConsume: () => void;
};

const sourceLabels = {
  manual: 'Angivet datum',
  label: 'Avläst datum',
  estimated: 'Uppskattat datum',
  none: 'Inget datum',
} as const;

function displayDate(value?: string) {
  if (!value) return undefined;
  return new Intl.DateTimeFormat('sv-SE', { day: 'numeric', month: 'short' }).format(
    new Date(`${value}T00:00:00.000Z`),
  );
}

export function InventoryCard({ item, location, onTakeOne, onMove, onConsume }: Props) {
  const theme = useTheme();
  const date = displayDate(item.eatBefore);

  return (
    <View style={[styles.card, { borderColor: theme.border, backgroundColor: theme.surface }]}>
      <View style={[styles.thumbnail, { backgroundColor: item.color }]} accessible={false}>
        <ThemedText style={styles.emoji}>{item.emoji}</ThemedText>
      </View>

      <View style={styles.content}>
        <View style={styles.titleRow}>
          <View style={styles.titleBlock}>
            <ThemedText type="itemTitle" numberOfLines={1}>
              {item.name}
            </ThemedText>
            <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
              {item.quantity} {item.unit} · {storagePlaceLabel(location)}
            </ThemedText>
          </View>
          {date && (
            <View style={[styles.dateBadge, { backgroundColor: theme.warningSoft }]}>
              <ThemedText type="caption" style={{ color: theme.warningText }}>
                {date}
              </ThemedText>
            </View>
          )}
        </View>

        {date && (
          <ThemedText type="caption" themeColor="textTertiary">
            {sourceLabels[item.dateSource]} · kontrollera varan själv
          </ThemedText>
        )}

        <View style={styles.actions}>
          <ActionButton label="−  Ta ut en" onPress={onTakeOne} />
          <ActionButton label="⇄  Flytta" onPress={onMove} />
          <ActionButton label="✓  Förbrukad" onPress={onConsume} />
        </View>
      </View>
    </View>
  );
}

function ActionButton({ label, onPress }: { label: string; onPress: () => void }) {
  const theme = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label.replace(/[^\p{L}\p{N} ]/gu, '').trim()}
      onPress={onPress}
      style={({ pressed }) => [
        styles.action,
        { backgroundColor: pressed ? theme.primarySoft : theme.background },
      ]}>
      <ThemedText type="caption" style={{ color: theme.primary }}>
        {label}
      </ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderRadius: Radius.large,
    padding: Spacing.three,
    flexDirection: 'row',
    gap: Spacing.three,
  },
  thumbnail: {
    width: 62,
    height: 62,
    borderRadius: Radius.medium,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emoji: {
    fontSize: 30,
    lineHeight: 36,
  },
  content: {
    flex: 1,
    gap: Spacing.one,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.two,
  },
  titleBlock: {
    flex: 1,
  },
  dateBadge: {
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.one,
    borderRadius: Radius.pill,
  },
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.one,
    marginTop: Spacing.two,
  },
  action: {
    minHeight: 34,
    paddingHorizontal: Spacing.two,
    borderRadius: Radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
