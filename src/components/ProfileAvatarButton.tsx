import React from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';

import { walletColors } from '../theme/wallet';
import { getEmailInitials } from '../utils/formatDate';

interface ProfileAvatarButtonProps {
  email?: string | null;
  onPress: () => void;
}

export function ProfileAvatarButton({
  email,
  onPress,
}: ProfileAvatarButtonProps): React.JSX.Element {
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

const styles = StyleSheet.create({
  button: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.96 }],
  },
  initials: {
    color: walletColors.title,
    fontSize: 14,
    fontWeight: '700',
  },
});
