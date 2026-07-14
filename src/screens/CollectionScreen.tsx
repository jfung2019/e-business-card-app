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

import { MyCardCarousel } from '../components/MyCardCarousel';
import { ApiTargetBanner } from '../components/ApiTargetBanner';
import { MyCardsBanner } from '../components/MyCardsBanner';
import { ProfileAvatarButton } from '../components/ProfileAvatarButton';
import { SecondaryButton } from '../components/SecondaryButton';
import { WalletCardStack } from '../components/WalletCardStack';
import { COLLECTION_PREVIEW_LIMIT } from '../constants/collection';
import { useAuth } from '../context/AuthContext';
import { useCards } from '../hooks/useCards';
import { useOfflineCardSync } from '../hooks/useOfflineCardSync';
import { useMyCardsBanner } from '../hooks/useMyCardsBanner';
import { useUserCards } from '../hooks/useUserCards';
import type { MainStackParamList } from '../navigation/AppNavigator';
import { useAppTheme } from '../context/ThemeContext';
import type { WalletThemeColors } from '../theme/appTheme';
import type { CapturedCard } from '../types/card';
import type { UserCard } from '../types/userCard';
import { isLocalUserCardId } from '../services/offlineUserCardQueue';
import { APP_DISPLAY_NAME } from '../config/appEnvironment';

type CollectionNavigation = NativeStackNavigationProp<MainStackParamList, 'Collection'>;

