import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

import type { CaptureJob } from './capture-analysis-state';

export function CaptureStatusList({
  jobs,
  onReview,
  onRetry,
  onDismiss,
}: {
  jobs: CaptureJob[];
  onReview: (job: CaptureJob) => void;
  onRetry: (job: CaptureJob) => void;
  onDismiss: (job: CaptureJob) => void;
}) {
  return (
    <View style={styles.list}>
      {jobs.map((job) => (
        <CaptureStatusCard
          key={job.jobId}
          job={job}
          onReview={() => onReview(job)}
          onRetry={() => onRetry(job)}
          onDismiss={() => onDismiss(job)}
        />
      ))}
    </View>
  );
}

function CaptureStatusCard({
  job,
  onReview,
  onRetry,
  onDismiss,
}: {
  job: CaptureJob;
  onReview: () => void;
  onRetry: () => void;
  onDismiss: () => void;
}) {
  const theme = useTheme();
  const [clock, setClock] = useState(job.startedAt);

  useEffect(() => {
    if (job.status !== 'analyzing') return;
    const timer = setInterval(() => setClock(Date.now()), 1_000);
    return () => clearInterval(timer);
  }, [job.status]);

  if (job.status === 'analyzing') {
    const elapsed = Math.max(0, Math.floor((clock - job.startedAt) / 1_000));
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

  if (job.status === 'ready') {
    const title = job.intent.name ? `Förslag klart: ${job.intent.name}` : 'Förslaget är klart';
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
          <ThemedText type="smallBold">{title}</ThemedText>
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
        <ThemedText type="caption" style={{ color: theme.warningText }}>{job.message}</ThemedText>
      </View>
      <View style={styles.actions}>
        <Pressable accessibilityRole="button" onPress={onRetry}>
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
  list: { gap: Spacing.two },
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
