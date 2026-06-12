import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { walletColors } from '../theme/wallet';

interface MyCardsBannerProps {
  onAdd: () => void;
  onDismiss: () => void;
}

export function MyCardsBanner({ onAdd, onDismiss }: MyCardsBannerProps): React.JSX.Element {
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

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 18,
    gap: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  copy: {
    gap: 6,
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
    color: walletColors.title,
  },
  body: {
    fontSize: 14,
    lineHeight: 20,
    color: walletColors.subtitle,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  primaryButton: {
    backgroundColor: walletColors.addButton,
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  primaryText: {
    color: walletColors.addButtonText,
    fontWeight: '700',
    fontSize: 14,
  },
  dismissButton: {
    paddingHorizontal: 8,
    paddingVertical: 8,
  },
  dismissText: {
    color: walletColors.subtitle,
    fontWeight: '600',
    fontSize: 14,
  },
});
