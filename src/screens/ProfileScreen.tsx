import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { useAuth } from '../context/AuthContext';
import { useAppTheme } from '../context/ThemeContext';
import { useUserCards } from '../hooks/useUserCards';
import type { MainStackParamList } from '../navigation/AppNavigator';
import type { WalletThemeColors } from '../theme/appTheme';
import { getEmailInitials } from '../utils/formatDate';

type ProfileNavigation = NativeStackNavigationProp<MainStackParamList, 'Profile'>;

interface ProfileScreenProps {
  onSignOut: () => Promise<void>;
}

function formatMemberSince(creationTime?: string): string | null {
  if (!creationTime) {
    return null;
  }

  const date = new Date(creationTime);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date.toLocaleDateString(undefined, {
    month: 'long',
    year: 'numeric',
  });
}

type ProfileStyles = ReturnType<typeof createStyles>;

interface ProfileRowProps {
  label: string;
  hint?: string;
  onPress: () => void;
  destructive?: boolean;
  styles: ProfileStyles;
}

function ProfileRow({
  label,
  hint,
  onPress,
  destructive = false,
  styles,
}: ProfileRowProps): React.JSX.Element {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
    >
      <View style={styles.rowCopy}>
        <Text style={[styles.rowLabel, destructive && styles.rowLabelDestructive]}>
          {label}
        </Text>
        {hint ? <Text style={styles.rowHint}>{hint}</Text> : null}
      </View>
      <Text style={styles.rowChevron}>›</Text>
    </Pressable>
  );
}

function createStyles(wallet: WalletThemeColors) {
  return StyleSheet.create({
    container: {
      padding: 24,
      gap: 22,
      backgroundColor: wallet.background,
    },
    hero: {
      alignItems: 'center',
      gap: 10,
      padding: 22,
      backgroundColor: wallet.surface,
      borderRadius: 22,
      borderWidth: 1,
      borderColor: wallet.border,
    },
    avatar: {
      width: 80,
      height: 80,
      borderRadius: 40,
      backgroundColor: wallet.addButton,
      alignItems: 'center',
      justifyContent: 'center',
    },
    avatarText: {
      color: wallet.addButtonText,
      fontSize: 28,
      fontWeight: '700',
      letterSpacing: 1,
    },
    email: {
      fontSize: 18,
      fontWeight: '600',
      color: wallet.title,
      textAlign: 'center',
    },
    memberSince: {
      fontSize: 14,
      color: wallet.subtitle,
    },
    statsRow: {
      flexDirection: 'row',
      gap: 10,
      width: '100%',
      marginTop: 8,
    },
    statCard: {
      flex: 1,
      backgroundColor: wallet.background,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: wallet.border,
      padding: 12,
      gap: 2,
      alignItems: 'center',
    },
    statValue: {
      color: wallet.title,
      fontSize: 18,
      fontWeight: '700',
    },
    statLabel: {
      color: wallet.subtitle,
      fontSize: 12,
      fontWeight: '600',
      textAlign: 'center',
    },
    section: {
      gap: 10,
    },
    sectionTitle: {
      fontSize: 14,
      fontWeight: '700',
      color: wallet.subtitle,
      textTransform: 'uppercase',
      letterSpacing: 0.8,
    },
    card: {
      backgroundColor: wallet.surface,
      borderRadius: 16,
      overflow: 'hidden',
      borderWidth: 1,
      borderColor: wallet.border,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingVertical: 15,
      borderBottomWidth: 1,
      borderBottomColor: wallet.border,
    },
    rowPressed: {
      opacity: 0.7,
    },
    rowCopy: {
      flex: 1,
      gap: 2,
      paddingRight: 12,
    },
    rowLabel: {
      fontSize: 16,
      fontWeight: '600',
      color: wallet.title,
    },
    rowLabelDestructive: {
      fontSize: 16,
      fontWeight: '600',
      color: wallet.error,
    },
    rowHint: {
      fontSize: 13,
      color: wallet.subtitle,
      lineHeight: 18,
    },
    rowChevron: {
      fontSize: 24,
      color: wallet.subtitle,
      fontWeight: '300',
    },
  });
}

