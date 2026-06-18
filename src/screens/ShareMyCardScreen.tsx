import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Linking,
  Pressable,
  Share,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';

import { createOrGetUserCardShareLink } from '../api/userCards';
import { useAppTheme } from '../context/ThemeContext';
import type { MainStackParamList } from '../navigation/AppNavigator';
import type { WalletThemeColors } from '../theme/appTheme';

type ShareRoute = RouteProp<MainStackParamList, 'ShareMyCard'>;

function createStyles(wallet: WalletThemeColors) {
  return StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: wallet.background,
      padding: 20,
      gap: 16,
    },
    introCard: {
      backgroundColor: wallet.surface,
      borderRadius: 18,
      borderWidth: 1,
      borderColor: wallet.border,
      padding: 16,
      gap: 6,
    },
    title: {
      color: wallet.title,
      fontSize: 24,
      fontWeight: '700',
    },
    subtitle: {
      color: wallet.subtitle,
      fontSize: 14,
      lineHeight: 20,
    },
    qrCard: {
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: wallet.surface,
      borderRadius: 18,
      borderWidth: 1,
      borderColor: wallet.border,
      padding: 20,
      minHeight: 280,
      gap: 12,
    },
    loader: {
      gap: 10,
      alignItems: 'center',
    },
    helper: {
      color: wallet.subtitle,
      fontSize: 13,
      textAlign: 'center',
      lineHeight: 18,
    },
    qrImage: {
      width: 210,
      height: 210,
      borderRadius: 8,
      backgroundColor: '#FFFFFF',
    },
    linkText: {
      color: wallet.subtitle,
      fontSize: 12,
      textAlign: 'center',
    },
    buttonRow: {
      flexDirection: 'row',
      gap: 10,
    },
    button: {
      flex: 1,
      borderRadius: 999,
      paddingVertical: 13,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: wallet.addButton,
    },
    buttonSecondary: {
      borderWidth: 1,
      borderColor: wallet.border,
      backgroundColor: wallet.surface,
    },
    buttonPressed: {
      opacity: 0.88,
      transform: [{ scale: 0.98 }],
    },
    buttonText: {
      color: wallet.addButtonText,
      fontSize: 15,
      fontWeight: '700',
    },
    buttonTextSecondary: {
      color: wallet.title,
    },
    errorText: {
      color: wallet.error,
      fontWeight: '600',
      textAlign: 'center',
      lineHeight: 20,
    },
  });
}

export function ShareMyCardScreen(): React.JSX.Element {
  const route = useRoute<ShareRoute>();
  const { wallet } = useAppTheme();
  const styles = useMemo(() => createStyles(wallet), [wallet]);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const qrImageUrl = useMemo(() => {
    if (!shareUrl) {
      return null;
    }
    return `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(
      shareUrl,
    )}`;
  }, [shareUrl]);

  const loadShareLink = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const url = await createOrGetUserCardShareLink(route.params.cardId);
      setShareUrl(url);
    } catch (loadError) {
      const message =
        loadError instanceof Error ? loadError.message : 'Unable to generate a share link right now.';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [route.params.cardId]);

  useEffect(() => {
    void loadShareLink();
  }, [loadShareLink]);

  const handleShare = async () => {
    if (!shareUrl) {
      return;
    }
    await Share.share({
      title: 'My E-Business Card',
      message: `Here is my digital business card: ${shareUrl}`,
      url: shareUrl,
    });
  };

  const handleOpenLink = async () => {
    if (!shareUrl) {
      return;
    }
    const canOpen = await Linking.canOpenURL(shareUrl);
    if (!canOpen) {
      Alert.alert('Cannot open link', 'This share URL is not supported on this device.');
      return;
    }
    await Linking.openURL(shareUrl);
  };

  return (
    <View style={styles.screen}>
      <View style={styles.introCard}>
        <Text style={styles.title}>Share my card</Text>
        <Text style={styles.subtitle}>
          Let someone scan this QR code, or send your link directly.
        </Text>
      </View>

      <View style={styles.qrCard}>
        {loading ? (
          <View style={styles.loader}>
            <ActivityIndicator color={wallet.title} size="large" />
            <Text style={styles.helper}>Generating your secure share link...</Text>
          </View>
        ) : null}
        {!loading && error ? <Text style={styles.errorText}>{error}</Text> : null}
        {!loading && shareUrl ? (
          <>
            {qrImageUrl ? <Image source={{ uri: qrImageUrl }} style={styles.qrImage} /> : null}
            <Text style={styles.helper}>Scan to open your shared business card.</Text>
            <Text style={styles.linkText} numberOfLines={2}>
              {shareUrl}
            </Text>
          </>
        ) : null}
      </View>

      <View style={styles.buttonRow}>
        <Pressable
          onPress={() => void handleShare()}
          disabled={!shareUrl || loading}
          style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}
        >
          <Text style={styles.buttonText}>Share link</Text>
        </Pressable>
        <Pressable
          onPress={() => void handleOpenLink()}
          disabled={!shareUrl || loading}
          style={({ pressed }) => [
            styles.button,
            styles.buttonSecondary,
            pressed && styles.buttonPressed,
          ]}
        >
          <Text style={[styles.buttonText, styles.buttonTextSecondary]}>Open link</Text>
        </Pressable>
      </View>
      {error ? (
        <Pressable onPress={() => void loadShareLink()} style={styles.button}>
          <Text style={styles.buttonText}>Try again</Text>
        </Pressable>
      ) : null}
    </View>
  );
}
