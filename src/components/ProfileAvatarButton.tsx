import React, { useMemo } from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';

import { useAppTheme } from '../context/ThemeContext';
import type { WalletThemeColors } from '../theme/appTheme';
import { getEmailInitials } from '../utils/formatDate';

interface ProfileAvatarButtonProps {
  email?: string | null;
  onPress: () => void;
}

function createStyles(wallet: WalletThemeColors) {
  return StyleSheet.create({
    button: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: wallet.surface,
      borderWidth: 1,
      borderColor: wallet.border,
      alignItems: 'center',
      justifyContent: 'center',
    },
    buttonPressed: {
      opacity: 0.85,
      transform: [{ scale: 0.96 }],
    },
    initials: {
      color: wallet.title,
      fontSize: 14,
      fontWeight: '700',
    },
  });
}

export function ProfileAvatarButton({
  email,
  onPress,
}: ProfileAvatarButtonProps): React.JSX.Element {
  const { wallet } = useAppTheme();
  const styles = useMemo(() => createStyles(wallet), [wallet]);

  return (
    <Pressable
      onPress={onPress}
      accessibilityLabel="Open profile"
      style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}
    >
      <Text style={styles.initials}>{getEmailInitials(email)}</Text>
    </Pressable>
  );
}
