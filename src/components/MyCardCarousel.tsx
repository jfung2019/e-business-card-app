import React from 'react';
import type { NativeSyntheticEvent, NativeScrollEvent } from 'react-native';
import { FlatList, StyleSheet, View } from 'react-native';

import type { PhotoFace, UserCard, WalletDisplay } from '../types/userCard';
import { getMyCardDisplayHeight, MY_CARD_HEIGHT, MY_CARD_WIDTH, MyCardFace } from './MyCardFace';

interface MyCardCarouselProps {
  cards: UserCard[];
  onCardPress: (card: UserCard) => void;
  onWalletDisplayChange?: (cardId: string, walletDisplay: WalletDisplay) => void;
  onPhotoFaceChange?: (cardId: string, photoFace: PhotoFace) => void;
  onActiveIndexChange?: (index: number) => void;
}

const CARD_SPACING = 16;
const CARD_STRIDE = MY_CARD_WIDTH + CARD_SPACING;

export function MyCardCarousel({
  cards,
  onCardPress,
  onWalletDisplayChange,
  onPhotoFaceChange,
  onActiveIndexChange,
}: MyCardCarouselProps): React.JSX.Element {
  const carouselHeight = Math.max(
    ...cards.map(getMyCardDisplayHeight),
    MY_CARD_HEIGHT,
  );

  const reportActiveIndex = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (!onActiveIndexChange) {
      return;
    }
    const rawIndex = Math.round(event.nativeEvent.contentOffset.x / CARD_STRIDE);
    const clampedIndex = Math.min(Math.max(rawIndex, 0), Math.max(cards.length - 1, 0));
    onActiveIndexChange(clampedIndex);
  };

  return (
    <FlatList
      horizontal
      data={cards}
      keyExtractor={item => item._id}
      showsHorizontalScrollIndicator={false}
      snapToInterval={CARD_STRIDE}
      decelerationRate="fast"
      contentContainerStyle={styles.listContent}
      style={{ height: carouselHeight }}
      onMomentumScrollEnd={reportActiveIndex}
      onScrollEndDrag={reportActiveIndex}
      renderItem={({ item }) => (
        <View style={[styles.item, { height: carouselHeight, justifyContent: 'center' }]}>
          <MyCardFace
            card={item}
            onPress={() => onCardPress(item)}
            onWalletDisplayChange={onWalletDisplayChange}
            onPhotoFaceChange={onPhotoFaceChange}
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
