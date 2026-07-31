import React, { useMemo } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';

import { ScanSubmissionProgress } from './ScanSubmissionProgress';
import { useAppTheme } from '../context/ThemeContext';
import { useRotatingMessage } from '../hooks/useRotatingMessage';
import type { WalletThemeColors } from '../theme/appTheme';

export type ScanSubmissionLoadingPreset = 'submit' | 'retry';

const SUBMIT_MESSAGES = [
  'Uploading your scan...',
  'Enhancing the card image...',
  'Parsing contact details...',
];

const RETRY_MESSAGES = [
  'Retrying AI cleanup...',
  'Cleaning card edges...',
  'Preparing preview...',
];

interface ScanSubmissionLoadingViewProps {
  progressWidth: Animated.AnimatedInterpolation<string>;
  isHolding: boolean;
  preset: ScanSubmissionLoadingPreset;
  title?: string;
}

function createStyles(wallet: WalletThemeColors) {
  return StyleSheet.create({
    container: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 28,
      gap: 18,
      backgroundColor: wallet.background,
    },
    copy: {
      alignItems: 'center',
      gap: 10,
      maxWidth: 320,
    },
    eyebrow: {
      color: wallet.accentMuted,
      fontSize: 11,
      fontWeight: '700',
      letterSpacing: 1.2,
      textTransform: 'uppercase',
    },
    title: {
      color: wallet.title,
      fontSize: 24,
      fontWeight: '700',
      textAlign: 'center',
      letterSpacing: -0.3,
    },
    message: {
      color: wallet.subtitle,
      fontSize: 15,
      lineHeight: 22,
      textAlign: 'center',
      minHeight: 44,
    },
    progressWrap: {
      width: '100%',
      alignItems: 'center',
      paddingTop: 4,
    },
  });
}

export function ScanSubmissionLoadingView({
  progressWidth,
  isHolding,
  preset,
  title = 'Working on your card',
}: ScanSubmissionLoadingViewProps): React.JSX.Element {
  const { wallet } = useAppTheme();
  const styles = useMemo(() => createStyles(wallet), [wallet]);
  const messages = preset === 'retry' ? RETRY_MESSAGES : SUBMIT_MESSAGES;
  const message = useRotatingMessage(messages, isHolding);

  return (
    <View style={styles.container}>
      <View style={styles.copy}>
        <Text style={styles.eyebrow}>Processing</Text>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.message}>{isHolding ? message : messages[0]}</Text>
      </View>
      <View style={styles.progressWrap}>
        <ScanSubmissionProgress progressWidth={progressWidth} isHolding={isHolding} />
      </View>
    </View>
  );
}
