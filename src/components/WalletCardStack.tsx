import React, { useEffect, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';

import { getCardPaletteIndex } from '../theme/wallet';
import { WALLET_SPRING } from '../theme/walletAnimations';
import type { CapturedCard } from '../types/card';
import {
  getWalletStackHeight,
  WALLET_CARD_STACK_STEP,
  WalletCard,
} from './WalletCard';

interface WalletCardStackProps {
  cards: CapturedCard[];
  onCardPress: (card: CapturedCard) => void;
  onWalletDisplayChange?: (cardId: string, walletDisplay: 'photo' | 'classic') => void;
}

interface AnimatedCardSlotProps {
  card: CapturedCard;
  index: number;
  totalCards: number;
  paletteIndex: number;
  onPress: () => void;
  onWalletDisplayChange?: (cardId: string, walletDisplay: 'photo' | 'classic') => void;
}

function AnimatedCardSlot({
  card,
  index,
  totalCards,
  paletteIndex,
  onPress,
  onWalletDisplayChange,
}: AnimatedCardSlotProps): React.JSX.Element {
  const isFront = index === totalCards - 1;
  const targetTop = index * WALLET_CARD_STACK_STEP;

  const top = useSharedValue(targetTop);

  useEffect(() => {
    cancelAnimation(top);
    top.value = withSpring(targetTop, WALLET_SPRING);
  }, [index, totalCards, targetTop, top]);

  const slotStyle = useAnimatedStyle(() => ({
    top: top.value,
  }));

  return (
    <Animated.View
      style={[
        styles.cardSlot,
        isFront && styles.cardSlotFront,
        slotStyle,
        { zIndex: index + 1 },
      ]}
    >
      <WalletCard
        card={card}
        paletteIndex={paletteIndex}
        onPress={onPress}
        onWalletDisplayChange={onWalletDisplayChange}
      />
    </Animated.View>
  );
}

function buildDefaultOrder(cards: CapturedCard[]): string[] {
  return [...cards].reverse().map(card => card._id);
}

function mergeStackOrder(previous: string[], cards: CapturedCard[]): string[] {
  const defaultOrder = buildDefaultOrder(cards);
  if (previous.length === 0) {
    return defaultOrder;
  }

  const cardIds = new Set(cards.map(card => card._id));
  const kept = previous.filter(id => cardIds.has(id));
  const keptSet = new Set(kept);
  const added = defaultOrder.filter(id => !keptSet.has(id));

  return [...kept, ...added];
}

export function WalletCardStack({
  cards,
  onCardPress,
  onWalletDisplayChange,
}: WalletCardStackProps): React.JSX.Element {
  const defaultOrder = useMemo(() => buildDefaultOrder(cards), [cards]);
  const [stackOrder, setStackOrder] = useState<string[]>(defaultOrder);

  useEffect(() => {
    setStackOrder(previous => mergeStackOrder(previous, cards));
  }, [cards]);

  const cardMap = useMemo(
    () => new Map(cards.map(card => [card._id, card])),
    [cards],
  );

  const orderedCards = stackOrder
    .map(id => cardMap.get(id))
    .filter((card): card is CapturedCard => card !== undefined);

  const handlePress = (card: CapturedCard, index: number) => {
    const isFront = index === orderedCards.length - 1;

    if (isFront) {
      onCardPress(card);
      return;
    }

    setStackOrder(previous => {
      const next = previous.filter(id => id !== card._id);
      next.push(card._id);
      return next;
    });
  };

  return (
    <View style={[styles.stack, { height: getWalletStackHeight(orderedCards) }]}>
      {orderedCards.map((card, index) => (
        <AnimatedCardSlot
          key={card._id}
          card={card}
          index={index}
          totalCards={orderedCards.length}
          paletteIndex={getCardPaletteIndex(card._id, cards)}
          onPress={() => handlePress(card, index)}
          onWalletDisplayChange={onWalletDisplayChange}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  stack: {
    width: '100%',
    position: 'relative',
    overflow: 'visible',
    marginBottom: 8,
  },
  cardSlot: {
    position: 'absolute',
    left: 0,
    right: 0,
  },
  cardSlotFront: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.16,
    shadowRadius: 20,
    elevation: 10,
  },
});
