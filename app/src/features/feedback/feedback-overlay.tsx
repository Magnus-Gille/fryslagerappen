import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { diagnosticError, reportTelemetry } from '@/lib/telemetry';

import { feedbackContextLabel, type FeedbackContext } from './feedback-context';
import { submitFeedback, type FeedbackKind } from './feedback-service';

const kindOptions: { value: FeedbackKind; label: string }[] = [
  { value: 'problem', label: 'Något krånglar' },
  { value: 'confusing', label: 'Svårt att förstå' },
  { value: 'idea', label: 'Idé' },
  { value: 'other', label: 'Annat' },
];

export function FeedbackOverlay({
  context,
  bottomOffset = Spacing.three,
}: {
  context: FeedbackContext;
  bottomOffset?: number;
}) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const [visible, setVisible] = useState(false);
  const [capturedContext, setCapturedContext] = useState(context);
  const [message, setMessage] = useState('');
  const [kind, setKind] = useState<FeedbackKind>('other');
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string>();
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (closeTimer.current) clearTimeout(closeTimer.current);
    },
    [],
  );

  function open() {
    setCapturedContext(context);
    setMessage('');
    setKind('other');
    setError(undefined);
    setSent(false);
    setVisible(true);
    void reportTelemetry('feedback_opened', { stage: context.step ?? context.screen });
  }

  function close() {
    if (busy) return;
    if (closeTimer.current) clearTimeout(closeTimer.current);
    closeTimer.current = null;
    setVisible(false);
  }

  async function send() {
    if (!message.trim() || busy) return;
    setBusy(true);
    setError(undefined);
    const startedAt = Date.now();
    try {
      await submitFeedback({ message, kind, context: capturedContext });
      setSent(true);
      void reportTelemetry('feedback_succeeded', {
        stage: capturedContext.step ?? capturedContext.screen,
        durationMs: Date.now() - startedAt,
      });
      closeTimer.current = setTimeout(() => {
        setBusy(false);
        setVisible(false);
      }, 700);
    } catch (nextError) {
      setBusy(false);
      setError(nextError instanceof Error ? nextError.message : 'Feedbacken kunde inte skickas.');
      void reportTelemetry('feedback_failed', {
        stage: capturedContext.step ?? capturedContext.screen,
        durationMs: Date.now() - startedAt,
        ...diagnosticError(nextError),
      });
    }
  }

  return (
    <>
      <View pointerEvents="box-none" style={StyleSheet.absoluteFill}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Skicka feedback om ${feedbackContextLabel(context)}`}
          onPress={open}
          style={({ pressed }) => [
            styles.feedbackButton,
            {
              bottom: bottomOffset + Math.max(insets.bottom, Spacing.two),
              backgroundColor: theme.primaryStrong,
            },
            pressed && styles.pressed,
          ]}>
          <ThemedText style={styles.feedbackIcon}>✎</ThemedText>
          <ThemedText type="caption" style={styles.feedbackButtonText}>
            Feedback
          </ThemedText>
        </Pressable>
      </View>

      <Modal
        transparent
        visible={visible}
        animationType="fade"
        onRequestClose={close}>
        <KeyboardAvoidingView
          style={styles.backdrop}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View
            accessibilityViewIsModal
            style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            {sent ? (
              <View style={styles.sent}>
                <View style={[styles.sentIcon, { backgroundColor: theme.successSoft }]}>
                  <ThemedText style={{ color: theme.successText }}>✓</ThemedText>
                </View>
                <ThemedText type="sectionTitle">Tack – skickat!</ThemedText>
              </View>
            ) : (
              <>
                <View style={styles.heading}>
                  <View style={styles.flex}>
                    <ThemedText type="sectionTitle">Snabb feedback</ThemedText>
                    <ThemedText type="caption" style={{ color: theme.primary }}>
                      Gäller: {feedbackContextLabel(capturedContext)}
                    </ThemedText>
                  </View>
                  <Pressable accessibilityRole="button" disabled={busy} onPress={close}>
                    <ThemedText style={{ color: theme.textSecondary }}>Stäng</ThemedText>
                  </Pressable>
                </View>

                <View style={styles.kindRow}>
                  {kindOptions.map((option) => (
                    <Pressable
                      key={option.value}
                      accessibilityRole="button"
                      accessibilityState={{ selected: kind === option.value }}
                      onPress={() => setKind(option.value)}
                      style={[
                        styles.kindChip,
                        {
                          backgroundColor: kind === option.value ? theme.primarySoft : theme.background,
                          borderColor: kind === option.value ? theme.primary : theme.border,
                        },
                      ]}>
                      <ThemedText type="caption">{option.label}</ThemedText>
                    </Pressable>
                  ))}
                </View>

                <TextInput
                  autoFocus
                  accessibilityLabel="Din feedback"
                  multiline
                  maxLength={1500}
                  placeholder="Vad vill du att vi förbättrar?"
                  placeholderTextColor={theme.textTertiary}
                  value={message}
                  onChangeText={setMessage}
                  style={[
                    styles.input,
                    { color: theme.text, backgroundColor: theme.background, borderColor: theme.border },
                  ]}
                />
                <ThemedText type="caption" themeColor="textTertiary">
                  Skärm och steg bifogas automatiskt. Ingen bild, röst eller lagerdata skickas.
                </ThemedText>
                {error && (
                  <ThemedText type="small" style={{ color: theme.warningText }}>
                    {error}
                  </ThemedText>
                )}
                <Pressable
                  accessibilityRole="button"
                  disabled={busy || !message.trim()}
                  onPress={() => void send()}
                  style={[
                    styles.sendButton,
                    {
                      backgroundColor: message.trim() ? theme.primary : theme.backgroundElement,
                    },
                  ]}>
                  {busy ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <ThemedText type="smallBold" style={styles.white}>
                      Skicka feedback
                    </ThemedText>
                  )}
                </Pressable>
              </>
            )}
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  feedbackButton: {
    position: 'absolute',
    right: Spacing.three,
    zIndex: 100,
    minHeight: 46,
    borderRadius: Radius.pill,
    paddingHorizontal: Spacing.three,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    shadowColor: '#000000',
    shadowOpacity: 0.18,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 5,
  },
  feedbackIcon: { color: '#FFFFFF', fontSize: 18, lineHeight: 22 },
  feedbackButtonText: { color: '#FFFFFF' },
  pressed: { opacity: 0.78, transform: [{ scale: 0.98 }] },
  backdrop: {
    flex: 1,
    backgroundColor: '#00000066',
    padding: Spacing.three,
    alignItems: 'center',
    justifyContent: 'center',
  },
  card: {
    width: '100%',
    maxWidth: Math.min(MaxContentWidth, 560),
    borderWidth: 1,
    borderRadius: Radius.xlarge,
    padding: Spacing.four,
    gap: Spacing.three,
  },
  heading: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.three },
  flex: { flex: 1, gap: Spacing.one },
  kindRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  kindChip: {
    minHeight: 38,
    borderWidth: 1,
    borderRadius: Radius.pill,
    paddingHorizontal: Spacing.three,
    alignItems: 'center',
    justifyContent: 'center',
  },
  input: {
    minHeight: 126,
    maxHeight: 240,
    borderWidth: 1,
    borderRadius: Radius.medium,
    padding: Spacing.three,
    fontSize: 16,
    textAlignVertical: 'top',
  },
  sendButton: {
    minHeight: 52,
    borderRadius: Radius.medium,
    alignItems: 'center',
    justifyContent: 'center',
  },
  white: { color: '#FFFFFF' },
  sent: { minHeight: 150, alignItems: 'center', justifyContent: 'center', gap: Spacing.three },
  sentIcon: {
    width: 48,
    height: 48,
    borderRadius: Radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
