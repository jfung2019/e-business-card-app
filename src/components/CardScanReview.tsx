import React from 'react';
import { ActivityIndicator, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAppTheme } from '../context/ThemeContext';
import type { CardScannerSide } from '../services/cardScanner/cardScannerController';

export type CaptureMode = 'auto' | 'manual';

interface CardScanReviewProps {
  side: CardScannerSide;
  imageUri: string;
  captureMode: CaptureMode;
  /** False when no card edge was found and the image is the uncropped photo. */
  isCropped: boolean;
  isBusy: boolean;
  onRetake: () => void;
  onCrop: () => void;
  onNext: () => void;
}

/**
 * Shows the one captured card so the user can check it before moving on.
 * Exactly one image, always — the whole point of replacing VisionKit.
 */
export function CardScanReview({
  side,
  imageUri,
  captureMode,
  isCropped,
  isBusy,
  onRetake,
  onCrop,
  onNext,
}: CardScanReviewProps): React.JSX.Element {
  const { scan } = useAppTheme();
  const insets = useSafeAreaInsets();

  const sideLabel = side === 'front' ? 'Front side' : 'Back side';
  const modeLabel = captureMode === 'auto' ? 'Captured automatically' : 'Captured manually';

  return (
    <View style={[styles.container, { backgroundColor: scan.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <Text style={[styles.eyebrow, { color: scan.gold }]}>{sideLabel}</Text>
        <Text style={[styles.title, { color: scan.cream }]}>Check your scan</Text>
        <Text style={[styles.subtitle, { color: scan.creamMuted }]}>
          {isCropped
            ? `${modeLabel}. Make sure every line of text is sharp.`
            : 'We could not find the card edges. Tap Crop to mark them.'}
        </Text>
      </View>

      <View style={styles.imageWrap}>
        <Image
          source={{ uri: imageUri }}
          style={[styles.image, { borderColor: scan.border }]}
          resizeMode="contain"
        />
        {isBusy ? (
          <View style={styles.busyOverlay}>
            <ActivityIndicator color={scan.gold} size="large" />
          </View>
        ) : null}
      </View>

      <View style={[styles.footer, { paddingBottom: insets.bottom + 16 }]}>
        <View style={styles.buttonRow}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Delete this scan and retake"
            disabled={isBusy}
            style={[styles.secondaryButton, { borderColor: scan.creamMuted }]}
            onPress={onRetake}>
            <Text style={[styles.secondaryText, { color: scan.cream }]}>Retake</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Adjust the crop"
            disabled={isBusy}
            style={[styles.secondaryButton, { borderColor: scan.creamMuted }]}
            onPress={onCrop}>
            <Text style={[styles.secondaryText, { color: scan.cream }]}>Crop</Text>
          </Pressable>
        </View>
        <Pressable
          accessibilityRole="button"
          disabled={isBusy}
          style={[styles.primaryButton, { backgroundColor: scan.gold }, isBusy && styles.disabled]}
          onPress={onNext}>
          <Text style={styles.primaryText}>{side === 'front' ? 'Next' : 'Done'}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    gap: 6,
    paddingBottom: 16,
    paddingHorizontal: 24,
  },
  eyebrow: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
  },
  subtitle: {
    fontSize: 15,
    lineHeight: 21,
  },
  imageWrap: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  image: {
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    height: '100%',
    width: '100%',
  },
  busyOverlay: {
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.35)',
    borderRadius: 12,
    bottom: 0,
    justifyContent: 'center',
    left: 20,
    position: 'absolute',
    right: 20,
    top: 0,
  },
  footer: {
    gap: 12,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
  },
  primaryButton: {
    alignItems: 'center',
    borderRadius: 14,
    paddingVertical: 16,
  },
  primaryText: {
    color: '#111827',
    fontSize: 17,
    fontWeight: '700',
  },
  secondaryButton: {
    alignItems: 'center',
    borderRadius: 14,
    borderWidth: 1,
    flex: 1,
    paddingVertical: 14,
  },
  secondaryText: {
    fontSize: 16,
    fontWeight: '600',
  },
  disabled: {
    opacity: 0.5,
  },
});
