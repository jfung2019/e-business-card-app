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
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAuth } from '../context/AuthContext';
import { useAppTheme } from '../context/ThemeContext';
import type { AppThemeColors } from '../theme/appTheme';

type AuthMode = 'signIn' | 'signUp';

function getAuthErrorMessage(error: unknown): string {
  if (error && typeof error === 'object' && 'code' in error) {
    const code = String((error as { code: string }).code);
    switch (code) {
      case 'auth/invalid-email':
        return 'Please enter a valid email address.';
      case 'auth/user-not-found':
      case 'auth/wrong-password':
      case 'auth/invalid-credential':
        return 'Incorrect email or password.';
      case 'auth/email-already-in-use':
        return 'An account with this email already exists.';
      case 'auth/weak-password':
        return 'Password must be at least 6 characters.';
      case 'auth/too-many-requests':
        return 'Too many attempts. Please try again later.';
      default:
        break;
    }
  }
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return 'Something went wrong. Please try again.';
}

function createStyles(colors: AppThemeColors) {
  return StyleSheet.create({
    flex: {
      flex: 1,
      backgroundColor: colors.background,
    },
    themeToggle: {
      alignSelf: 'flex-end',
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 999,
      paddingHorizontal: 12,
      paddingVertical: 6,
      backgroundColor: colors.surface,
      marginBottom: 28,
    },
    themeToggleText: {
      color: colors.textMuted,
      fontSize: 13,
      fontWeight: '600',
    },
    container: {
      flexGrow: 1,
      justifyContent: 'center',
      padding: 24,
      gap: 14,
    },
    brandBlock: {
      alignItems: 'center',
      gap: 14,
      marginBottom: 4,
    },
    cardMark: {
      width: 132,
      height: 78,
      borderRadius: 18,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 14,
      justifyContent: 'space-between',
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.08,
      shadowRadius: 18,
      elevation: 4,
    },
    cardMarkAccent: {
      width: 34,
      height: 5,
      borderRadius: 999,
      backgroundColor: colors.primary,
    },
    cardMarkLine: {
      width: '78%',
      height: 6,
      borderRadius: 999,
      backgroundColor: colors.border,
    },
    cardMarkLineShort: {
      width: '48%',
      height: 6,
      borderRadius: 999,
      backgroundColor: colors.border,
    },
    title: {
      fontSize: 30,
      fontWeight: '700',
      color: colors.text,
      textAlign: 'center',
      letterSpacing: -0.4,
    },
    subtitle: {
      fontSize: 14,
      color: colors.textMuted,
      lineHeight: 20,
      textAlign: 'center',
      marginBottom: 10,
    },
    formCard: {
      gap: 14,
      marginTop: 4,
    },
    field: {
      gap: 6,
    },
    label: {
      fontSize: 13,
      fontWeight: '600',
      color: colors.text,
    },
    input: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 12,
      paddingHorizontal: 14,
      paddingVertical: Platform.OS === 'ios' ? 13 : 11,
      fontSize: 16,
      color: colors.text,
      backgroundColor: colors.surface,
    },
    passwordInputWrap: {
      flexDirection: 'row',
      alignItems: 'center',
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 12,
      backgroundColor: colors.surface,
      paddingRight: 12,
    },
    passwordInput: {
      flex: 1,
      paddingHorizontal: 14,
      paddingVertical: Platform.OS === 'ios' ? 13 : 11,
      fontSize: 16,
      color: colors.text,
    },
    passwordToggle: {
      paddingHorizontal: 4,
      paddingVertical: 8,
    },
    passwordToggleText: {
      color: colors.primary,
      fontSize: 13,
      fontWeight: '700',
    },
    helperText: {
      color: colors.textMuted,
      fontSize: 12,
      lineHeight: 17,
    },
    link: {
      color: colors.primary,
      fontWeight: '600',
      fontSize: 14,
    },
    errorText: {
      color: colors.error,
      fontWeight: '600',
    },
    loader: {
      marginVertical: 8,
    },
    primaryButton: {
      width: '100%',
      backgroundColor: colors.primary,
      borderRadius: 999,
      paddingVertical: 15,
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: 2,
    },
    primaryButtonPressed: {
      opacity: 0.9,
      transform: [{ scale: 0.98 }],
    },
    primaryButtonText: {
      color: colors.primaryText,
      fontSize: 16,
      fontWeight: '700',
    },
    toggle: {
      alignItems: 'center',
      marginTop: 4,
    },
    toggleText: {
      color: colors.primary,
      fontSize: 14,
      fontWeight: '600',
    },
  });
}

