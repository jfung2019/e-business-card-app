import React, { useCallback, useMemo } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { MyCardWalletStack } from '../components/MyCardWalletStack';
import { ProfileAvatarButton } from '../components/ProfileAvatarButton';
import { SecondaryButton } from '../components/SecondaryButton';
import { useAuth } from '../context/AuthContext';
import { applyWalletLimit, useCardPrefs } from '../context/CardPrefsContext';
import { useAppTheme } from '../context/ThemeContext';
import { useOfflineCardSync } from '../hooks/useOfflineCardSync';
import { useUserCards } from '../hooks/useUserCards';
import type { MainStackParamList } from '../navigation/AppNavigator';
import type { WalletThemeColors } from '../theme/appTheme';
import type { UserCard } from '../types/userCard';

type MyCardsNavigation = NativeStackNavigationProp<MainStackParamList, 'Collection'>;

export function MyCardsScreen(): React.JSX.Element {
  const { wallet } = useAppTheme();
  const styles = useMemo(() => createStyles(wallet), [wallet]);
  const navigation = useNavigation<MyCardsNavigation>();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { walletLimit } = useCardPrefs();
  const {
    state,
    cards,
    fetchUserCards,
    setCardWalletDisplay,
    setCardPhotoFace,
  } = useUserCards();
  const { syncQueuedScans } = useOfflineCardSync();

  const refresh = useCallback(async () => {
    await syncQueuedScans();
    await fetchUserCards();
  }, [fetchUserCards, syncQueuedScans]);

  useFocusEffect(
    useCallback(() => {
      void refresh();
    }, [refresh]),
  );

  // The card on top of the stack is the one you hand out, so the primary leads
  // however the server ordered the list.
  const orderedCards = useMemo(() => {
    const primaryIndex = cards.findIndex(card => card.is_primary);
    if (primaryIndex <= 0) {
      return cards;
    }
    const rest = cards.filter((_, index) => index !== primaryIndex);
    return [cards[primaryIndex], ...rest];
  }, [cards]);

  const visibleCards = useMemo(
    () => applyWalletLimit(orderedCards, walletLimit),
    [orderedCards, walletLimit],
  );
  const hiddenCount = cards.length - visibleCards.length;
  const primaryCard = orderedCards[0] ?? null;

  const openCard = (card: UserCard) => {
    navigation.navigate('MyCard', { card });
  };

  const browseAll = () => {
    navigation.navigate('AllMyCards');
  };

  const isRefreshing = state.status === 'loading' && cards.length > 0;
  const isEmpty = cards.length === 0 && state.status !== 'loading';

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <View style={styles.headerCopy}>
          <Text style={styles.title}>My cards</Text>
          <Text style={styles.subtitle}>
            {cards.length === 0
              ? 'The card you hand out'
              : `${cards.length} ${cards.length === 1 ? 'card' : 'cards'}${
                  primaryCard?.core_fields.company_name
                    ? ` · ${primaryCard.core_fields.company_name} is primary`
                    : ''
                }`}
          </Text>
        </View>
        <ProfileAvatarButton
          email={user?.email}
          onPress={() => navigation.navigate('Profile')}
        />
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={() => void refresh()}
            tintColor={wallet.title}
          />
        }
      >
        {state.status === 'loading' && cards.length === 0 ? (
          <View style={styles.centered}>
            <ActivityIndicator color={wallet.title} />
          </View>
        ) : null}

        {state.status === 'error' && cards.length === 0 ? (
          <View style={styles.centered}>
            <Text style={styles.errorText}>{state.message}</Text>
            <SecondaryButton label="Try again" onPress={() => void fetchUserCards()} />
          </View>
        ) : null}

        {isEmpty && state.status !== 'error' ? (
          <View style={styles.empty}>
            <View style={styles.ghostCard}>
              <Text style={styles.ghostText}>Your card appears here</Text>
            </View>
            <Text style={styles.emptyTitle}>No cards yet</Text>
            <Text style={styles.emptyBody}>
              Scan a printed card with the camera button below, or type the details in
              yourself.
            </Text>
            <View style={styles.emptyActions}>
              <SecondaryButton
                label="Scan my card"
                onPress={() => navigation.navigate('MyCardScan')}
              />
              <SecondaryButton
                label="Type it in"
                onPress={() => navigation.navigate('MyCardForm', { mode: 'create' })}
              />
            </View>
          </View>
        ) : null}

        {visibleCards.length > 0 ? (
          <>
            <MyCardWalletStack
              cards={visibleCards}
              onCardPress={openCard}
              onWalletDisplayChange={(cardId, walletDisplay) => {
                void setCardWalletDisplay(cardId, walletDisplay);
              }}
              onPhotoFaceChange={(cardId, photoFace) => {
                void setCardPhotoFace(cardId, photoFace);
              }}
            />

            <View style={styles.footer}>
              <Pressable onPress={browseAll} hitSlop={8}>
                <Text style={styles.browseLink}>
                  {hiddenCount > 0
                    ? `Browse all ${cards.length} cards`
                    : 'Browse all cards'}
                </Text>
              </Pressable>
              <Text style={styles.footerHint}>Tap a card to share, export or edit it.</Text>
            </View>
          </>
        ) : null}
      </ScrollView>
    </View>
  );
}

const createStyles = (wallet: WalletThemeColors) =>
  StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: wallet.background,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      gap: 12,
      paddingHorizontal: 20,
      paddingTop: 12,
      paddingBottom: 12,
    },
    headerCopy: {
      flex: 1,
      gap: 2,
    },
    title: {
      fontSize: 27,
      fontWeight: '700',
      color: wallet.title,
      letterSpacing: -0.4,
    },
    subtitle: {
      fontSize: 13,
      color: wallet.subtitle,
    },
    content: {
      paddingHorizontal: 20,
      paddingBottom: 32,
    },
    centered: {
      paddingVertical: 48,
      alignItems: 'center',
      gap: 12,
    },
    errorText: {
      color: wallet.error,
      fontSize: 15,
      fontWeight: '600',
      textAlign: 'center',
    },
    empty: {
      alignItems: 'center',
      gap: 14,
      paddingTop: 24,
    },
    ghostCard: {
      width: '100%',
      height: 186,
      borderRadius: 20,
      borderWidth: 2,
      borderStyle: 'dashed',
      borderColor: wallet.border,
      alignItems: 'center',
      justifyContent: 'center',
    },
    ghostText: {
      color: wallet.subtitle,
      fontSize: 13,
    },
    emptyTitle: {
      fontSize: 20,
      fontWeight: '700',
      color: wallet.title,
    },
    emptyBody: {
      fontSize: 14,
      lineHeight: 21,
      color: wallet.subtitle,
      textAlign: 'center',
      maxWidth: 300,
    },
    emptyActions: {
      flexDirection: 'row',
      gap: 10,
      flexWrap: 'wrap',
      justifyContent: 'center',
    },
    footer: {
      alignItems: 'center',
      gap: 6,
      marginTop: 18,
    },
    browseLink: {
      fontSize: 13,
      fontWeight: '600',
      color: wallet.accentMuted,
    },
    footerHint: {
      fontSize: 12,
      color: wallet.subtitle,
    },
  });
