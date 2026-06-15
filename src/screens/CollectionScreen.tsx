import React, { useCallback } from 'react';
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
import { walletColors } from '../theme/wallet';
import type { CapturedCard } from '../types/card';
import type { UserCard } from '../types/userCard';

type CollectionNavigation = NativeStackNavigationProp<MainStackParamList, 'Collection'>;

export function CollectionScreen(): React.JSX.Element {
  const navigation = useNavigation<CollectionNavigation>();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const { state, cards, fetchCards, setCardWalletDisplay } = useCards();
  const {
    state: userCardsState,
    cards: userCards,
    fetchUserCards,
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
        <Text style={styles.title}>E-Business Cards</Text>
        <View style={styles.headerActions}>
          <ProfileAvatarButton
            email={user?.email}
            onPress={() => navigation.navigate('Profile')}
          />
          <Pressable
            onPress={() => navigation.navigate('Scan')}
            style={({ pressed }) => [styles.addButton, pressed && styles.addButtonPressed]}
            accessibilityLabel="Scan a collected card"
          >
            <Text style={styles.addButtonText}>+</Text>
          </Pressable>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={() => void refreshAll()}
            tintColor={walletColors.title}
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
              <ActivityIndicator color={walletColors.title} />
            </View>
          ) : null}

          {userCards.length > 0 ? (
            <>
              <MyCardCarousel cards={userCards} onCardPress={handleMyCardPress} />
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
              <Text style={styles.emptyMyCardsText}>
                Add a business card that represents you.
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
          <Text style={styles.sectionTitle}>Collected ({cards.length})</Text>

          {state.status === 'loading' && cards.length === 0 && (
            <View style={styles.centered}>
              <ActivityIndicator size="large" color={walletColors.title} />
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
              <Text style={styles.emptyTitle}>No collected cards yet</Text>
              <Text style={styles.emptyBody}>
                Scan a business card to add your first contact card.
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
              />
            </View>
          )}
        </View>

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: walletColors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingTop: 8,
    paddingBottom: 20,
  },
  title: {
    flex: 1,
    fontSize: 34,
    fontWeight: '700',
    color: walletColors.title,
    letterSpacing: -0.5,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  addButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: walletColors.addButton,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addButtonPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.96 }],
  },
  addButtonText: {
    color: walletColors.addButtonText,
    fontSize: 28,
    fontWeight: '400',
    lineHeight: 30,
    marginTop: -2,
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
    color: walletColors.title,
  },
  sectionAction: {
    fontSize: 14,
    fontWeight: '600',
    color: walletColors.subtitle,
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
    borderColor: walletColors.title,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  secondaryButtonText: {
    color: walletColors.title,
    fontWeight: '600',
    fontSize: 14,
  },
  emptyMyCards: {
    gap: 12,
    paddingVertical: 8,
  },
  emptyMyCardsText: {
    color: walletColors.subtitle,
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
  },
  loadingText: {
    color: walletColors.subtitle,
    fontSize: 15,
  },
  errorText: {
    color: '#B91C1C',
    fontSize: 15,
    textAlign: 'center',
    fontWeight: '600',
  },
  retryButton: {
    marginTop: 8,
    borderWidth: 1,
    borderColor: walletColors.title,
    borderRadius: 999,
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  retryText: {
    color: walletColors.title,
    fontWeight: '600',
  },
  emptyTitle: {
    color: walletColors.title,
    fontSize: 22,
    fontWeight: '700',
  },
  emptyBody: {
    color: walletColors.subtitle,
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
  },
  primaryButton: {
    marginTop: 8,
    backgroundColor: walletColors.addButton,
    borderRadius: 999,
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  primaryButtonText: {
    color: walletColors.addButtonText,
    fontWeight: '700',
    fontSize: 15,
  },
});
