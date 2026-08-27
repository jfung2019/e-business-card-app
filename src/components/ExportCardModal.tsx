import React, { useMemo } from 'react';
import { ActivityIndicator, Modal, Pressable, StyleSheet, Text } from 'react-native';

import { useAppTheme } from '../context/ThemeContext';
import type { ScanThemeColors } from '../theme/appTheme';

export type CardExportOption = 'pdf' | 'photo';

interface ExportCardModalProps {
  visible: boolean;
  busyOption: CardExportOption | null;
  onSelect: (option: CardExportOption) => void;
  onCancel: () => void;
}

function createStyles(scan: ScanThemeColors) {
  return StyleSheet.create({
    backdrop: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.5)',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 24,
    },
    panel: {
      width: '100%',
      maxWidth: 360,
      gap: 14,
      paddingVertical: 24,
      paddingHorizontal: 24,
      borderRadius: 20,
      backgroundColor: scan.surfaceElevated,
      borderWidth: 1,
      borderColor: scan.border,
    },
    title: {
      color: scan.cream,
      fontSize: 18,
      fontWeight: '700',
      textAlign: 'center',
    },
    primaryButton: {
      marginTop: 4,
      width: '100%',
      backgroundColor: scan.gold,
      borderRadius: 999,
      paddingVertical: 14,
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: 48,
    },
    primaryButtonText: {
      color: scan.background,
      fontSize: 15,
      fontWeight: '700',
    },
    outlineButton: {
      width: '100%',
      borderRadius: 999,
      borderWidth: 1,
      borderColor: scan.gold,
      paddingVertical: 14,
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: 48,
    },
    outlineButtonText: {
      color: scan.goldLight,
      fontSize: 15,
      fontWeight: '700',
    },
    pressed: {
      opacity: 0.85,
    },
    cancelButton: {
      alignSelf: 'center',
      paddingVertical: 6,
      marginTop: 2,
    },
    cancelText: {
      color: scan.creamMuted,
      fontSize: 14,
      fontWeight: '600',
    },
  });
}

export function ExportCardModal({
  visible,
  busyOption,
  onSelect,
  onCancel,
}: ExportCardModalProps): React.JSX.Element {
  const { scan } = useAppTheme();
  const styles = useMemo(() => createStyles(scan), [scan]);
  const isBusy = busyOption !== null;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <Pressable style={styles.backdrop} onPress={isBusy ? undefined : onCancel}>
        <Pressable style={styles.panel} onPress={() => {}}>
          <Text style={styles.title}>Export digital card</Text>

          <Pressable
            onPress={() => onSelect('pdf')}
            disabled={isBusy}
            style={({ pressed }) => [styles.primaryButton, (pressed || isBusy) && styles.pressed]}
          >
            {busyOption === 'pdf' ? (
              <ActivityIndicator color={scan.background} />
            ) : (
              <Text style={styles.primaryButtonText}>Save as PDF</Text>
            )}
          </Pressable>

          <Pressable
            onPress={() => onSelect('photo')}
            disabled={isBusy}
            style={({ pressed }) => [styles.outlineButton, (pressed || isBusy) && styles.pressed]}
          >
            {busyOption === 'photo' ? (
              <ActivityIndicator color={scan.goldLight} />
            ) : (
              <Text style={styles.outlineButtonText}>Save as photo</Text>
            )}
          </Pressable>

          <Pressable onPress={onCancel} disabled={isBusy} style={styles.cancelButton}>
            <Text style={styles.cancelText}>Cancel</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