export function CollectionScreen(): React.JSX.Element {
  const { wallet } = useAppTheme();
  const styles = useMemo(() => createStyles(wallet), [wallet]);
  const navigation = useNavigation<CollectionNavigation>();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const { state, cards, fetchCards, setCardWalletDisplay, setCardPhotoFace } = useCards();
  const {
    state: userCardsState,
    cards: userCards,
    fetchUserCards,
    setCardWalletDisplay: setUserCardWalletDisplay,
    setCardPhotoFace: setUserCardPhotoFace,
  } = useUserCards();
  const { syncQueuedScans } = useOfflineCardSync();
  const { visible: bannerVisible, dismiss: dismissBanner } = useMyCardsBanner(
    userCards.length > 0,
  );

  const refreshAll = useCallback(async () => {
    await syncQueuedScans();
    await Promise.all([fetchCards(), fetchUserCards()]);
  }, [fetchCards, fetchUserCards, syncQueuedScans]);

  useFocusEffect(
    useCallback(() => {
      void refreshAll();
    }, [refreshAll]),
  );

  const handleCollectedCardPress = (card: CapturedCard) => {
    navigation.navigate('CardDetail', { card });
  };

  const handleMyCardPress = (card: UserCard) => {
    navigation.navigate('MyCardForm', { mode: 'edit', card });
  };

  const isRefreshing =
    (state.status === 'loading' && cards.length > 0) ||
    (userCardsState.status === 'loading' && userCards.length > 0);

  const handleShareMyCard = useCallback(() => {
    const cardToShare =
      userCards.find(card => card.is_primary && !isLocalUserCardId(card._id)) ??
      userCards.find(card => !isLocalUserCardId(card._id));
    if (!cardToShare) {
      return;
    }
    navigation.navigate('ShareMyCard', { cardId: cardToShare._id });
  }, [navigation, userCards]);

  const previewCards = useMemo(
    () => cards.slice(0, COLLECTION_PREVIEW_LIMIT),
    [cards],
  );
  const hasMoreCollected = cards.length > COLLECTION_PREVIEW_LIMIT;
  const isOfflineSnapshot =
    (userCardsState.status === 'success' && userCardsState.isOfflineSnapshot) ||
    (state.status === 'success' && state.isOfflineSnapshot);

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <View style={styles.headerCopy}>
          <Text style={styles.eyebrow}>Wallet</Text>
          <Text style={styles.title}>{APP_DISPLAY_NAME}</Text>
          <Text style={styles.subtitle}>Your cards and collected contacts in one place.</Text>
          <ApiTargetBanner compact />
        </View>
        <View style={styles.headerActions}>
          <ProfileAvatarButton
            email={user?.email}
            onPress={() => navigation.navigate('Profile')}
          />
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={() => void refreshAll()}
            tintColor={wallet.title}
          />
        }
      >
        {isOfflineSnapshot ? (
          <View style={styles.offlineBanner}>
            <Text style={styles.offlineBannerText}>
              Offline mode: showing saved cards from this device. Pending scans will sync when
              you are back online.
            </Text>
          </View>
        ) : null}

        <View style={styles.myCardsSection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>My cards</Text>
            {userCards.length > 1 && !userCards.some(card => isLocalUserCardId(card._id)) ? (
              <Pressable
                onPress={() => navigation.navigate('ReorderMyCards', { cards: userCards })}
              >
                <Text style={styles.sectionAction}>Reorder</Text>
              </Pressable>
            ) : null}
          </View>

          {bannerVisible ? (
            <MyCardsBanner
              onAdd={() => navigation.navigate('MyCardScan')}
              onDismiss={() => void dismissBanner()}
            />
          ) : null}

          {userCardsState.status === 'loading' && userCards.length === 0 ? (
            <View style={styles.inlineLoading}>
              <ActivityIndicator color={wallet.title} />
            </View>
          ) : null}

          {userCardsState.status === 'error' && userCards.length === 0 ? (
            <View style={styles.inlineError}>
              <Text style={styles.errorText}>{userCardsState.message}</Text>
              <Pressable onPress={() => void fetchUserCards()} style={styles.retryButton}>
                <Text style={styles.retryText}>Try again</Text>
              </Pressable>
            </View>
          ) : null}

          {userCardsState.status === 'success' &&
          userCardsState.isOfflineSnapshot &&
          userCards.length === 0 ? (
            <View style={styles.emptyMyCards}>
              <Text style={styles.emptyMyCardsTitle}>No cached business cards</Text>
              <Text style={styles.emptyMyCardsText}>
                Open the app while online once to save your cards on this device.
              </Text>
            </View>
          ) : null}

          {userCards.length > 0 ? (
            <>
              <MyCardCarousel
                cards={userCards}
                onCardPress={handleMyCardPress}
                onWalletDisplayChange={(cardId, walletDisplay) => {
                  void setUserCardWalletDisplay(cardId, walletDisplay);
                }}
                onPhotoFaceChange={(cardId, photoFace) => {
                  void setUserCardPhotoFace(cardId, photoFace);
                }}
              />
              <View style={styles.myCardActions}>
                <SecondaryButton
                  label="Scan my card"
                  onPress={() => navigation.navigate('MyCardScan')}
                />
                <SecondaryButton
                  label="Add manually"
                  onPress={() => navigation.navigate('MyCardForm', { mode: 'create' })}
                />
                <SecondaryButton label="Share my card" onPress={handleShareMyCard} />
              </View>
            </>
          ) : null}

          {!bannerVisible &&
          userCards.length === 0 &&
          userCardsState.status !== 'loading' &&
          !(userCardsState.status === 'success' && userCardsState.isOfflineSnapshot) ? (
            <View style={styles.emptyMyCards}>
              <Text style={styles.emptyMyCardsTitle}>Create the card you share</Text>
              <Text style={styles.emptyMyCardsText}>
                Scan your printed card for a quick start, or enter your details manually.
              </Text>
              <View style={styles.myCardActions}>
                <SecondaryButton
                  label="Scan my card"
                  onPress={() => navigation.navigate('MyCardScan')}
                />
                <SecondaryButton
                  label="Add manually"
                  onPress={() => navigation.navigate('MyCardForm', { mode: 'create' })}
                />
              </View>
            </View>
          ) : null}
        </View>

        <View style={styles.collectedSection}>
          <View style={styles.collectedSectionHeader}>
            <View style={styles.sectionTitleRow}>
              <Text style={styles.sectionTitle}>Collected</Text>
              <View style={styles.sectionTitleActions}>
                {hasMoreCollected ? (
                  <Pressable onPress={() => navigation.navigate('CollectedCards')}>
                    <Text style={styles.sectionAction}>See all</Text>
                  </Pressable>
                ) : null}
                <SecondaryButton
                  label="Scan card"
                  onPress={() => navigation.navigate('Scan')}
                  accessibilityLabel="Scan a collected business card"
                />
              </View>
            </View>
            <Text style={styles.sectionSubtitle}>
              {cards.length === 0
                ? 'Cards you scan from other people will appear here.'
                : hasMoreCollected
                  ? `Showing ${COLLECTION_PREVIEW_LIMIT} most recent of ${cards.length} contacts`
                  : `${cards.length} saved ${cards.length === 1 ? 'contact' : 'contacts'}`}
            </Text>
          </View>

          {state.status === 'loading' && cards.length === 0 && (
            <View style={styles.centered}>
              <ActivityIndicator size="large" color={wallet.title} />
              <Text style={styles.loadingText}>Loading your cards...</Text>
            </View>
          )}

          {state.status === 'error' && cards.length === 0 && (
            <View style={styles.centered}>
              <Text style={styles.errorText}>{state.message}</Text>
              <Pressable onPress={() => void fetchCards()} style={styles.retryButton}>
                <Text style={styles.retryText}>Try again</Text>
              </Pressable>
            </View>
          )}

          {state.status === 'success' && cards.length === 0 && (
            <View style={styles.centered}>
              <Text style={styles.emptyIcon}>▣</Text>
              <Text style={styles.emptyTitle}>No collected cards yet</Text>
              <Text style={styles.emptyBody}>
                Scan a business card to save the photo, contact details, and quick actions.
              </Text>
              <SecondaryButton
                label="Scan a card"
                onPress={() => navigation.navigate('Scan')}
              />
            </View>
          )}

          {cards.length > 0 && (
            <View style={styles.walletSection}>
              <WalletCardStack
                cards={previewCards}
                onCardPress={handleCollectedCardPress}
                onWalletDisplayChange={(cardId, walletDisplay) => {
                  void setCardWalletDisplay(cardId, walletDisplay);
                }}
                onPhotoFaceChange={(cardId, photoFace) => {
                  void setCardPhotoFace(cardId, photoFace);
                }}
              />
              {hasMoreCollected ? (
                <Pressable
                  onPress={() => navigation.navigate('CollectedCards')}
                  style={styles.seeAllButton}
                >
                  <Text style={styles.seeAllButtonText}>
                    See all {cards.length} contacts
                  </Text>
                </Pressable>
              ) : null}
            </View>
          )}
        </View>

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
    paddingHorizontal: 24,
    paddingTop: 8,
    paddingBottom: 20,
    gap: 16,
  },
  headerCopy: {
    flex: 1,
    gap: 4,
  },
  eyebrow: {
    color: wallet.accentMuted,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1.4,
    textTransform: 'uppercase',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: wallet.title,
    letterSpacing: -0.5,
  },
  subtitle: {
    color: wallet.subtitle,
    fontSize: 14,
    lineHeight: 20,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingBottom: 32,
    gap: 28,
  },
  myCardsSection: {
    gap: 14,
  },
  collectedSection: {
    gap: 14,
  },
  collectedSectionHeader: {
    gap: 3,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  sectionTitleActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flexShrink: 0,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: wallet.title,
  },
  sectionSubtitle: {
    color: wallet.subtitle,
    fontSize: 13,
    lineHeight: 18,
  },
  sectionAction: {
    fontSize: 14,
    fontWeight: '600',
    color: wallet.subtitle,
  },
  inlineLoading: {
    paddingVertical: 24,
    alignItems: 'center',
  },
  inlineError: {
    paddingVertical: 16,
    alignItems: 'center',
    gap: 12,
  },
  myCardActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  emptyMyCards: {
    gap: 10,
    padding: 16,
    borderRadius: 18,
    backgroundColor: wallet.surface,
    borderWidth: 1,
    borderColor: wallet.border,
  },
  emptyMyCardsTitle: {
    color: wallet.title,
    fontSize: 17,
    fontWeight: '700',
  },
  emptyMyCardsText: {
    color: wallet.subtitle,
    fontSize: 15,
    lineHeight: 22,
  },
  walletSection: {
    gap: 16,
    paddingBottom: 8,
    overflow: 'visible',
  },
  seeAllButton: {
    alignSelf: 'center',
    borderWidth: 1,
    borderColor: wallet.border,
    borderRadius: 999,
    paddingHorizontal: 18,
    paddingVertical: 10,
    backgroundColor: wallet.surface,
  },
  seeAllButtonText: {
    color: wallet.title,
    fontSize: 14,
    fontWeight: '600',
  },
  centered: {
    minHeight: 240,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    gap: 12,
    backgroundColor: wallet.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: wallet.border,
  },
  emptyIcon: {
    color: wallet.accentMuted,
    fontSize: 32,
    lineHeight: 36,
  },
  loadingText: {
    color: wallet.subtitle,
    fontSize: 15,
  },
  errorText: {
    color: wallet.error,
    fontSize: 15,
    textAlign: 'center',
    fontWeight: '600',
  },
  offlineBanner: {
    backgroundColor: wallet.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: wallet.border,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  offlineBannerText: {
    color: wallet.subtitle,
    fontSize: 13,
    lineHeight: 18,
  },
  retryButton: {
    marginTop: 8,
    borderWidth: 1,
    borderColor: wallet.title,
    borderRadius: 999,
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  retryText: {
    color: wallet.title,
    fontWeight: '600',
  },
  emptyTitle: {
    color: wallet.title,
    fontSize: 22,
    fontWeight: '700',
  },
  emptyBody: {
    color: wallet.subtitle,
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
  },
});
