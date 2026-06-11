import React, { useCallback } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { CollectionCardItem } from '../components/CollectionCardItem';
import { useCards } from '../hooks/useCards';
import type { MainStackParamList } from '../navigation/AppNavigator';
import { luxuryColors } from '../theme/luxury';
import type { CapturedCard } from '../types/card';

type CollectionNavigation = NativeStackNavigationProp<MainStackParamList, 'Collection'>;

export function CollectionScreen(): React.JSX.Element {
  const navigation = useNavigation<CollectionNavigation>();
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
    <View style={styles.screen}>
      <View style={styles.hero}>
        <Text style={styles.eyebrow}>PRIVATE COLLECTION</Text>
        <Text style={styles.title}>Your Cards</Text>
        <View style={styles.divider} />
        <Text style={styles.subtitle}>
          Curated contacts from your scans. NFC additions will appear here soon.
        </Text>
        {state.status === 'success' && (
          <Text style={styles.count}>
            {cards.length} {cards.length === 1 ? 'card' : 'cards'}
          </Text>
        )}
      </View>

      {state.status === 'loading' && cards.length === 0 && (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={luxuryColors.gold} />
          <Text style={styles.loadingText}>Opening your collection...</Text>
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
          <Text style={styles.emptyTitle}>No cards yet</Text>
          <Text style={styles.emptyBody}>
            Scan your first business card to begin building your collection.
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
        <FlatList
          data={cards}
          keyExtractor={(item) => item._id}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={() => void fetchCards()}
              tintColor={luxuryColors.gold}
            />
          }
          renderItem={({ item }) => (
            <CollectionCardItem card={item} onPress={() => handleCardPress(item)} />
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: luxuryColors.background,
  },
  hero: {
    paddingHorizontal: 24,
    paddingTop: 8,
    paddingBottom: 20,
  },
  eyebrow: {
    color: luxuryColors.gold,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 2.4,
    marginBottom: 8,
  },
  title: {
    color: luxuryColors.cream,
    fontSize: 32,
    fontWeight: '300',
    letterSpacing: 0.5,
  },
  divider: {
    width: 48,
    height: 1,
    backgroundColor: luxuryColors.gold,
    marginVertical: 14,
  },
  subtitle: {
    color: luxuryColors.creamMuted,
    fontSize: 14,
    lineHeight: 21,
  },
  count: {
    marginTop: 14,
    color: luxuryColors.goldLight,
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0.8,
  },
  list: {
    paddingHorizontal: 20,
    paddingBottom: 28,
    gap: 12,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    gap: 12,
  },
  loadingText: {
    color: luxuryColors.creamMuted,
    fontSize: 14,
  },
  errorText: {
    color: luxuryColors.error,
    fontSize: 15,
    textAlign: 'center',
    fontWeight: '600',
  },
  retryButton: {
    marginTop: 8,
    borderWidth: 1,
    borderColor: luxuryColors.gold,
    borderRadius: 999,
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  retryText: {
    color: luxuryColors.gold,
    fontWeight: '600',
  },
  emptyTitle: {
    color: luxuryColors.cream,
    fontSize: 22,
    fontWeight: '600',
  },
  emptyBody: {
    color: luxuryColors.creamMuted,
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
  },
  primaryButton: {
    marginTop: 8,
    backgroundColor: luxuryColors.gold,
    borderRadius: 999,
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  primaryButtonText: {
    color: luxuryColors.background,
    fontWeight: '700',
    fontSize: 15,
    letterSpacing: 0.5,
  },
});
