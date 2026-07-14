import React, { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import firebase from '@react-native-firebase/app';

import {
  ACTIVE_API_TARGET,
  API_BASE_URL,
  APP_ENVIRONMENT,
} from '../config/apiConfig';
import { useAppTheme } from '../context/ThemeContext';

const DIAG_BANNER = {
  light: { background: '#F3F4F6', text: '#374151' },
  dark: { background: '#1F2937', text: '#D1D5DB' },
} as const;

export function DevDiagnostics(): React.JSX.Element | null {
  const { isDark } = useAppTheme();
  const palette = isDark ? DIAG_BANNER.dark : DIAG_BANNER.light;
  const styles = useMemo(() => createStyles(palette), [palette]);

  if (!__DEV__ || APP_ENVIRONMENT !== 'dev') {
    return null;
  }

  const firebaseProject = firebase.app().options.projectId ?? 'unknown';

  return (
    <View style={styles.banner}>
      <Text style={styles.label}>Debug build info</Text>
      <Text style={styles.line}>App flavor: {APP_ENVIRONMENT}</Text>
      <Text style={styles.line}>API target: {ACTIVE_API_TARGET}</Text>
      <Text style={styles.line}>API URL: {API_BASE_URL}</Text>
      <Text style={styles.line}>Firebase project: {firebaseProject}</Text>
    </View>
  );
}

function createStyles(palette: { background: string; text: string }) {
  return StyleSheet.create({
    banner: {
      backgroundColor: palette.background,
      borderRadius: 14,
      paddingHorizontal: 14,
      paddingVertical: 12,
      gap: 4,
    },
    label: {
      color: palette.text,
      fontSize: 12,
      fontWeight: '700',
      letterSpacing: 0.3,
      textTransform: 'uppercase',
      marginBottom: 2,
    },
    line: {
      color: palette.text,
      fontSize: 12,
      lineHeight: 17,
    },
  });
}
