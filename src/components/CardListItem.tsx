import React, { memo, useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import { Animated, Easing, StyleSheet } from 'react-native';

import { useDraggingContext } from './CardDragArea';
import { CARD_ITEM_HEIGHT, DraggingCard } from './DraggingCard';
import type { UserCard } from '../types/userCard';

/** How long a displaced row takes to slide out of the way, and back again. */
const SHIFT_DURATION_MS = 180;

interface CardListItemProps {
  item: UserCard;
  index: number;
  isPrimary: boolean;
}

/**
 * Deliberately free of Reanimated. Animated styles were not reaching these rows
 * inside the FlatList - the picked-up row stayed visible and displaced rows never
 * moved - while plain React styles applied fine. React state plus the built-in
 * Animated API keeps the transform on the native driver without that dependency.
 */
export const CardListItem: React.FC<CardListItemProps> = memo(({ item, index, isPrimary }) => {
  const { draggingCardId, draggingIndex, dropIndex } = useDraggingContext();

  const isBeingDragged = draggingCardId === item._id;
  const isDragActive = draggingIndex >= 0 && dropIndex >= 0;

  // Rows between the card's own slot and the slot it would land in step one place
  // towards the vacated slot. Dragging down, everything it has cleared moves up to
  // close the hole behind it; dragging up, everything it has cleared moves down.
  // Rows past the landing slot never move: the hole closing and the gap opening
  // cancel out for them exactly.
  let shift = 0;
  if (isDragActive && index !== draggingIndex) {
    if (draggingIndex < dropIndex && index > draggingIndex && index <= dropIndex) {
      shift = -CARD_ITEM_HEIGHT;
    } else if (draggingIndex > dropIndex && index >= dropIndex && index < draggingIndex) {
      shift = CARD_ITEM_HEIGHT;
    }
  }

  const translateY = useRef(new Animated.Value(0)).current;
  const transformStyle = useMemo(() => ({ transform: [{ translateY }] }), [translateY]);

  // Runs before paint in the same commit that applies the reorder, so the row
  // lands in its new slot with its shift already cleared.
  useLayoutEffect(() => {
    if (isDragActive) {
      return;
    }
    translateY.stopAnimation();
    translateY.setValue(0);
  }, [isDragActive, index, item._id, translateY]);

  useEffect(() => {
    if (!isDragActive) {
      return;
    }
    const animation = Animated.timing(translateY, {
      toValue: shift,
      duration: SHIFT_DURATION_MS,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    });
    animation.start();
    return () => animation.stop();
  }, [isDragActive, shift, translateY]);

  return (
    <Animated.View style={[transformStyle, isBeingDragged && styles.pickedUp]}>
      <DraggingCard item={item} isPrimary={isPrimary} />
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  pickedUp: {
    opacity: 0,
  },
});
