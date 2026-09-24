import React, { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAppTheme } from '../context/ThemeContext';
import type { WalletThemeColors } from '../theme/appTheme';
import { AddContactScreen } from './AddContactScreen';
import { MyCardFormScreen } from './MyCardFormScreen';

type AddMode = 'mine' | 'contact';

/**
 * The Add tab: type a card in rather than scanning it.
 *
 * Both halves already exist as screens, so this only owns the choice between
 * them — which is the one thing a user has to make before typing anything.
 */
export function AddScreen(): React.JSX.Element {
  const { wallet } = useAppTheme();
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => createStyles(wallet), [wallet]);
  const [mode, setMode] = useState<AddMode>('mine');

  const renderTab = (value: AddMode, label: string) => {
    const selected = mode === value;
    return (
      <Pressable
        onPress={() => setMode(value)}
        accessibilityRole="button"
        accessibilityState={selected ? { selected: true } : {}}
        style={[styles.segmentItem, selected && styles.segmentItemActive]}
      >
        <Text style={[styles.segmentLabel, selected && styles.segmentLabelActive]}>
          {label}
        </Text>
      </Pressable>
    );
  };

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={styles.title}>Add a card</Text>
        <Text style={styles.subtitle}>Type the details in. No photo needed.</Text>
      </View>

      <View style={styles.segment}>
        {renderTab('mine', 'My own card')}
        {renderTab('contact', 'A contact')}
      </View>

      <View style={styles.body}>
        {mode === 'mine' ? <MyCardFormScreen /> : <AddContactScreen />}
      </View>
    </View>
  );
}

const createStyles = (wallet: WalletThemeColors) =>
  StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: wallet.background,
    },
    header: {
      paddingHorizontal: 20,
      paddingTop: 12,
      paddingBottom: 10,
      gap: 2,
    },
    title: {
      fontSize: 27,
      fontWeight: '700',
      color: wallet.title,
      letterSpacing: -0.4,
    },
    subtitle: {
      fontSize: 13,
      color: wallet.subtitle,
    },
    segment: {
      flexDirection: 'row',
      marginHorizontal: 20,
      marginBottom: 6,
      backgroundColor: wallet.border,
      borderRadius: 999,
      padding: 3,
    },
    segmentItem: {
      flex: 1,
      alignItems: 'center',
      paddingVertical: 9,
      borderRadius: 999,
    },
    segmentItemActive: {
      backgroundColor: wallet.surface,
    },
    segmentLabel: {
      fontSize: 14,
      fontWeight: '500',
      color: wallet.subtitle,
    },
    segmentLabelActive: {
      color: wallet.title,
      fontWeight: '700',
    },
    body: {
      flex: 1,
    },
  });
