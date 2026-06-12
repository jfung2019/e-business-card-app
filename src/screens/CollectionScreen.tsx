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

import { WalletCardStack } from '../components/WalletCardStack';
import { useCards } from '../hooks/useCards';
import type { MainStackParamList } from '../navigation/AppNavigator';
import { walletColors } from '../theme/wallet';
import type { CapturedCard } from '../types/card';

type CollectionNavigation = NativeStackNavigationProp<MainStackParamList, 'Collection'>;

interface CollectionScreenProps {
  onSignOut: () => Promise<void>;
}

export function CollectionScreen({ onSignOut }: CollectionScreenProps): React.JSX.Element {
  const navigation = useNavigation<CollectionNavigation>();
  const insets = useSafeAreaInsets();
  const { state, cards, fetchCards } = useCards();

  useFocusEffect(
    useCallback(() => {
      void fetchCards();
    }, [fetchCards]),
  );

  const handleCardPress = (card: CapturedCard) => {
    navigation.navigate('CardDetail', { card });
  };

  const isRefreshing = state.status === 'loading' && cards.length > 0;

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={styles.title}>Wallet</Text>
        <Pressable
          onPress={() => navigation.navigate('Scan')}
          style={({ pressed }) => [styles.addButton, pressed && styles.addButtonPressed]}
          accessibilityLabel="Scan a new card"
        >
          <Text style={styles.addButtonText}>+</Text>
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={() => void fetchCards()}
            tintColor={walletColors.title}
          />
        }
      >
        {state.status === 'loading' && cards.length === 0 && (
          <View style={styles.centered}>
            <ActivityIndicator size="large" color={walletColors.title} />
            <Text style={styles.loadingText}>Loading your wallet...</Text>
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
            <Text style={styles.emptyTitle}>Your wallet is empty</Text>
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
            <Text style={styles.sectionHint}>
              {cards.length} {cards.length === 1 ? 'card' : 'cards'} · Tap a card to
              bring it forward · Tap front card for details
            </Text>
            <WalletCardStack cards={cards} onCardPress={handleCardPress} />
          </View>
        )}

        <Pressable onPress={() => void onSignOut()} style={styles.logoutButton}>
          <Text style={styles.logoutText}>Log out</Text>
        </Pressable>
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
    fontSize: 34,
    fontWeight: '700',
    color: walletColors.title,
    letterSpacing: -0.5,
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
  },
  walletSection: {
    gap: 16,
    paddingBottom: 24,
    overflow: 'visible',
  },
  sectionHint: {
    color: walletColors.subtitle,
    fontSize: 14,
    fontWeight: '500',
  },
  centered: {
    minHeight: 320,
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
  logoutButton: {
    alignSelf: 'center',
    marginTop: 28,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  logoutText: {
    color: walletColors.subtitle,
    fontSize: 14,
    fontWeight: '600',
  },
});
