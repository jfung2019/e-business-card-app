import React, { useCallback, useState } from 'react';
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
import { useUserCards } from '../hooks/useUserCards';
import type { MainStackParamList } from '../navigation/AppNavigator';
import { walletColors } from '../theme/wallet';
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

interface ProfileRowProps {
  label: string;
  hint?: string;
  onPress: () => void;
  destructive?: boolean;
}

function ProfileRow({
  label,
  hint,
  onPress,
  destructive = false,
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

export function ProfileScreen({ onSignOut }: ProfileScreenProps): React.JSX.Element {
  const navigation = useNavigation<ProfileNavigation>();
  const { user, sendPasswordReset } = useAuth();
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
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>My cards</Text>
        <View style={styles.card}>
          <ProfileRow
            label="Add business card"
            hint="Scan or enter your details"
            onPress={() => navigation.navigate('MyCardScan')}
          />
          {userCards.length > 0 ? (
            <ProfileRow
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
              label="Reorder business cards"
              hint="Drag to change order and primary card"
              onPress={() => navigation.navigate('ReorderMyCards', { cards: userCards })}
            />
          ) : null}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Account</Text>
        <View style={styles.card}>
          <ProfileRow
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
                <ActivityIndicator color="#B91C1C" />
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

const styles = StyleSheet.create({
  container: {
    padding: 24,
    gap: 28,
    backgroundColor: walletColors.background,
  },
  hero: {
    alignItems: 'center',
    gap: 10,
    paddingTop: 8,
    paddingBottom: 8,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: walletColors.addButton,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: walletColors.addButtonText,
    fontSize: 28,
    fontWeight: '700',
    letterSpacing: 1,
  },
  email: {
    fontSize: 18,
    fontWeight: '600',
    color: walletColors.title,
    textAlign: 'center',
  },
  memberSince: {
    fontSize: 14,
    color: walletColors.subtitle,
  },
  section: {
    gap: 10,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: walletColors.subtitle,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  rowPressed: {
    backgroundColor: '#F9FAFB',
  },
  rowCopy: {
    flex: 1,
    gap: 2,
    paddingRight: 12,
  },
  rowLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: walletColors.title,
  },
  rowLabelDestructive: {
    fontSize: 16,
    fontWeight: '600',
    color: '#B91C1C',
  },
  rowHint: {
    fontSize: 13,
    color: walletColors.subtitle,
    lineHeight: 18,
  },
  rowChevron: {
    fontSize: 24,
    color: walletColors.subtitle,
    fontWeight: '300',
  },
});
