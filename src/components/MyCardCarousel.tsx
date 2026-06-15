import React from 'react';
import { FlatList, StyleSheet, View } from 'react-native';

import type { UserCard, WalletDisplay } from '../types/userCard';
import { getMyCardDisplayHeight, MY_CARD_HEIGHT, MY_CARD_WIDTH, MyCardFace } from './MyCardFace';

interface MyCardCarouselProps {
  cards: UserCard[];
  onCardPress: (card: UserCard) => void;
  onWalletDisplayChange?: (cardId: string, walletDisplay: WalletDisplay) => void;
}

const CARD_SPACING = 16;

export function MyCardCarousel({
  cards,
  onCardPress,
  onWalletDisplayChange,
}: MyCardCarouselProps): React.JSX.Element {
  const carouselHeight = Math.max(
    ...cards.map(getMyCardDisplayHeight),
    MY_CARD_HEIGHT,
  );

  return (
    <FlatList
      horizontal
      data={cards}
      keyExtractor={item => item._id}
      showsHorizontalScrollIndicator={false}
      snapToInterval={MY_CARD_WIDTH + CARD_SPACING}
      decelerationRate="fast"
      contentContainerStyle={styles.listContent}
      style={{ height: carouselHeight }}
      renderItem={({ item }) => (
        <View style={[styles.item, { height: carouselHeight, justifyContent: 'center' }]}>
          <MyCardFace
            card={item}
            onPress={() => onCardPress(item)}
            onWalletDisplayChange={onWalletDisplayChange}
          />
        </View>
      )}
    />
  );
}

const styles = StyleSheet.create({
  listContent: {
    paddingRight: 24,
  },
  item: {
    width: MY_CARD_WIDTH,
    marginRight: CARD_SPACING,
  },
});
