import React, { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useAppTheme } from '../context/ThemeContext';
import { useCardPrefs } from '../context/CardPrefsContext';
import { getCardDesign } from '../theme/cardDesigns';
import type { PhotoFace, UserCard, WalletDisplay } from '../types/userCard';
import { CARD_BORDER_RADIUS, MyCardFace } from './MyCardFace';

/** How much of each card below stays visible under the one above it. */
const PEEK_VISIBLE = 40;
/** How far the strip slides under the card above, hiding its top edge. */
const PEEK_TUCK = 18;

interface MyCardWalletStackProps {
  /** Primary first, already trimmed to the wallet limit by the caller. */
  cards: UserCard[];
  onCardPress: (card: UserCard) => void;
  onWalletDisplayChange?: (cardId: string, walletDisplay: WalletDisplay) => void;
  onPhotoFaceChange?: (cardId: string, photoFace: PhotoFace) => void;
}

/**
 * The wallet: the primary card shown in full, the rest peeking beneath it.
 *
 * Each strip is the bottom of a real card — square on top, rounded below, top
 * border dropped — so the tucked edge reads as a card continuing behind the one
 * above rather than as a bar under it. The strips carry the company rather than
 * the person because every card here belongs to the same person; the company is
 * what tells them apart.
 */
export function MyCardWalletStack({
  cards,
  onCardPress,
  onWalletDisplayChange,
  onPhotoFaceChange,
}: MyCardWalletStackProps): React.JSX.Element | null {
  const { wallet } = useAppTheme();
  const { designId } = useCardPrefs();
  const design = useMemo(() => getCardDesign(designId), [designId]);

  if (cards.length === 0) {
    return null;
  }

  const [front, ...rest] = cards;

  return (
    <View style={styles.stack}>
      <View style={styles.frontSlot}>
        <MyCardFace
          card={front}
          compact
          onPress={() => onCardPress(front)}
          onWalletDisplayChange={onWalletDisplayChange}
          onPhotoFaceChange={onPhotoFaceChange}
        />
      </View>

      {rest.map((card, index) => {
        const label = card.core_fields.company_name ?? card.core_fields.name;
        return (
          <Pressable
            key={card._id}
            onPress={() => onCardPress(card)}
            accessibilityRole="button"
            accessibilityLabel={`${label}, open card`}
            style={({ pressed }) => [
              styles.peek,
              {
                backgroundColor: design.background,
                borderColor: wallet.border,
                // Earlier cards sit above later ones, so each tucks under its
                // predecessor rather than covering it.
                zIndex: rest.length - index,
              },
              pressed && styles.pressed,
            ]}
          >
            <Text style={[styles.peekLabel, { color: design.text }]} numberOfLines={1}>
              {label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  stack: {
    flexDirection: 'column',
  },
  frontSlot: {
    zIndex: 20,
  },
  peek: {
    marginTop: -PEEK_TUCK,
    height: PEEK_VISIBLE + PEEK_TUCK,
    borderTopLeftRadius: 0,
    borderTopRightRadius: 0,
    borderBottomLeftRadius: CARD_BORDER_RADIUS,
    borderBottomRightRadius: CARD_BORDER_RADIUS,
    borderWidth: StyleSheet.hairlineWidth,
    // The top edge is behind the card above; a line there would draw a seam.
    borderTopWidth: 0,
    justifyContent: 'flex-end',
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  peekLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
  pressed: {
    opacity: 0.92,
  },
});
