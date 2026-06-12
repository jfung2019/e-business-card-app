import React from 'react';
import { FlatList, StyleSheet, View } from 'react-native';

import type { UserCard } from '../types/userCard';
import { MY_CARD_WIDTH, MyCardFace } from './MyCardFace';

interface MyCardCarouselProps {
  cards: UserCard[];
  onCardPress: (card: UserCard) => void;
}

const CARD_SPACING = 16;

export function MyCardCarousel({
  cards,
  onCardPress,
}: MyCardCarouselProps): React.JSX.Element {
  return (
    <FlatList
      horizontal
      data={cards}
      keyExtractor={item => item._id}
      showsHorizontalScrollIndicator={false}
      snapToInterval={MY_CARD_WIDTH + CARD_SPACING}
      decelerationRate="fast"
      contentContainerStyle={styles.listContent}
      renderItem={({ item }) => (
        <View style={styles.item}>
          <MyCardFace card={item} onPress={() => onCardPress(item)} />
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
