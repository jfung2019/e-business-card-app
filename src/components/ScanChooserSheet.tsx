import React, { useMemo } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAppTheme } from '../context/ThemeContext';
import type { WalletThemeColors } from '../theme/appTheme';
import { TabIcon } from './icons/TabIcons';

export type ScanOwner = 'mine' | 'collected';

interface ScanChooserSheetProps {
  visible: boolean;
  onClose: () => void;
  onChoose: (owner: ScanOwner) => void;
}

/**
 * One question: whose card is it. The answer opens that scan screen.
 *
 * Camera or library is asked there rather than here. The scan screen has to
 * offer both anyway — for the back side, and after a cancelled camera — so
 * asking in the sheet as well would put the same choice in two places.
 */
export function ScanChooserSheet({
  visible,
  onClose,
  onChoose,
}: ScanChooserSheetProps): React.JSX.Element {
  const { wallet } = useAppTheme();
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => createStyles(wallet), [wallet]);
  const renderRow = (
    iconName: 'card' | 'contacts' | 'camera' | 'keyboard',
    iconBackground: string,
    title: string,
    subtitle: string,
    onPress: () => void,
  ) => (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
    >
      <View style={[styles.rowIcon, { backgroundColor: iconBackground }]}>
        <TabIcon name={iconName} size={24} color={wallet.addButtonText} />
      </View>
      <View style={styles.rowCopy}>
        <Text style={styles.rowTitle}>{title}</Text>
        <Text style={styles.rowSubtitle}>{subtitle}</Text>
      </View>
    </Pressable>
  );

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <Pressable style={styles.scrim} onPress={onClose} accessibilityLabel="Close" />
      <View style={[styles.sheet, { paddingBottom: insets.bottom + 24 }]}>
        <View style={styles.grabber} />

        <View style={styles.header}>
          <Text style={styles.title}>Whose card is it?</Text>
          <Text style={styles.subtitle}>Front first. The back is optional on both.</Text>
        </View>
        {renderRow(
          'card',
          wallet.accentMuted,
          'My own card',
          'Goes into your wallet and fills the form.',
          () => onChoose('mine'),
        )}
        {renderRow(
          'contacts',
          wallet.addButton,
          "Someone else's card",
          'Saves the contact to Collected.',
          () => onChoose('collected'),
        )}

        <Pressable
          onPress={onClose}
          accessibilityRole="button"
          style={({ pressed }) => [styles.cancel, pressed && styles.rowPressed]}
        >
          <Text style={styles.cancelText}>Cancel</Text>
        </Pressable>
      </View>
    </Modal>
  );
}

function createStyles(wallet: WalletThemeColors) {
  return StyleSheet.create({
    scrim: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(10,10,10,0.5)',
    },
    sheet: {
      position: 'absolute',
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: wallet.surface,
      borderTopLeftRadius: 26,
      borderTopRightRadius: 26,
      paddingHorizontal: 20,
      paddingTop: 10,
      gap: 14,
    },
    grabber: {
      alignSelf: 'center',
      width: 40,
      height: 4,
      borderRadius: 2,
      backgroundColor: wallet.border,
    },
    header: {
      flex: 1,
      gap: 4,
      paddingTop: 4,
    },
    title: {
      fontSize: 21,
      fontWeight: '700',
      color: wallet.title,
    },
    subtitle: {
      fontSize: 13,
      color: wallet.subtitle,
      lineHeight: 18,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 14,
      padding: 16,
      borderRadius: 18,
      borderWidth: 1,
      borderColor: wallet.border,
      backgroundColor: wallet.background,
    },
    rowPressed: {
      opacity: 0.85,
    },
    rowIcon: {
      width: 46,
      height: 46,
      borderRadius: 23,
      alignItems: 'center',
      justifyContent: 'center',
    },
    rowCopy: {
      flex: 1,
      gap: 3,
    },
    rowTitle: {
      fontSize: 16,
      fontWeight: '600',
      color: wallet.title,
    },
    rowSubtitle: {
      fontSize: 13,
      color: wallet.subtitle,
      lineHeight: 18,
    },
    cancel: {
      borderRadius: 999,
      borderWidth: 1,
      borderColor: wallet.border,
      paddingVertical: 14,
      alignItems: 'center',
    },
    cancelText: {
      fontSize: 15,
      fontWeight: '600',
      color: wallet.title,
    },
  });
}
