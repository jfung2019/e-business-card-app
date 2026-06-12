import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { getWalletPalette } from '../theme/wallet';
import type { CapturedCard } from '../types/card';

const CARD_BORDER_RADIUS = 22;

export const WALLET_CARD_FULL_HEIGHT = 196;
export const WALLET_CARD_PEEK_HEIGHT = 80;
export const WALLET_STACK_SHADOW_PADDING = 48;

interface WalletCardProps {
  card: CapturedCard;
  paletteIndex: number;
  isFront: boolean;
  onPress: () => void;
}

function maskDetail(card: CapturedCard): string {
  const phone = card.core_fields.phone?.replace(/\D/g, '');
  if (phone && phone.length >= 4) {
    return `•••• ${phone.slice(-4)}`;
  }
  const email = card.core_fields.email;
  if (email && email.includes('@')) {
    const [local] = email.split('@');
    return `${local.slice(0, 2)}•••`;
  }
  const name = card.core_fields.name.trim();
  if (name.length > 0) {
    return name.split(/\s+/)[0];
  }
  return 'Contact';
}

function getBrand(card: CapturedCard): string {
  return card.core_fields.company_name ?? card.core_fields.name;
}

function WalletPeekFace({
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

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.peekWrapper, pressed && styles.pressed]}
    >
      <View style={[styles.peekCard, { backgroundColor: palette.background }]}>
        <Text
          style={[styles.brand, styles.peekBrand, { color: palette.text }]}
          numberOfLines={1}
        >
          {brand}
        </Text>
      </View>
    </Pressable>
  );
}

function WalletFrontFace({
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
  const displayName = maskDetail(card);

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.frontWrapper, pressed && styles.pressed]}
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
            <Text style={[styles.detailValue, { color: palette.text }]}>
              {displayName}
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
  isFront,
  onPress,
}: WalletCardProps): React.JSX.Element {
  if (isFront) {
    return (
      <WalletFrontFace
        card={card}
        paletteIndex={paletteIndex}
        onPress={onPress}
      />
    );
  }

  return (
    <WalletPeekFace
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
    peekCount * WALLET_CARD_PEEK_HEIGHT +
    WALLET_CARD_FULL_HEIGHT +
    WALLET_STACK_SHADOW_PADDING
  );
}

const styles = StyleSheet.create({
  peekWrapper: {
    width: '100%',
    height: WALLET_CARD_PEEK_HEIGHT,
  },
  frontWrapper: {
    width: '100%',
    height: WALLET_CARD_FULL_HEIGHT,
  },
  pressed: {
    opacity: 0.94,
    transform: [{ scale: 0.988 }],
  },
  peekCard: {
    flex: 1,
    borderRadius: CARD_BORDER_RADIUS,
    paddingHorizontal: 22,
    paddingTop: 16,
    paddingBottom: 12,
    justifyContent: 'flex-start',
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
  peekBrand: {
    flex: 0,
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