export function ProfileScreen({ onSignOut }: ProfileScreenProps): React.JSX.Element {
  const navigation = useNavigation<ProfileNavigation>();
  const { user, sendPasswordReset } = useAuth();
  const { wallet, isDark, toggleColorScheme } = useAppTheme();
  const styles = useMemo(() => createStyles(wallet), [wallet]);
  const { cards: userCards, fetchUserCards } = useUserCards();
  const [signingOut, setSigningOut] = useState(false);
  const [sendingReset, setSendingReset] = useState(false);

  useFocusEffect(
    useCallback(() => {
      void fetchUserCards();
    }, [fetchUserCards]),
  );

  const email = user?.email ?? 'No email on file';
  const memberSince = formatMemberSince(user?.metadata.creationTime);
  const initials = getEmailInitials(user?.email);

  const handlePasswordReset = () => {
    if (!user?.email) {
      Alert.alert('No email', 'This account does not have an email address on file.');
      return;
    }

    Alert.alert(
      'Reset password',
      `Send a password reset link to ${user.email}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Send email',
          onPress: () => {
            void (async () => {
              setSendingReset(true);
              try {
                await sendPasswordReset(user.email!);
                Alert.alert('Check your inbox', 'A password reset email has been sent.');
              } catch {
                Alert.alert('Unable to send', 'Please try again in a moment.');
              } finally {
                setSendingReset(false);
              }
            })();
          },
        },
      ],
    );
  };

  const handleSignOut = () => {
    Alert.alert('Log out', 'Sign out of E-Business Cards?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Log out',
        style: 'destructive',
        onPress: () => {
          void (async () => {
            setSigningOut(true);
            try {
              await onSignOut();
            } finally {
              setSigningOut(false);
            }
          })();
        },
      },
    ]);
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.hero}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{initials}</Text>
        </View>
        <Text style={styles.email}>{email}</Text>
        {memberSince ? (
          <Text style={styles.memberSince}>Member since {memberSince}</Text>
        ) : null}
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{userCards.length}</Text>
            <Text style={styles.statLabel}>
              {userCards.length === 1 ? 'profile card' : 'profile cards'}
            </Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{isDark ? 'Dark' : 'Light'}</Text>
            <Text style={styles.statLabel}>appearance</Text>
          </View>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>My cards</Text>
        <View style={styles.card}>
          <ProfileRow
            styles={styles}
            label="Add business card"
            hint="Scan front/back or enter your details manually"
            onPress={() => navigation.navigate('MyCardScan')}
          />
          {userCards.length > 0 ? (
            <ProfileRow
              styles={styles}
              label="Manage e-business cards"
              hint={`${userCards.length} ${userCards.length === 1 ? 'card' : 'cards'} on your profile`}
              onPress={() => {
                const primary = userCards.find(card => card.is_primary) ?? userCards[0];
                navigation.navigate('MyCardForm', { mode: 'edit', card: primary });
              }}
            />
          ) : null}
          {userCards.length > 1 ? (
            <ProfileRow
              styles={styles}
              label="Reorder business cards"
              hint="Drag to change order and primary card"
              onPress={() => navigation.navigate('ReorderMyCards', { cards: userCards })}
            />
          ) : null}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Appearance</Text>
        <View style={styles.card}>
          <ProfileRow
            styles={styles}
            label={isDark ? 'Dark mode' : 'Light mode'}
            hint={isDark ? 'Currently using dark theme' : 'Currently using light theme'}
            onPress={toggleColorScheme}
          />
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Account</Text>
        <View style={styles.card}>
          <ProfileRow
            styles={styles}
            label={sendingReset ? 'Sending reset email...' : 'Change password'}
            hint="We will email you a reset link"
            onPress={() => {
              if (!sendingReset) {
                handlePasswordReset();
              }
            }}
          />
          <Pressable
            onPress={handleSignOut}
            disabled={signingOut}
            style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
          >
            <View style={styles.rowCopy}>
              {signingOut ? (
                <ActivityIndicator color={wallet.error} />
              ) : (
                <Text style={styles.rowLabelDestructive}>Log out</Text>
              )}
            </View>
          </Pressable>
        </View>
      </View>
    </ScrollView>
  );
}
