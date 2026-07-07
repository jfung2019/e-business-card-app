import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { useAuth } from '../context/AuthContext';
import { useAppTheme } from '../context/ThemeContext';
import type { MainStackParamList } from '../navigation/AppNavigator';
import type { WalletThemeColors } from '../theme/appTheme';

type ChangePasswordNavigation = NativeStackNavigationProp<MainStackParamList, 'ChangePassword'>;

function isStrongPassword(password: string): boolean {
  return password.length >= 8 && /[A-Za-z]/.test(password) && /\d/.test(password);
}

function getChangePasswordErrorMessage(error: unknown): string {
  if (error && typeof error === 'object' && 'code' in error) {
    const code = String((error as { code: string }).code);
    switch (code) {
      case 'auth/wrong-password':
      case 'auth/invalid-credential':
        return 'Your current password is incorrect.';
      case 'auth/weak-password':
        return 'New password must be at least 8 characters and include a letter and a number.';
      case 'auth/requires-recent-login':
        return 'Please sign in again, then try changing your password.';
      case 'auth/too-many-requests':
        return 'Too many attempts. Please wait and try again.';
      default:
        break;
    }
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return 'Unable to change password right now. Please try again.';
}

function createStyles(wallet: WalletThemeColors) {
  return StyleSheet.create({
    flex: {
      flex: 1,
      backgroundColor: wallet.background,
    },
    container: {
      flexGrow: 1,
      padding: 24,
      gap: 18,
      backgroundColor: wallet.background,
    },
    card: {
      backgroundColor: wallet.surface,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: wallet.border,
      padding: 16,
      gap: 14,
    },
    helperText: {
      fontSize: 14,
      color: wallet.subtitle,
      lineHeight: 20,
    },
    field: {
      gap: 6,
    },
    label: {
      fontSize: 13,
      fontWeight: '600',
      color: wallet.subtitle,
      textTransform: 'uppercase',
      letterSpacing: 0.6,
    },
    inputWrap: {
      flexDirection: 'row',
      alignItems: 'center',
      borderWidth: 1,
      borderColor: wallet.border,
      borderRadius: 12,
      backgroundColor: wallet.background,
      paddingRight: 12,
    },
    input: {
      flex: 1,
      paddingHorizontal: 14,
      paddingVertical: Platform.OS === 'ios' ? 13 : 11,
      fontSize: 16,
      color: wallet.title,
    },
    toggle: {
      paddingHorizontal: 4,
      paddingVertical: 8,
    },
    toggleText: {
      fontSize: 13,
      fontWeight: '700',
      color: wallet.accent,
    },
    errorText: {
      color: wallet.error,
      fontWeight: '600',
      fontSize: 14,
    },
    saveButton: {
      marginTop: 2,
      borderRadius: 999,
      backgroundColor: wallet.accent,
      paddingVertical: 14,
      alignItems: 'center',
    },
    saveButtonPressed: {
      opacity: 0.9,
      transform: [{ scale: 0.98 }],
    },
    saveButtonDisabled: {
      opacity: 0.5,
    },
    saveButtonText: {
      color: wallet.addButtonText,
      fontSize: 16,
      fontWeight: '700',
    },
  });
}

export function ChangePasswordScreen(): React.JSX.Element {
  const { changePassword } = useAuth();
  const navigation = useNavigation<ChangePasswordNavigation>();
  const { wallet } = useAppTheme();
  const styles = useMemo(() => createStyles(wallet), [wallet]);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    setError(null);

    if (!currentPassword || !newPassword || !confirmPassword) {
      setError('Please complete all password fields.');
      return;
    }

    if (!isStrongPassword(newPassword)) {
      setError('New password must be at least 8 characters and include a letter and a number.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('New password and confirmation do not match.');
      return;
    }

    if (currentPassword === newPassword) {
      setError('New password must be different from your current password.');
      return;
    }

    setSaving(true);
    try {
      await changePassword(currentPassword, newPassword);
      Alert.alert('Password updated', 'Your password has been changed successfully.', [
        {
          text: 'OK',
          onPress: () => {
            navigation.goBack();
          },
        },
      ]);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (changeError) {
      setError(getChangePasswordErrorMessage(changeError));
    } finally {
      setSaving(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <View style={styles.card}>
          <Text style={styles.helperText}>
            Enter your current password to confirm it is you, then choose a new password.
          </Text>

          <View style={styles.field}>
            <Text style={styles.label}>Current password</Text>
            <View style={styles.inputWrap}>
              <TextInput
                style={styles.input}
                secureTextEntry={!showCurrentPassword}
                autoCapitalize="none"
                autoComplete="current-password"
                placeholder="••••••••"
                placeholderTextColor={wallet.subtitle}
                value={currentPassword}
                onChangeText={setCurrentPassword}
              />
              <Pressable
                style={styles.toggle}
                onPress={() => setShowCurrentPassword((visible) => !visible)}
              >
                <Text style={styles.toggleText}>{showCurrentPassword ? 'Hide' : 'Show'}</Text>
              </Pressable>
            </View>
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>New password</Text>
            <View style={styles.inputWrap}>
              <TextInput
                style={styles.input}
                secureTextEntry={!showNewPassword}
                autoCapitalize="none"
                autoComplete="new-password"
                placeholder="At least 8 characters"
                placeholderTextColor={wallet.subtitle}
                value={newPassword}
                onChangeText={setNewPassword}
              />
              <Pressable
                style={styles.toggle}
                onPress={() => setShowNewPassword((visible) => !visible)}
              >
                <Text style={styles.toggleText}>{showNewPassword ? 'Hide' : 'Show'}</Text>
              </Pressable>
            </View>
            <Text style={styles.helperText}>Use at least 8 characters with a letter and a number.</Text>
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Confirm new password</Text>
            <View style={styles.inputWrap}>
              <TextInput
                style={styles.input}
                secureTextEntry={!showConfirmPassword}
                autoCapitalize="none"
                autoComplete="new-password"
                placeholder="Repeat new password"
                placeholderTextColor={wallet.subtitle}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
              />
              <Pressable
                style={styles.toggle}
                onPress={() => setShowConfirmPassword((visible) => !visible)}
              >
                <Text style={styles.toggleText}>{showConfirmPassword ? 'Hide' : 'Show'}</Text>
              </Pressable>
            </View>
          </View>

          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          <Pressable
            onPress={() => {
              if (!saving) {
                void handleSubmit();
              }
            }}
            disabled={saving}
            style={({ pressed }) => [
              styles.saveButton,
              pressed && styles.saveButtonPressed,
              saving && styles.saveButtonDisabled,
            ]}
          >
            {saving ? (
              <ActivityIndicator color={wallet.addButtonText} />
            ) : (
              <Text style={styles.saveButtonText}>Update password</Text>
            )}
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
