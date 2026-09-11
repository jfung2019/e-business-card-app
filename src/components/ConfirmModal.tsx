import React, { useMemo } from 'react';
import { Modal, Pressable, StyleSheet, Text } from 'react-native';

import { useAppTheme } from '../context/ThemeContext';
import type { ScanThemeColors } from '../theme/appTheme';

interface ConfirmModalProps {
  visible: boolean;
  title: string;
  message?: string;
  confirmLabel: string;
  cancelLabel?: string;
  onConfirm: () => void;
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
    message: {
      color: scan.creamMuted,
      fontSize: 14,
      lineHeight: 20,
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

export function ConfirmModal({
  visible,
  title,
  message,
  confirmLabel,
  cancelLabel = 'Cancel',
  onConfirm,
  onCancel,
}: ConfirmModalProps): React.JSX.Element {
  const { scan } = useAppTheme();
  const styles = useMemo(() => createStyles(scan), [scan]);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <Pressable style={styles.backdrop} onPress={onCancel}>
        <Pressable style={styles.panel} onPress={() => {}}>
          <Text style={styles.title}>{title}</Text>
          {message ? <Text style={styles.message}>{message}</Text> : null}

          <Pressable
            onPress={onConfirm}
            style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed]}
          >
            <Text style={styles.primaryButtonText}>{confirmLabel}</Text>
          </Pressable>

          <Pressable onPress={onCancel} style={styles.cancelButton}>
            <Text style={styles.cancelText}>{cancelLabel}</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
