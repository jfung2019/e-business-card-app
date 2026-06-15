import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { getWalletPalette } from '../theme/wallet';
import type { CapturedCard } from '../types/card';

const CARD_BORDER_RADIUS = 22;

export const WALLET_CARD_FULL_HEIGHT = 196;
/** Vertical offset between stacked cards — visible peek above the card in front. */
export const WALLET_CARD_PEEK_HEIGHT = 50;
export const WALLET_CARD_STACK_STEP = WALLET_CARD_PEEK_HEIGHT;
export const WALLET_STACK_SHADOW_PADDING = 24;

interface WalletCardProps {
  card: CapturedCard;
  paletteIndex: number;
  isFront?: boolean;
  onPress: () => void;
}

function getContactDetail(card: CapturedCard): string {
  const { phone, email, job_title } = card.core_fields;
  if (phone?.trim()) {
    return phone.trim();
  }
  if (email?.trim()) {
    return email.trim();
  }
  if (job_title?.trim()) {
    return job_title.trim();
  }
  return 'No contact info';
}

function getBrand(card: CapturedCard): string {
  return card.core_fields.company_name ?? card.core_fields.name;
}

function WalletCardFace({
  card,
  paletteIndex,
  onPress,
}: {
  card: CapturedCard;
  paletteIndex: number;
  onPress: () => void;
}): React.JSX.Element {
  const palette = getWalletPalette(paletteIndex);
  const brand = getBrand(card);
  const contactDetail = getContactDetail(card);

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.cardWrapper, pressed && styles.pressed]}
    >
      <View
        style={[styles.frontCard, { backgroundColor: palette.background }]}
      >
        <View
          style={[styles.gradientWash, { backgroundColor: palette.accent }]}
        />
        <View style={styles.cardInner}>
          <View style={styles.topRow}>
            <Text
              style={[styles.brand, { color: palette.text }]}
              numberOfLines={1}
            >
              {brand}
            </Text>
            <Text style={[styles.sourceLabel, { color: palette.muted }]}>
              Scan
            </Text>
          </View>

          <View style={styles.bottomRow}>
            <Text style={[styles.detailLabel, { color: palette.muted }]}>
              {card.core_fields.name}
            </Text>
            <Text
              style={[styles.detailValue, { color: palette.text }]}
              numberOfLines={1}
            >
              {contactDetail}
            </Text>
          </View>
        </View>
      </View>
    </Pressable>
  );
}

export function WalletCard({
  card,
  paletteIndex,
  onPress,
}: WalletCardProps): React.JSX.Element {
  return (
    <WalletCardFace
      card={card}
      paletteIndex={paletteIndex}
      onPress={onPress}
    />
  );
}

export function getWalletStackHeight(cardCount: number): number {
  if (cardCount <= 0) {
    return 0;
  }
  if (cardCount === 1) {
    return WALLET_CARD_FULL_HEIGHT + WALLET_STACK_SHADOW_PADDING;
  }
  const peekCount = cardCount - 1;
  return (
    peekCount * WALLET_CARD_STACK_STEP +
    WALLET_CARD_FULL_HEIGHT +
    WALLET_STACK_SHADOW_PADDING
  );
}

const styles = StyleSheet.create({
  cardWrapper: {
    width: '100%',
    height: WALLET_CARD_FULL_HEIGHT,
  },
  pressed: {
    opacity: 0.94,
    transform: [{ scale: 0.988 }],
  },
  frontCard: {
    flex: 1,
    borderRadius: CARD_BORDER_RADIUS,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.35)',
  },
  gradientWash: {
    position: 'absolute',
    top: -40,
    right: -30,
    width: 180,
    height: 180,
    borderRadius: 90,
    opacity: 0.22,
  },
  cardInner: {
    flex: 1,
    paddingHorizontal: 22,
    paddingVertical: 18,
    justifyContent: 'space-between',
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },
  brand: {
    flex: 1,
    fontSize: 28,
    fontWeight: '600',
    fontStyle: 'italic',
    letterSpacing: -0.5,
  },
  sourceLabel: {
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0.3,
    marginTop: 4,
  },
  bottomRow: {
    gap: 4,
  },
  detailLabel: {
    fontSize: 12,
    fontWeight: '500',
    letterSpacing: 0.4,
  },
  detailValue: {
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 1.5,
  },
});
