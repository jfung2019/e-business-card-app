import React, {
  createContext,
  type PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  type SharedValue,
  runOnJS,
  useAnimatedStyle,
  useFrameCallback,
  useSharedValue,
} from 'react-native-reanimated';

import {
  CARD_ITEM_HEIGHT,
  CARD_LIST_HORIZONTAL_PADDING,
  CARD_LONG_PRESS_DELAY,
  DraggingCard,
} from './DraggingCard';
import type { UserCard } from '../types/userCard';

/** A drop that lands outside the list this soon after pickup is treated as a slipped finger. */
const SLIP_DROP_MS = 300;
/** How far past the list edge the clone may sit before a drop counts as "outside". */
const OUTSIDE_SLOP = 24;
/** Finger travel allowed during the long press before it is treated as a scroll. */
const LONG_PRESS_MAX_DISTANCE = 16;
/** How long the clone must sit over a new slot before the rows rearrange. */
const DROP_INDEX_SETTLE_MS = 100;

export type CardDragContextValue = {
  draggingCardId: string | null;
  layoutEpoch: number;
  /** Index of the card under the finger, or -1. Plain React value. */
  draggingIndex: number;
  /** Settled slot the card would land in, or -1. Plain React value. */
  dropIndex: number;
  draggingFromIndex: SharedValue<number>;
  cardCount: SharedValue<number>;
  /** Clone top in the drag-area frame. Written ONLY by the UI thread (gesture). */
  dragScreenY: SharedValue<number>;
  /** FlatList content offset. Written ONLY by the JS thread (onScroll / autoscroll). */
  scrollY: SharedValue<number>;
  listOffsetY: SharedValue<number>;
  listHeight: SharedValue<number>;
  isDragging: SharedValue<boolean>;
  autoscrollEnabled: SharedValue<boolean>;
  dragStartedAt: SharedValue<number>;
  /**
   * The settled slot the card would land in. Rows shift to match it and the drop
   * commits to it, so the gap you see is always where the card actually goes.
   */
  activeDropIndex: SharedValue<number>;
};

const CardDragContext = createContext<CardDragContextValue | null>(null);

export function useDraggingContext(): CardDragContextValue {
  const value = useContext(CardDragContext);
  if (!value) {
    throw new Error('useDraggingContext must be used inside CardDragArea');
  }
  return value;
}

interface CardDragAreaProps {
  cards: UserCard[];
  onDrop: (cardId: string, dropIndex: number) => void;
}

/**
 * Which slot the clone would drop into.
 *
 * The card has to clear a row completely before the target moves past it: drag
 * down and the target only advances once the clone's bottom edge has passed that
 * row's bottom edge; drag up and it only retreats once the clone's top edge has
 * passed that row's top edge. Rounding to the nearest slot instead would advance
 * at half a card of travel, which is what made a card aimed between two rows
 * land behind the lower one.
 *
 * Worklet: this runs on the UI thread so it reads the live gesture position
 * instead of the JS-side copy, which can lag a frame or more on a fast flick.
 */
export function dropIndexFromPointer(
  dragScreenY: number,
  scrollY: number,
  listOffsetY: number,
  listHeight: number,
  count: number,
  fromIndex: number,
): number {
  'worklet';
  if (count <= 0) {
    return 0;
  }
  if (
    !Number.isFinite(dragScreenY) ||
    !Number.isFinite(scrollY) ||
    !Number.isFinite(listOffsetY)
  ) {
    return 0;
  }

  const viewportInList = dragScreenY - listOffsetY;
  const safeHeight =
    Number.isFinite(listHeight) && listHeight > 0 ? listHeight : CARD_ITEM_HEIGHT;
  const clampedViewport = Math.max(0, Math.min(safeHeight, viewportInList));
  const contentY = clampedViewport + Math.max(0, scrollY);
  const maxContentY = (count - 1) * CARD_ITEM_HEIGHT;
  const bounded = Math.max(0, Math.min(maxContentY, contentY));
  const slot = bounded / CARD_ITEM_HEIGHT;

  const origin = fromIndex >= 0 ? fromIndex : slot;
  let index: number;
  if (slot > origin) {
    index = Math.floor(slot);
  } else if (slot < origin) {
    index = Math.ceil(slot);
  } else {
    index = Math.round(slot);
  }

  return Math.max(0, Math.min(count - 1, index));
}

