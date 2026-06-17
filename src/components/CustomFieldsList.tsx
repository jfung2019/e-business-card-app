import React, { useMemo } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';

import { useAppTheme } from '../context/ThemeContext';
import type { WalletThemeColors } from '../theme/appTheme';

interface CustomFieldsListProps {
  customFields: Record<string, string>;
}

function createStyles(wallet: WalletThemeColors) {
  return StyleSheet.create({
    container: {
      backgroundColor: wallet.surface,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: wallet.border,
      padding: 18,
      gap: 12,
    },
    sectionTitle: {
      fontSize: 11,
      fontWeight: '700',
      letterSpacing: 1.2,
      textTransform: 'uppercase',
      color: wallet.accentMuted,
    },
    row: {
      gap: 4,
    },
    label: {
      fontSize: 12,
      fontWeight: '600',
      color: wallet.subtitle,
    },
    value: {
      fontSize: 16,
      lineHeight: 22,
      color: wallet.title,
    },
    separator: {
      height: 12,
    },
  });
}

export function CustomFieldsList({
  customFields,
}: CustomFieldsListProps): React.JSX.Element | null {
  const { wallet } = useAppTheme();
  const styles = useMemo(() => createStyles(wallet), [wallet]);
  const entries = Object.entries(customFields);

  if (entries.length === 0) {
    return null;
  }

  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>Additional details</Text>
      <FlatList
        data={entries}
        keyExtractor={([key]) => key}
        scrollEnabled={false}
        renderItem={({ item: [key, value] }) => (
          <View style={styles.row}>
            <Text style={styles.label}>{key}</Text>
            <Text style={styles.value}>{value}</Text>
          </View>
        )}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
      />
    </View>
  );
}
