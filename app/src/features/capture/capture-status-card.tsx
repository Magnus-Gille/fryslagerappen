import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

import type { CaptureAnalysisMode, CaptureAnalysisState } from './capture-analysis-state';

export function CaptureStatusCard({
  state,
  onReview,
  onRetry,
  onDismiss,
}: {
  state: Exclude<CaptureAnalysisState, { status: 'idle' }>;
  onReview: () => void;
  onRetry: (mode: CaptureAnalysisMode) => void;
  onDismiss: () => void;
}) {
  const theme = useTheme();
  const [clock, setClock] = useState(state.startedAt);

  useEffect(() => {
    if (state.status !== 'analyzing') return;
    const timer = setInterval(() => setClock(Date.now()), 1_000);
    return () => clearInterval(timer);
  }, [state.status]);

  if (state.status === 'analyzing') {
    const elapsed = Math.max(0, Math.floor((clock - state.startedAt) / 1_000));
    return (
      <View
        accessibilityLiveRegion="polite"
        style={[styles.card, { backgroundColor: theme.primarySoft, borderColor: theme.primary }]}>
        <ActivityIndicator color={theme.primary} />
        <View style={styles.copy}>
          <ThemedText type="smallBold">Analyserar i bakgrunden</ThemedText>
          <ThemedText type="caption" themeColor="textSecondary">
            {elapsed} s · fortsätt använda appen så länge
          </ThemedText>
        </View>
      </View>
    );
  }

  if (state.status === 'ready') {
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Granska det färdiga lagerförslaget"
        onPress={onReview}
        style={({ pressed }) => [
          styles.card,
          { backgroundColor: theme.successSoft, borderColor: theme.successText },
          pressed && styles.pressed,
        ]}>
        <ThemedText style={styles.icon}>✓</ThemedText>
        <View style={styles.copy}>
          <ThemedText type="smallBold">Förslaget är klart</ThemedText>
          <ThemedText type="caption" themeColor="textSecondary">
            Tryck för att granska och spara
          </ThemedText>
        </View>
        <ThemedText type="smallBold" style={{ color: theme.primary }}>Granska</ThemedText>
      </Pressable>
    );
  }

  return (
    <View
      accessibilityLiveRegion="polite"
      style={[styles.errorCard, { backgroundColor: theme.warningSoft, borderColor: theme.warningText }]}>
      <View style={styles.errorCopy}>
        <ThemedText type="smallBold" style={{ color: theme.warningText }}>Tolkningen misslyckades</ThemedText>
        <ThemedText type="caption" style={{ color: theme.warningText }}>{state.message}</ThemedText>
      </View>
      <View style={styles.actions}>
        <Pressable accessibilityRole="button" onPress={() => onRetry(state.mode)}>
          <ThemedText type="smallBold" style={{ color: theme.primary }}>Försök igen</ThemedText>
        </Pressable>
        <Pressable accessibilityRole="button" onPress={onDismiss}>
          <ThemedText type="caption" themeColor="textSecondary">Avfärda</ThemedText>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    minHeight: 68,
    borderWidth: 1,
    borderRadius: Radius.large,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.three,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  copy: { flex: 1, gap: Spacing.one },
  icon: { width: 24, color: '#1F7A4D', fontSize: 22, lineHeight: 26, textAlign: 'center' },
  errorCard: {
    minHeight: 76,
    borderWidth: 1,
    borderRadius: Radius.large,
    padding: Spacing.three,
    gap: Spacing.two,
  },
  errorCopy: { gap: Spacing.one },
  actions: { flexDirection: 'row', alignItems: 'center', gap: Spacing.four },
  pressed: { opacity: 0.82, transform: [{ scale: 0.99 }] },
});
