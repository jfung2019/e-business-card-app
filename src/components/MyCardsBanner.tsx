import React, { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useAppTheme } from '../context/ThemeContext';
import type { WalletThemeColors } from '../theme/appTheme';

interface MyCardsBannerProps {
  onAdd: () => void;
  onDismiss: () => void;
}

function createStyles(wallet: WalletThemeColors) {
  return StyleSheet.create({
    container: {
      backgroundColor: wallet.surface,
      borderRadius: 18,
      padding: 18,
      gap: 14,
      borderWidth: 1,
      borderColor: wallet.border,
    },
    copy: {
      gap: 6,
    },
    title: {
      fontSize: 17,
      fontWeight: '700',
      color: wallet.title,
    },
    body: {
      fontSize: 14,
      lineHeight: 20,
      color: wallet.subtitle,
    },
    actions: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    primaryButton: {
      backgroundColor: wallet.addButton,
      borderRadius: 999,
      paddingHorizontal: 16,
      paddingVertical: 10,
    },
    primaryText: {
      color: wallet.addButtonText,
      fontWeight: '700',
      fontSize: 14,
    },
    dismissButton: {
      paddingHorizontal: 8,
      paddingVertical: 8,
    },
    dismissText: {
      color: wallet.subtitle,
      fontWeight: '600',
      fontSize: 14,
    },
  });
}

export function MyCardsBanner({ onAdd, onDismiss }: MyCardsBannerProps): React.JSX.Element {
  const { wallet } = useAppTheme();
  const styles = useMemo(() => createStyles(wallet), [wallet]);

  return (
    <View style={styles.container}>
      <View style={styles.copy}>
        <Text style={styles.title}>Add your business card</Text>
        <Text style={styles.body}>
          Set up the cards you share with others. You can add more later for different roles.
        </Text>
      </View>
      <View style={styles.actions}>
        <Pressable onPress={onAdd} style={styles.primaryButton}>
          <Text style={styles.primaryText}>Get started</Text>
        </Pressable>
        <Pressable onPress={onDismiss} style={styles.dismissButton}>
          <Text style={styles.dismissText}>Not now</Text>
        </Pressable>
      </View>
    </View>
  );
}
