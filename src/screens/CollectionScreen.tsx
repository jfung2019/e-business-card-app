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
import { MyCardsBanner } from '../components/MyCardsBanner';
import { ProfileAvatarButton } from '../components/ProfileAvatarButton';
import { WalletCardStack } from '../components/WalletCardStack';
import { useAuth } from '../context/AuthContext';
import { useCards } from '../hooks/useCards';
import { useMyCardsBanner } from '../hooks/useMyCardsBanner';
import { useUserCards } from '../hooks/useUserCards';
import type { MainStackParamList } from '../navigation/AppNavigator';
import { useAppTheme } from '../context/ThemeContext';
import type { WalletThemeColors } from '../theme/appTheme';
import type { CapturedCard } from '../types/card';
import type { UserCard } from '../types/userCard';

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
  const { visible: bannerVisible, dismiss: dismissBanner } = useMyCardsBanner(
    userCards.length > 0,
  );

  const refreshAll = useCallback(async () => {
    await Promise.all([fetchCards(), fetchUserCards()]);
  }, [fetchCards, fetchUserCards]);

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

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <View style={styles.headerCopy}>
          <Text style={styles.eyebrow}>Wallet</Text>
          <Text style={styles.title}>E-Business Cards</Text>
          <Text style={styles.subtitle}>Your cards and collected contacts in one place.</Text>
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
        <View style={styles.myCardsSection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>My cards</Text>
            {userCards.length > 1 ? (
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
                <Pressable
                  onPress={() => navigation.navigate('MyCardScan')}
                  style={styles.secondaryButton}
                >
                  <Text style={styles.secondaryButtonText}>Scan my card</Text>
                </Pressable>
                <Pressable
                  onPress={() => navigation.navigate('MyCardForm', { mode: 'create' })}
                  style={styles.secondaryButton}
                >
                  <Text style={styles.secondaryButtonText}>Add manually</Text>
                </Pressable>
              </View>
            </>
          ) : null}

          {!bannerVisible && userCards.length === 0 && userCardsState.status !== 'loading' ? (
            <View style={styles.emptyMyCards}>
              <Text style={styles.emptyMyCardsTitle}>Create the card you share</Text>
              <Text style={styles.emptyMyCardsText}>
                Scan your printed card for a quick start, or enter your details manually.
              </Text>
              <View style={styles.myCardActions}>
                <Pressable
                  onPress={() => navigation.navigate('MyCardScan')}
                  style={styles.secondaryButton}
                >
                  <Text style={styles.secondaryButtonText}>Scan my card</Text>
                </Pressable>
                <Pressable
                  onPress={() => navigation.navigate('MyCardForm', { mode: 'create' })}
                  style={styles.secondaryButton}
                >
                  <Text style={styles.secondaryButtonText}>Add manually</Text>
                </Pressable>
              </View>
            </View>
          ) : null}
        </View>

        <View style={styles.collectedSection}>
          <View style={styles.sectionHeader}>
            <View>
              <Text style={styles.sectionTitle}>Collected</Text>
              <Text style={styles.sectionSubtitle}>
                {cards.length === 0
                  ? 'Cards you scan from other people will appear here.'
                  : `${cards.length} saved ${cards.length === 1 ? 'contact' : 'contacts'}`}
              </Text>
            </View>
            <Pressable
              onPress={() => navigation.navigate('Scan')}
              style={({ pressed }) => [styles.pillButton, pressed && styles.addButtonPressed]}
              accessibilityLabel="Scan a collected business card"
            >
              <Text style={styles.pillButtonText}>Scan card</Text>
            </Pressable>
          </View>

          {state.status === 'loading' && cards.length === 0 && (
            <View style={styles.centered}>
              <ActivityIndicator size="large" color={wallet.title} />
              <Text style={styles.loadingText}>Loading your cards...</Text>
            </View>
          )}

          {state.status === 'error' && (
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
              <Pressable
                onPress={() => navigation.navigate('Scan')}
                style={styles.primaryButton}
              >
                <Text style={styles.primaryButtonText}>Scan a card</Text>
              </Pressable>
            </View>
          )}

          {cards.length > 0 && (
            <View style={styles.walletSection}>
              <WalletCardStack
                cards={cards}
                onCardPress={handleCollectedCardPress}
                onWalletDisplayChange={(cardId, walletDisplay) => {
                  void setCardWalletDisplay(cardId, walletDisplay);
                }}
                onPhotoFaceChange={(cardId, photoFace) => {
                  void setCardPhotoFace(cardId, photoFace);
                }}
              />
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
    fontSize: 32,
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
  addButtonPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.96 }],
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
    marginTop: 3,
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
  myCardActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  secondaryButton: {
    borderWidth: 1,
    borderColor: wallet.title,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  secondaryButtonText: {
    color: wallet.title,
    fontWeight: '600',
    fontSize: 14,
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
  primaryButton: {
    marginTop: 8,
    backgroundColor: wallet.addButton,
    borderRadius: 999,
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  primaryButtonText: {
    color: wallet.addButtonText,
    fontWeight: '700',
    fontSize: 15,
  },
  pillButton: {
    borderRadius: 999,
    backgroundColor: wallet.addButton,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  pillButtonText: {
    color: wallet.addButtonText,
    fontSize: 13,
    fontWeight: '700',
  },
});
