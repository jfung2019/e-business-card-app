import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import {
  type ListRenderItemInfo,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { FlatList } from 'react-native-gesture-handler';

import { useDraggingContext } from './CardDragArea';
import { CardListItem } from './CardListItem';
import { CARD_ITEM_HEIGHT, CARD_LIST_HORIZONTAL_PADDING } from './DraggingCard';
import { useAppTheme } from '../context/ThemeContext';
import type { WalletThemeColors } from '../theme/appTheme';
import type { UserCard } from '../types/userCard';

/** How close to the list edge (px) before autoscroll starts. */
const AUTOSCROLL_EDGE = 72;
/** Fastest autoscroll, at the very edge (px / second). */
const AUTOSCROLL_MAX_PX_PER_SEC = 680;

interface CardListProps {
  cards: UserCard[];
}

function clampScrollOffset(offset: number, count: number, viewportHeight: number): number {
  const contentHeight = count * CARD_ITEM_HEIGHT;
  const scrollMax = Math.max(0, contentHeight - Math.max(0, viewportHeight));
  if (!Number.isFinite(offset)) {
    return 0;
  }
  return Math.max(0, Math.min(scrollMax, offset));
}

export default function CardList({ cards }: CardListProps) {
  const { wallet } = useAppTheme();
  const styles = useMemo(() => createStyles(wallet), [wallet]);
  const listRef = useRef<FlatList<UserCard>>(null);
  // JS-owned mirror of the drag state. `isDragging` lives on the UI thread now,
  // so reading it here could lag a frame; this flips exactly when React commits.
  const draggingRef = useRef(false);
  const {
    draggingCardId,
    layoutEpoch,
    dragScreenY,
    scrollY,
    listOffsetY,
    listHeight,
    isDragging,
    autoscrollEnabled,
  } = useDraggingContext();

  const handleScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      // During a drag the autoscroll loop owns scrollY; native events lag behind
      // scrollToOffset and would rewind it mid-frame. Once the drop lands we go
      // back to trusting the platform, which keeps scrollY from drifting across
      // repeated drags.
      if (draggingRef.current) {
        return;
      }
      const next = event.nativeEvent.contentOffset.y;
      if (!Number.isFinite(next)) {
        return;
      }
      scrollY.value = next;
    },
    [scrollY],
  );

  const handleListLayout = useCallback(
    (event: { nativeEvent: { layout: { y: number; height: number } } }) => {
      listOffsetY.value = event.nativeEvent.layout.y;
      listHeight.value = event.nativeEvent.layout.height;
    },
    [listHeight, listOffsetY],
  );

  const renderItem = useCallback(
    ({ item, index }: ListRenderItemInfo<UserCard>) => (
      <CardListItem item={item} index={index} isPrimary={index === 0} />
    ),
    [],
  );

  const keyExtractor = useCallback((item: UserCard) => item._id, []);

  const getItemLayout = useCallback(
    (_items: ArrayLike<UserCard> | null | undefined, index: number) => ({
      length: CARD_ITEM_HEIGHT,
      offset: CARD_ITEM_HEIGHT * index,
      index,
    }),
    [],
  );

  useEffect(() => {
    if (!draggingCardId) {
      if (!draggingRef.current) {
        return;
      }
      draggingRef.current = false;

      // Keep the mirror inside the scrollable range after a reorder. Native
      // onScroll is live again from here, so it will correct us if we are off.
      const viewport = listHeight.value;
      if (viewport >= 80) {
        const restored = clampScrollOffset(scrollY.value, cards.length, viewport);
        if (Math.abs(restored - scrollY.value) > 0.5) {
          scrollY.value = restored;
          listRef.current?.scrollToOffset({ offset: restored, animated: false });
        }
      }

      return;
    }

    draggingRef.current = true;

    let raf = 0;
    let cancelled = false;
    let lastMs = Date.now();

    const tick = () => {
      if (cancelled || !isDragging.value || !autoscrollEnabled.value) {
        return;
      }

      const now = Date.now();
      const dt = Math.min(32, now - lastMs) / 1000;
      lastMs = now;

      const viewportHeight = listHeight.value;
      const listY = listOffsetY.value;
      const offset = scrollY.value;
      if (
        viewportHeight < 80 ||
        !Number.isFinite(offset) ||
        !Number.isFinite(dragScreenY.value) ||
        !Number.isFinite(listY)
      ) {
        raf = requestAnimationFrame(tick);
        return;
      }

      const viewportInList = dragScreenY.value - listY;
      const contentHeight = cards.length * CARD_ITEM_HEIGHT;
      const scrollMax = Math.max(0, contentHeight - viewportHeight);

      // Only autoscroll when the clone is still inside the list, in an edge band.
      // A fast flick past the edge must not start a max-speed scroll.
      let pxPerSec = 0;
      if (viewportInList >= 0 && viewportInList < AUTOSCROLL_EDGE && offset > 0) {
        const t = Math.max(0, Math.min(1, 1 - viewportInList / AUTOSCROLL_EDGE));
        pxPerSec = -AUTOSCROLL_MAX_PX_PER_SEC * t * t;
      } else if (
        viewportInList <= viewportHeight &&
        viewportInList > viewportHeight - AUTOSCROLL_EDGE &&
        offset < scrollMax
      ) {
        const t = Math.max(
          0,
          Math.min(1, (viewportInList - (viewportHeight - AUTOSCROLL_EDGE)) / AUTOSCROLL_EDGE),
        );
        pxPerSec = AUTOSCROLL_MAX_PX_PER_SEC * t * t;
      }

      if (pxPerSec !== 0 && isDragging.value && autoscrollEnabled.value) {
        const nextOffset = clampScrollOffset(offset + pxPerSec * dt, cards.length, viewportHeight);
        if (nextOffset !== offset) {
          // Only scrollY moves. dragScreenY belongs to the gesture and stays
          // pinned to the finger, so the two threads never write the same value.
          scrollY.value = nextOffset;
          listRef.current?.scrollToOffset({ offset: nextOffset, animated: false });
        }
      }

      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
    };
  }, [
    autoscrollEnabled,
    cards.length,
    dragScreenY,
    draggingCardId,
    isDragging,
    listHeight,
    listOffsetY,
    scrollY,
  ]);

  return (
    <View style={styles.list} onLayout={handleListLayout}>
      <FlatList
        ref={listRef}
        data={cards}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        getItemLayout={getItemLayout}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        extraData={`${draggingCardId ?? ''}:${layoutEpoch}:${cards.map(card => card._id).join(',')}`}
        scrollEnabled={!draggingCardId}
        removeClippedSubviews={false}
        style={styles.list}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <Text style={styles.emptyText}>No cards available to reorder right now.</Text>
        }
      />
    </View>
  );
}

function createStyles(wallet: WalletThemeColors) {
  return StyleSheet.create({
    // Clip to the drag area. Without this the rows paint over the intro box
    // above and the save button below while scrolling. The floating clone is a
    // sibling of this list, not a child, so it is unaffected.
    list: {
      flex: 1,
      overflow: 'hidden',
    },
    listContent: {
      paddingHorizontal: CARD_LIST_HORIZONTAL_PADDING,
    },
    emptyText: {
      color: wallet.subtitle,
      fontSize: 14,
      textAlign: 'center',
      paddingVertical: 20,
    },
  });
}
