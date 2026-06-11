import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Button,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import { useAuth } from '../context/AuthContext';

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

export function LoginScreen(): React.JSX.Element {
  const { signIn, signUp, sendPasswordReset } = useAuth();
  const [mode, setMode] = useState<AuthMode>('signIn');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    setError(null);
    const trimmedEmail = email.trim();
    if (!trimmedEmail || !password) {
      setError('Email and password are required.');
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
    setMode((current) => (current === 'signIn' ? 'signUp' : 'signIn'));
  };

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>E-Business Card</Text>
        <Text style={styles.subtitle}>
          {mode === 'signIn'
            ? 'Sign in to scan and save business cards.'
            : 'Create an account to get started.'}
        </Text>

        <View style={styles.field}>
          <Text style={styles.label}>Email</Text>
          <TextInput
            autoCapitalize="none"
            autoComplete="email"
            autoCorrect={false}
            keyboardType="email-address"
            placeholder="you@example.com"
            style={styles.input}
            value={email}
            onChangeText={setEmail}
          />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Password</Text>
          <TextInput
            autoCapitalize="none"
            autoComplete="password"
            secureTextEntry
            placeholder="••••••••"
            style={styles.input}
            value={password}
            onChangeText={setPassword}
          />
        </View>

        {mode === 'signIn' && (
          <TouchableOpacity onPress={handleForgotPassword} disabled={loading}>
            <Text style={styles.link}>Forgot password?</Text>
          </TouchableOpacity>
        )}

        {error && <Text style={styles.errorText}>{error}</Text>}

        {loading ? (
          <ActivityIndicator size="large" style={styles.loader} />
        ) : (
          <Button
            title={mode === 'signIn' ? 'Sign In' : 'Create Account'}
            onPress={handleSubmit}
          />
        )}

        <TouchableOpacity onPress={toggleMode} disabled={loading} style={styles.toggle}>
          <Text style={styles.toggleText}>
            {mode === 'signIn'
              ? "Don't have an account? Create one"
              : 'Already have an account? Sign in'}
          </Text>
        </TouchableOpacity>

        <View style={styles.googlePlaceholder}>
          <Button title="Google Sign-In (coming soon)" disabled onPress={() => undefined} />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  container: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 24,
    gap: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#111827',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
    textAlign: 'center',
    marginBottom: 8,
  },
  field: {
    gap: 6,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
  },
  input: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    color: '#111827',
    backgroundColor: '#FFFFFF',
  },
  link: {
    color: '#2563EB',
    fontWeight: '600',
    fontSize: 14,
  },
  errorText: {
    color: '#B91C1C',
    fontWeight: '600',
  },
  loader: {
    marginVertical: 8,
  },
  toggle: {
    alignItems: 'center',
    marginTop: 4,
  },
  toggleText: {
    color: '#2563EB',
    fontSize: 14,
    fontWeight: '600',
  },
  googlePlaceholder: {
    marginTop: 8,
    opacity: 0.6,
  },
});