export default function CardDragArea({
  children,
  cards,
  onDrop,
}: PropsWithChildren<CardDragAreaProps>) {
  const [draggingCardId, setDraggingCardId] = useState<string | null>(null);
  const [layoutEpoch, setLayoutEpoch] = useState(0);
  // React mirror of the settled drop slot. The rows shift off this rather than a
  // shared value, so their animation does not depend on worklets reaching them.
  const [dropIndex, setDropIndex] = useState(-1);
  const { width } = useWindowDimensions();

  // The UI thread hands us indices; ids are resolved here, where the array lives.
  const cardsRef = useRef(cards);
  cardsRef.current = cards;

  const dragX = useSharedValue(CARD_LIST_HORIZONTAL_PADDING);
  const dragScreenY = useSharedValue(0);
  const scrollY = useSharedValue(0);
  const listOffsetY = useSharedValue(0);
  const listHeight = useSharedValue(0);
  const draggingFromIndex = useSharedValue(-1);
  const cardCount = useSharedValue(cards.length);
  const isDragging = useSharedValue(false);
  const autoscrollEnabled = useSharedValue(false);
  const dragStartedAt = useSharedValue(0);
  const activeDropIndex = useSharedValue(-1);
  const pendingDropIndex = useSharedValue(-1);
  const pendingSince = useSharedValue(0);

  useEffect(() => {
    cardCount.value = cards.length;
  }, [cardCount, cards.length]);

  /**
   * Settle the drop slot on a frame callback rather than a reaction: the finger
   * can come to rest over a new slot and stop emitting changes, and the delay
   * still has to elapse.
   */
  const settleDropIndex = useFrameCallback(() => {
    'worklet';
    if (!isDragging.value) {
      return;
    }

    const raw = dropIndexFromPointer(
      dragScreenY.value,
      scrollY.value,
      listOffsetY.value,
      listHeight.value,
      cardCount.value,
      draggingFromIndex.value,
    );

    if (raw === activeDropIndex.value) {
      pendingDropIndex.value = -1;
      return;
    }

    const now = Date.now();
    if (raw !== pendingDropIndex.value) {
      pendingDropIndex.value = raw;
      pendingSince.value = now;
      return;
    }
    if (now - pendingSince.value >= DROP_INDEX_SETTLE_MS) {
      activeDropIndex.value = raw;
      pendingDropIndex.value = -1;
      runOnJS(setDropIndex)(raw);
    }
  }, false);

  useEffect(() => {
    settleDropIndex.setActive(Boolean(draggingCardId));
  }, [draggingCardId, settleDropIndex]);

  /** Mount the floating clone. Purely visual - it does not gate the gesture. */
  const beginDragOnJS = useCallback(
    (fromIndex: number) => {
      const card = cardsRef.current[fromIndex];
      if (!card) {
        // Nothing to drag: undo the UI-thread state so the pan cannot activate.
        isDragging.value = false;
        autoscrollEnabled.value = false;
        draggingFromIndex.value = -1;
        // Bump the epoch too, so rows always get a reset pass after any drag
        // state - the rows now hold their shift until React clears it.
        setLayoutEpoch(value => value + 1);
        return;
      }
      setDropIndex(fromIndex);
      setDraggingCardId(card._id);
    },
    [autoscrollEnabled, draggingFromIndex, isDragging],
  );

  /** Tear down the clone and commit the reorder. `toIndex < 0` means "restore". */
  const endDragOnJS = useCallback(
    (fromIndex: number, toIndex: number) => {
      // One batched commit: the rows land in their new order and their shifts
      // clear on the same frame, so nothing flashes.
      setDraggingCardId(null);
      setDropIndex(-1);
      setLayoutEpoch(value => value + 1);

      if (fromIndex < 0 || toIndex < 0 || fromIndex === toIndex) {
        return;
      }
      const card = cardsRef.current[fromIndex];
      if (!card) {
        return;
      }
      onDrop(card._id, toIndex);
    },
    [onDrop],
  );

  /**
   * Single teardown path, on the UI thread. Idempotent: whichever of onEnd /
   * onFinalize fires first wins and the other becomes a no-op.
   */
  const endDrag = useCallback(
    (dropped: boolean) => {
      'worklet';
      if (!isDragging.value) {
        return;
      }

      const from = draggingFromIndex.value;
      let to = -1;

      if (dropped && from >= 0) {
        // Releasing is itself a settle signal: honour a slot that is still
        // waiting out the delay, so a quick deliberate drag is never undershot.
        to = pendingDropIndex.value >= 0 ? pendingDropIndex.value : activeDropIndex.value;

        // Slip guard: a flick that leaves the list within SLIP_DROP_MS of pickup
        // is a fumbled finger, not a reorder. Restore instead of committing.
        const height = listHeight.value > 0 ? listHeight.value : CARD_ITEM_HEIGHT;
        const viewportInList = dragScreenY.value - listOffsetY.value;
        const outside =
          viewportInList < -OUTSIDE_SLOP || viewportInList > height + OUTSIDE_SLOP;
        if (outside && Date.now() - dragStartedAt.value < SLIP_DROP_MS) {
          to = -1;
        }
      }

      // Freeze autoscroll before anything else can read these.
      autoscrollEnabled.value = false;
      isDragging.value = false;
      draggingFromIndex.value = -1;
      activeDropIndex.value = -1;
      pendingDropIndex.value = -1;

      runOnJS(endDragOnJS)(from, to);
    },
    [
      activeDropIndex,
      autoscrollEnabled,
      dragScreenY,
      dragStartedAt,
      draggingFromIndex,
      endDragOnJS,
      isDragging,
      listHeight,
      listOffsetY,
      pendingDropIndex,
    ],
  );

  const gesture = useMemo(() => {
    // Pickup runs entirely on the UI thread: the row is derived from the touch
    // position, so `isDragging` is already true when the pan asks about it.
    const longPress = Gesture.LongPress()
      .minDuration(CARD_LONG_PRESS_DELAY)
      .maxDistance(LONG_PRESS_MAX_DISTANCE)
      .onStart(event => {
        if (isDragging.value) {
          return;
        }
        const count = cardCount.value;
        const listY = listOffsetY.value;
        const height = listHeight.value;
        if (count <= 0 || !Number.isFinite(listY)) {
          return;
        }

        const viewportInList = event.y - listY;
        if (viewportInList < 0 || (height > 0 && viewportInList > height)) {
          return;
        }

        const contentY = viewportInList + Math.max(0, scrollY.value);
        const fromIndex = Math.floor(contentY / CARD_ITEM_HEIGHT);
        if (fromIndex < 0 || fromIndex >= count) {
          return;
        }

        isDragging.value = true;
        autoscrollEnabled.value = true;
        draggingFromIndex.value = fromIndex;
        // Start settled on the card's own slot so nothing shifts on pickup.
        activeDropIndex.value = fromIndex;
        pendingDropIndex.value = -1;
        dragStartedAt.value = Date.now();
        dragX.value = CARD_LIST_HORIZONTAL_PADDING;
        dragScreenY.value = listY + fromIndex * CARD_ITEM_HEIGHT - scrollY.value;

        runOnJS(beginDragOnJS)(fromIndex);
      });

    const pan = Gesture.Pan()
      .manualActivation(true)
      .onTouchesMove((_event, stateManager) => {
        if (isDragging.value) {
          stateManager.activate();
        }
      })
      .onChange(event => {
        if (!isDragging.value) {
          return;
        }
        dragX.value += event.changeX;
        dragScreenY.value += event.changeY;
      })
      .onEnd(() => {
        endDrag(true);
      })
      // Fires whether or not the pan ever activated, so a long press released
      // without moving still tears the drag down.
      .onFinalize((_event, success) => {
        if (!success) {
          endDrag(false);
        }
      });

    return Gesture.Simultaneous(longPress, pan);
  }, [
    activeDropIndex,
    autoscrollEnabled,
    beginDragOnJS,
    cardCount,
    dragScreenY,
    dragStartedAt,
    dragX,
    draggingFromIndex,
    endDrag,
    isDragging,
    listHeight,
    listOffsetY,
    pendingDropIndex,
    scrollY,
  ]);

  const animatedStyle = useAnimatedStyle(() => ({
    top: dragScreenY.value,
    left: dragX.value,
  }));

  const draggingCardIndex = draggingCardId
    ? cards.findIndex(card => card._id === draggingCardId)
    : -1;
  const draggingCard = draggingCardIndex >= 0 ? cards[draggingCardIndex] : undefined;

  const contextValue = useMemo<CardDragContextValue>(
    () => ({
      draggingCardId,
      layoutEpoch,
      draggingIndex: draggingCardIndex,
      dropIndex,
      draggingFromIndex,
      cardCount,
      dragScreenY,
      scrollY,
      listOffsetY,
      listHeight,
      isDragging,
      autoscrollEnabled,
      dragStartedAt,
      activeDropIndex,
    }),
    [
      activeDropIndex,
      autoscrollEnabled,
      cardCount,
      dragScreenY,
      dragStartedAt,
      draggingCardId,
      draggingCardIndex,
      draggingFromIndex,
      dropIndex,
      isDragging,
      layoutEpoch,
      listHeight,
      listOffsetY,
      scrollY,
    ],
  );

  return (
    <CardDragContext.Provider value={contextValue}>
      <GestureDetector gesture={gesture}>
        <View style={styles.fill}>
          {children}
          {draggingCard ? (
            <Animated.View
              pointerEvents="none"
              style={[
                styles.clone,
                { width: width - CARD_LIST_HORIZONTAL_PADDING * 2 },
                animatedStyle,
              ]}
            >
              <DraggingCard preview item={draggingCard} isPrimary={draggingCardIndex === 0} />
            </Animated.View>
          ) : null}
        </View>
      </GestureDetector>
    </CardDragContext.Provider>
  );
}

const styles = StyleSheet.create({
  fill: {
    flex: 1,
  },
  clone: {
    position: 'absolute',
    transform: [{ rotateZ: '3deg' }],
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
});
