import React, { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import {
  ACTIVE_API_TARGET,
  API_FIREBASE_MISMATCH_MESSAGE,
  API_TARGET_LABELS,
  isApiFirebaseEnvironmentAligned,
} from '../config/apiConfig';
import { useAppTheme } from '../context/ThemeContext';

interface ApiTargetBannerProps {
  compact?: boolean;
}

const API_INFO_BANNER = {
  light: { background: '#E8F1FF', text: '#1E40AF' },
  dark: { background: '#1E293B', text: '#93C5FD' },
} as const;

const API_MISMATCH_BANNER = {
  light: { background: '#FEE2E2', text: '#991B1B' },
  dark: { background: '#3F1D1D', text: '#FCA5A5' },
} as const;

export function ApiTargetBanner({ compact = false }: ApiTargetBannerProps): React.JSX.Element | null {
  const { isDark } = useAppTheme();
  const aligned = isApiFirebaseEnvironmentAligned();

  if (ACTIVE_API_TARGET === 'prod' && aligned) {
    return null;
  }

  const palette = isDark
    ? (aligned ? API_INFO_BANNER.dark : API_MISMATCH_BANNER.dark)
    : (aligned ? API_INFO_BANNER.light : API_MISMATCH_BANNER.light);
  const styles = useMemo(() => createStyles(palette, compact), [palette, compact]);

  if (!aligned) {
    return (
      <View style={styles.banner} accessibilityRole="alert">
        <Text style={styles.label}>API / Firebase mismatch</Text>
        {!compact ? <Text style={styles.message}>{API_FIREBASE_MISMATCH_MESSAGE}</Text> : null}
      </View>
    );
  }

  const detail = API_TARGET_LABELS[ACTIVE_API_TARGET] ?? ACTIVE_API_TARGET;

  return (
    <View style={styles.banner} accessibilityRole="text">
      <Text style={styles.label}>API target: {ACTIVE_API_TARGET}</Text>
      {!compact ? <Text style={styles.message}>Connected to {detail}.</Text> : null}
    </View>
  );
}

function createStyles(
  palette: { background: string; text: string },
  compact: boolean,
) {
  return StyleSheet.create({
    banner: {
      backgroundColor: palette.background,
      borderRadius: compact ? 12 : 14,
      paddingHorizontal: compact ? 12 : 14,
      paddingVertical: compact ? 8 : 12,
      gap: compact ? 0 : 4,
      marginTop: compact ? 8 : 0,
    },
    label: {
      color: palette.text,
      fontSize: compact ? 12 : 13,
      fontWeight: '700',
      letterSpacing: 0.3,
      textTransform: 'uppercase',
    },
    message: {
      color: palette.text,
      fontSize: 13,
      lineHeight: 18,
    },
  });
}
