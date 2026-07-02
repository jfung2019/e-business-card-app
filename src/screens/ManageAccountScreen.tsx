import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { useAuth } from '../context/AuthContext';
import { useShareLink } from '../context/ShareLinkContext';
import { useAppTheme } from '../context/ThemeContext';
import type { WalletThemeColors } from '../theme/appTheme';

function createStyles(wallet: WalletThemeColors) {
  return StyleSheet.create({
    container: {
      flexGrow: 1,
      padding: 24,
      gap: 24,
      backgroundColor: wallet.background,
    },
    card: {
      backgroundColor: wallet.surface,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: wallet.border,
      padding: 16,
      gap: 8,
    },
    label: {
      fontSize: 13,
      fontWeight: '600',
      color: wallet.subtitle,
      textTransform: 'uppercase',
      letterSpacing: 0.6,
    },
    email: {
      fontSize: 16,
      fontWeight: '600',
      color: wallet.title,
    },
    body: {
      fontSize: 14,
      color: wallet.subtitle,
      lineHeight: 20,
    },
    footer: {
      marginTop: 'auto',
      alignItems: 'center',
      gap: 8,
      paddingTop: 16,
      paddingBottom: 8,
    },
    deleteLink: {
      fontSize: 14,
      fontWeight: '600',
      color: wallet.error,
    },
    deleteHint: {
      fontSize: 12,
      color: wallet.subtitle,
      textAlign: 'center',
      lineHeight: 18,
      maxWidth: 280,
    },
    deletePressed: {
      opacity: 0.7,
    },
  });
}

export function ManageAccountScreen(): React.JSX.Element {
  const { user, deleteAccount } = useAuth();
  const { clearPendingToken } = useShareLink();
  const { wallet } = useAppTheme();
  const styles = useMemo(() => createStyles(wallet), [wallet]);
  const [deletingAccount, setDeletingAccount] = useState(false);

  const handleDeleteAccount = () => {
    Alert.alert(
      'Delete account',
      'This permanently deletes your account, profile cards, collected cards, share links, and scan images. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete account',
          style: 'destructive',
          onPress: () => {
            Alert.alert(
              'Are you absolutely sure?',
              'You will lose access to this account and all saved cards.',
              [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Yes, delete',
                  style: 'destructive',
                  onPress: () => {
                    void (async () => {
                      setDeletingAccount(true);
                      try {
                        await deleteAccount();
                        await clearPendingToken();
                      } catch (error) {
                        const message =
                          error instanceof Error
                            ? error.message
                            : 'Unable to delete your account right now. Please try again.';
                        Alert.alert('Delete failed', message);
                      } finally {
                        setDeletingAccount(false);
                      }
                    })();
                  },
                },
              ],
            );
          },
        },
      ],
    );
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.card}>
        <Text style={styles.label}>Signed in as</Text>
        <Text style={styles.email}>{user?.email ?? 'No email on file'}</Text>
        <Text style={styles.body}>
          Deleting your account permanently removes your profile cards, collected cards, share
          links, and scan images from our servers.
        </Text>
      </View>

      <View style={styles.footer}>
        {deletingAccount ? (
          <ActivityIndicator color={wallet.error} />
        ) : (
          <Pressable
            onPress={handleDeleteAccount}
            disabled={deletingAccount}
            style={({ pressed }) => [pressed && styles.deletePressed]}
          >
            <Text style={styles.deleteLink}>Delete account</Text>
          </Pressable>
        )}
        <Text style={styles.deleteHint}>This action is permanent and cannot be undone.</Text>
      </View>
    </ScrollView>
  );
}
