import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import CardBoard from '../components/CardBoard';
import { TabIcon } from '../components/icons/TabIcons';
import { useAppTheme } from '../context/ThemeContext';
import { useUserCards } from '../hooks/useUserCards';
import type { MainStackParamList } from '../navigation/AppNavigator';
import type { WalletThemeColors } from '../theme/appTheme';
import type { UserCard } from '../types/userCard';

type AllMyCardsNavigation = NativeStackNavigationProp<MainStackParamList, 'AllMyCards'>;

function sameOrder(a: UserCard[], b: UserCard[]): boolean {
  return a.length === b.length && a.every((card, index) => card._id === b[index]._id);
}

/**
 * Browse and reorder in one screen: tap opens a card, hold and drag moves it.
 *
 * There is no edit mode and no save button — the order commits on drop, and
 * rolls back with a message if the server refuses it.
 */
export function AllMyCardsScreen(): React.JSX.Element {
  const { wallet } = useAppTheme();
  const styles = useMemo(() => createStyles(wallet), [wallet]);
  const navigation = useNavigation<AllMyCardsNavigation>();
  const { state, cards, fetchUserCards, reorderCards } = useUserCards();

  const [order, setOrder] = useState<UserCard[]>(cards);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  // The server copy is the truth to fall back to when a reorder fails.
  const lastSavedRef = useRef<UserCard[]>(cards);

  useFocusEffect(
    useCallback(() => {
      void fetchUserCards();
    }, [fetchUserCards]),
  );

  // Adopt server changes unless the user is mid-reorder with unsaved intent.
  useEffect(() => {
    if (saving) {
      return;
    }
    if (!sameOrder(cards, order)) {
      setOrder(cards);
    }
    lastSavedRef.current = cards;
    // Reacting to `order` here would fight the drag; the drop handler owns it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cards, saving]);

  const handleOrderChange = useCallback(
    (next: UserCard[] | ((current: UserCard[]) => UserCard[])) => {
      setOrder(current => {
        const resolved = typeof next === 'function' ? next(current) : next;
        if (sameOrder(resolved, current)) {
          return current;
        }

        setSaving(true);
        setError(null);
        void (async () => {
          try {
            await reorderCards(resolved.map(card => card._id));
            lastSavedRef.current = resolved;
          } catch (saveError) {
            setOrder(lastSavedRef.current);
            setError(
              saveError instanceof Error
                ? saveError.message
                : 'Could not save the new order.',
            );
          } finally {
            setSaving(false);
          }
        })();

        return resolved;
      });
    },
    [reorderCards],
  );

  const openCard = useCallback(
    (card: UserCard) => {
      navigation.navigate('MyCard', { card });
    },
    [navigation],
  );

  return (
    <View style={styles.screen}>
      <View style={styles.hint}>
        <TabIcon name="sliders" size={17} color={wallet.accentMuted} />
        <Text style={styles.hintText}>
          Tap a card to open it. Hold and drag to change the order — the first card is the
          one you share.
        </Text>
      </View>

      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      {state.status === 'loading' && order.length === 0 ? (
        <View style={styles.centered}>
          <ActivityIndicator color={wallet.title} />
        </View>
      ) : null}

      {order.length === 0 && state.status !== 'loading' ? (
        <View style={styles.centered}>
          <Text style={styles.emptyText}>No cards to arrange yet.</Text>
        </View>
      ) : (
        <View style={styles.board}>
          <CardBoard cards={order} onCardsChange={handleOrderChange} onCardPress={openCard} />
        </View>
      )}
    </View>
  );
}

const createStyles = (wallet: WalletThemeColors) =>
  StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: wallet.background,
    },
    hint: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 8,
      paddingHorizontal: 20,
      paddingTop: 12,
      paddingBottom: 14,
    },
    hintText: {
      flex: 1,
      fontSize: 13,
      lineHeight: 19,
      color: wallet.subtitle,
    },
    board: {
      flex: 1,
      overflow: 'hidden',
    },
    centered: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 10,
    },
    emptyText: {
      fontSize: 15,
      color: wallet.subtitle,
    },
    errorText: {
      marginHorizontal: 20,
      marginBottom: 8,
      fontSize: 14,
      fontWeight: '600',
      color: wallet.error,
      textAlign: 'center',
    },
  });