export function LoginScreen(): React.JSX.Element {
  const insets = useSafeAreaInsets();
  const { signIn, signUp, sendPasswordReset } = useAuth();
  const { colors, colorScheme, toggleColorScheme } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [mode, setMode] = useState<AuthMode>('signIn');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    setError(null);
    const trimmedEmail = email.trim();
    if (!trimmedEmail || !password) {
      setError('Email and password are required.');
      return;
    }
    if (mode === 'signUp' && password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    setLoading(true);
    try {
      if (mode === 'signIn') {
        await signIn(trimmedEmail, password);
      } else {
        await signUp(trimmedEmail, password);
      }
    } catch (submitError) {
      setError(getAuthErrorMessage(submitError));
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      setError('Enter your email address first, then tap Forgot password.');
      return;
    }

    setError(null);
    setLoading(true);
    try {
      await sendPasswordReset(trimmedEmail);
      Alert.alert(
        'Check your email',
        'If an account exists for this address, a password reset link has been sent.',
      );
    } catch (resetError) {
      setError(getAuthErrorMessage(resetError));
    } finally {
      setLoading(false);
    }
  };

  const toggleMode = () => {
    setError(null);
    setPasswordVisible(false);
    setMode((current) => (current === 'signIn' ? 'signUp' : 'signIn'));
  };

  const submitLabel = mode === 'signIn' ? 'Sign In' : 'Create Account';
  const themeToggleLabel = colorScheme === 'light' ? 'Dark mode' : 'Light mode';

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={[
          styles.container,
          { paddingTop: insets.top + 8, paddingBottom: insets.bottom + 24 },
        ]}
        keyboardShouldPersistTaps="handled"
      >
        <Pressable
          onPress={toggleColorScheme}
          style={styles.themeToggle}
          accessibilityRole="button"
          accessibilityLabel={themeToggleLabel}
        >
          <Text style={styles.themeToggleText}>{themeToggleLabel}</Text>
        </Pressable>

        <View style={styles.brandBlock}>
          <View style={styles.cardMark}>
            <View style={styles.cardMarkAccent} />
            <View>
              <View style={styles.cardMarkLine} />
              <View style={[styles.cardMarkLineShort, { marginTop: 7 }]} />
            </View>
          </View>

          <View>
            <Text style={styles.title}>E-Business Card</Text>
            <Text style={styles.subtitle}>
              {mode === 'signIn'
                ? 'Sign in to scan and save business cards.'
                : 'Create an account to get started.'}
            </Text>
          </View>
        </View>

        <View style={styles.formCard}>
          <View style={styles.field}>
            <Text style={styles.label}>Email</Text>
            <TextInput
              autoCapitalize="none"
              autoComplete="email"
              autoCorrect={false}
              keyboardType="email-address"
              placeholder="you@example.com"
              placeholderTextColor={colors.placeholder}
              style={styles.input}
              value={email}
              onChangeText={setEmail}
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Password</Text>
            <View style={styles.passwordInputWrap}>
              <TextInput
                autoCapitalize="none"
                autoComplete={mode === 'signIn' ? 'current-password' : 'new-password'}
                secureTextEntry={!passwordVisible}
                placeholder="••••••••"
                placeholderTextColor={colors.placeholder}
                style={styles.passwordInput}
                value={password}
                onChangeText={setPassword}
              />
              <Pressable
                onPress={() => setPasswordVisible((visible) => !visible)}
                style={styles.passwordToggle}
                accessibilityRole="button"
                accessibilityLabel={passwordVisible ? 'Hide password' : 'Show password'}
              >
                <Text style={styles.passwordToggleText}>
                  {passwordVisible ? 'Hide' : 'Show'}
                </Text>
              </Pressable>
            </View>
            {mode === 'signUp' ? (
              <Text style={styles.helperText}>Use at least 6 characters.</Text>
            ) : null}
          </View>

          {mode === 'signIn' && (
            <Pressable onPress={handleForgotPassword} disabled={loading}>
              <Text style={styles.link}>Forgot password?</Text>
            </Pressable>
          )}

          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          {loading ? (
            <ActivityIndicator size="large" color={colors.primary} style={styles.loader} />
          ) : (
            <Pressable
              onPress={handleSubmit}
              style={({ pressed }) => [
                styles.primaryButton,
                pressed && styles.primaryButtonPressed,
              ]}
              accessibilityRole="button"
              accessibilityLabel={submitLabel}
            >
              <Text style={styles.primaryButtonText}>{submitLabel}</Text>
            </Pressable>
          )}
        </View>

        <Pressable
          onPress={toggleMode}
          disabled={loading}
          style={styles.toggle}
          accessibilityRole="button"
        >
          <Text style={styles.toggleText}>
            {mode === 'signIn'
              ? "Don't have an account? Create one"
              : 'Already have an account? Sign in'}
          </Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
