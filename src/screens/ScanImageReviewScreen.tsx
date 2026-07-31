import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import {
  confirmCardScanEnhancement,
  discardCardScanEnhancement,
} from '../api/cards';
import {
  confirmUserCardScanEnhancement,
  discardUserCardScanEnhancement,
} from '../api/userCards';
import { ScanImage } from '../components/ScanImage';
import { useAppTheme } from '../context/ThemeContext';
import type { MainStackParamList } from '../navigation/AppNavigator';
import type { WalletThemeColors } from '../theme/appTheme';
import type { CapturedCard, PhotoFace } from '../types/card';
import type { UserCard } from '../types/userCard';

type Props = NativeStackScreenProps<MainStackParamList, 'ScanImageReview'>;
type ReviewCard = CapturedCard | UserCard;

function createStyles(wallet: WalletThemeColors) {
  return StyleSheet.create({
    container: { padding: 20, gap: 16, backgroundColor: wallet.background },
    warning: {
      padding: 14,
      borderRadius: 14,
      backgroundColor: wallet.surface,
      borderWidth: 1,
      borderColor: wallet.border,
      gap: 5,
    },
    title: { color: wallet.title, fontSize: 22, fontWeight: '700' },
    text: { color: wallet.subtitle, fontSize: 14, lineHeight: 20 },
    error: { color: wallet.error, fontWeight: '600' },
    tabs: { flexDirection: 'row', gap: 10 },
    tab: {
      flex: 1,
      alignItems: 'center',
      paddingVertical: 10,
      borderRadius: 999,
      borderWidth: 1,
      borderColor: wallet.border,
    },
    tabActive: { backgroundColor: wallet.addButton, borderColor: wallet.addButton },
    tabText: { color: wallet.title, fontWeight: '700' },
    tabTextActive: { color: wallet.addButtonText },
    comparison: { gap: 14 },
    imageBlock: { gap: 7 },
    label: { color: wallet.title, fontSize: 15, fontWeight: '700' },
    image: {
      width: '100%',
      aspectRatio: 1.57,
      borderRadius: 14,
      backgroundColor: wallet.surface,
    },
    unavailable: {
      minHeight: 120,
      borderRadius: 14,
      backgroundColor: wallet.surface,
      alignItems: 'center',
      justifyContent: 'center',
      padding: 20,
    },
    actions: { gap: 10 },
    button: {
      alignItems: 'center',
      borderRadius: 999,
      paddingVertical: 13,
      backgroundColor: wallet.addButton,
    },
    secondary: {
      backgroundColor: wallet.surface,
      borderWidth: 1,
      borderColor: wallet.border,
    },
    buttonText: { color: wallet.addButtonText, fontWeight: '700', fontSize: 15 },
    secondaryText: { color: wallet.title },
    disabled: { opacity: 0.55 },
  });
}

export function ScanImageReviewScreen({ navigation, route }: Props): React.JSX.Element {
  const { wallet } = useAppTheme();
  const styles = useMemo(() => createStyles(wallet), [wallet]);
  const { kind } = route.params;
  const [card, setCard] = useState<ReviewCard>(route.params.card);
  const [face, setFace] = useState<PhotoFace>('front');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(route.params.errorMessage ?? null);

  const originalUrl =
    face === 'front' ? card.scan_image_front_url ?? card.scan_image_url : card.scan_image_back_url;
  const candidateUrl =
    face === 'front' ? card.scan_image_front_pending_url : card.scan_image_back_pending_url;
  const hasBack = Boolean(card.scan_image_back_url || card.scan_image_back_pending_url);
  const hasCandidate = Boolean(
    card.scan_image_front_pending_url || card.scan_image_back_pending_url,
  );

  const finish = (updated: ReviewCard) => {
    if (kind === 'captured') {
      navigation.replace('CardDetail', { card: updated as CapturedCard });
    } else {
      navigation.replace('MyCardForm', { mode: 'edit', card: updated as UserCard });
    }
  };

  const run = async (action: 'confirm' | 'discard') => {
    setBusy(true);
    setError(null);
    try {
      const updated =
        kind === 'captured'
          ? await {
              confirm: confirmCardScanEnhancement,
              discard: discardCardScanEnhancement,
            }[action](card._id)
          : await {
              confirm: confirmUserCardScanEnhancement,
              discard: discardUserCardScanEnhancement,
            }[action](card._id);
      setCard(updated);
      finish(updated);
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : 'Unable to update the scan.');
    } finally {
      setBusy(false);
    }
  };

  const handleRetry = () => {
    if (kind === 'captured') {
      navigation.replace('ScanEnhancementLoading', {
        kind: 'captured',
        cardId: card._id,
        card: card as CapturedCard,
      });
      return;
    }

    navigation.replace('ScanEnhancementLoading', {
      kind: 'user',
      cardId: card._id,
      card: card as UserCard,
    });
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.warning}>
        <Text style={styles.title}>Review AI cleanup</Text>
        <Text style={styles.text}>
          AI may change letters, logos, or colors. Compare carefully before using the cleaned image.
        </Text>
        {card.scan_image_enhancement_error ? (
          <Text style={styles.error}>{card.scan_image_enhancement_error}</Text>
        ) : null}
        {error ? <Text style={styles.error}>{error}</Text> : null}
      </View>

      {hasBack ? (
        <View style={styles.tabs}>
          {(['front', 'back'] as PhotoFace[]).map(option => (
            <Pressable
              key={option}
              onPress={() => setFace(option)}
              style={[styles.tab, face === option && styles.tabActive]}
            >
              <Text style={[styles.tabText, face === option && styles.tabTextActive]}>
                {option === 'front' ? 'Front' : 'Back'}
              </Text>
            </Pressable>
          ))}
        </View>
      ) : null}

      <View style={styles.comparison}>
        <View style={styles.imageBlock}>
          <Text style={styles.label}>Original</Text>
          <ScanImage scanImageUrl={originalUrl} style={styles.image} resizeMode="contain" />
        </View>
        <View style={styles.imageBlock}>
          <Text style={styles.label}>AI cleaned</Text>
          {candidateUrl ? (
            <ScanImage scanImageUrl={candidateUrl} style={styles.image} resizeMode="contain" />
          ) : (
            <View style={styles.unavailable}>
              <Text style={styles.text}>No AI preview is available. Retry or use the original.</Text>
            </View>
          )}
        </View>
      </View>

      <View style={styles.actions}>
        <Pressable
          disabled={busy || !hasCandidate}
          onPress={() => run('confirm')}
          style={[styles.button, (busy || !hasCandidate) && styles.disabled]}
        >
          <Text style={styles.buttonText}>Confirm AI image</Text>
        </Pressable>
        <Pressable
          disabled={busy}
          onPress={handleRetry}
          style={[styles.button, styles.secondary, busy && styles.disabled]}
        >
          <Text style={[styles.buttonText, styles.secondaryText]}>Retry AI cleanup</Text>
        </Pressable>
        <Pressable
          disabled={busy}
          onPress={() => run('discard')}
          style={[styles.button, styles.secondary, busy && styles.disabled]}
        >
          <Text style={[styles.buttonText, styles.secondaryText]}>Use original</Text>
        </Pressable>
        {busy ? <ActivityIndicator color={wallet.accent} /> : null}
      </View>
    </ScrollView>
  );
}
