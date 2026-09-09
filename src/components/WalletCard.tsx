import React, { useEffect, useRef } from 'react';
import {
  Animated,
  Dimensions,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { getWalletPalette, type WalletCardPalette } from '../theme/wallet';
import type { CapturedCard, PhotoFace } from '../types/card';
import { hasScanImage, nextWalletDisplay, showsWalletPhoto } from '../utils/walletDisplay';
import { CardFaceControls } from './CardFaceControls';
import { CardPhotoFlip } from './CardPhotoFlip';

const CARD_BORDER_RADIUS = 22;
const SCAN_CARD_ASPECT_RATIO = 1.586;
const WALLET_HORIZONTAL_PADDING = 48;
const CROSSFADE_MS = 200;

export const WALLET_CARD_FULL_HEIGHT = 196;
export const WALLET_CARD_SCAN_HEIGHT = Math.round(
  (Dimensions.get('window').width - WALLET_HORIZONTAL_PADDING) / SCAN_CARD_ASPECT_RATIO,
);
export const WALLET_CARD_PEEK_HEIGHT = 50;
export const WALLET_CARD_STACK_STEP = WALLET_CARD_PEEK_HEIGHT;
export const WALLET_STACK_SHADOW_PADDING = 24;

interface WalletCardProps {
  card: CapturedCard;
  paletteIndex: number;
  onPress: () => void;
  onWalletDisplayChange?: (cardId: string, walletDisplay: 'photo' | 'classic') => void;
  onPhotoFaceChange?: (cardId: string, photoFace: PhotoFace) => void;
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

export function getCardDisplayHeight(card: CapturedCard): number {
  return hasScanImage(card) ? WALLET_CARD_SCAN_HEIGHT : WALLET_CARD_FULL_HEIGHT;
}

function ClassicCardFace({
  card,
  palette,
  hasScan,
}: {
  card: CapturedCard;
  palette: WalletCardPalette;
  hasScan: boolean;
}): React.JSX.Element {
  const brand = getBrand(card);
  const contactDetail = getContactDetail(card);

  return (
    <>
      <View style={[styles.gradientWash, { backgroundColor: palette.accent }]} />
      <View style={styles.cardInner}>
        <View style={styles.topRow}>
          <Text style={[styles.brand, { color: palette.text }]} numberOfLines={1}>
            {brand}
          </Text>
          {!hasScan ? (
            <Text style={[styles.sourceLabel, { color: palette.muted }]}>Scan</Text>
          ) : null}
        </View>
        <View style={styles.bottomRow}>
          <Text style={[styles.detailLabel, { color: palette.muted }]}>
            {card.core_fields.name}
          </Text>
          <Text style={[styles.detailValue, { color: palette.text }]} numberOfLines={1}>
            {contactDetail}
          </Text>
        </View>
      </View>
    </>
  );
}

function WalletCardFace({
  card,
  paletteIndex,
  onPress,
  onWalletDisplayChange,
  onPhotoFaceChange,
}: {
  card: CapturedCard;
  paletteIndex: number;
  onPress: () => void;
  onWalletDisplayChange?: (cardId: string, walletDisplay: 'photo' | 'classic') => void;
  onPhotoFaceChange?: (cardId: string, photoFace: PhotoFace) => void;
}): React.JSX.Element {
  const palette = getWalletPalette(paletteIndex);
  const hasScan = hasScanImage(card);
  const showPhoto = showsWalletPhoto(card);
  const photoFace: PhotoFace = card.photo_face === 'back' ? 'back' : 'front';
  const hasBackPhoto = Boolean(card.scan_image_back_url);
  const frontPhotoUrl = card.scan_image_front_url ?? card.scan_image_url;
  const backPhotoUrl = card.scan_image_back_url;
  const photoOpacity = useRef(new Animated.Value(showPhoto ? 1 : 0)).current;

  useEffect(() => {
    Animated.timing(photoOpacity, {
      toValue: showPhoto ? 1 : 0,
      duration: CROSSFADE_MS,
      useNativeDriver: true,
    }).start();
  }, [showPhoto, photoOpacity]);

  const classicOpacity = photoOpacity.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 0],
  });

  const handleFlip = (): void => {
    if (!hasScan || !onWalletDisplayChange) {
      return;
    }
    onWalletDisplayChange(card._id, nextWalletDisplay(card));
  };

  const handleFlipFace = (): void => {
    if (!hasBackPhoto || !onPhotoFaceChange) {
      return;
    }
    onPhotoFaceChange(card._id, photoFace === 'front' ? 'back' : 'front');
  };

  const handleShowBack = (): void => {
    if (!hasBackPhoto) {
      return;
    }
    if (!showPhoto) {
      onWalletDisplayChange?.(card._id, 'photo');
      onPhotoFaceChange?.(card._id, 'back');
      return;
    }
    handleFlipFace();
  };

  if (!hasScan) {
    return (
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [styles.cardWrapper, pressed && styles.pressed]}
      >
        <View style={[styles.frontCard, { backgroundColor: palette.background }]}>
          <ClassicCardFace card={card} palette={palette} hasScan={false} />
        </View>
      </Pressable>
    );
  }

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.cardWrapper,
        styles.scanCardWrapper,
        pressed && styles.pressed,
      ]}
    >
      <View style={styles.frontCard}>
        <Animated.View
          pointerEvents={showPhoto ? 'auto' : 'none'}
          style={[styles.faceLayer, { opacity: photoOpacity }]}
        >
          <View style={styles.fill}>
            <CardPhotoFlip
              frontPhotoUrl={frontPhotoUrl}
              backPhotoUrl={backPhotoUrl}
              photoFace={photoFace}
              style={styles.fill}
              imageStyle={styles.scanImageFill}
              resizeMode="cover"
              variant="background"
            />
          </View>
        </Animated.View>

        <Animated.View
          pointerEvents={showPhoto ? 'none' : 'auto'}
          style={[styles.faceLayer, { opacity: classicOpacity }]}
        >
          <View style={[styles.fill, { backgroundColor: palette.background }]}>
            <ClassicCardFace card={card} palette={palette} hasScan />
          </View>
        </Animated.View>

        <CardFaceControls
          onScanToggle={handleFlip}
          showFlipFace={hasBackPhoto}
          onFlipFace={handleShowBack}
        />
      </View>
    </Pressable>
  );
}

export function WalletCard({
  card,
  paletteIndex,
  onPress,
  onWalletDisplayChange,
  onPhotoFaceChange,
}: WalletCardProps): React.JSX.Element {
  return (
    <WalletCardFace
      card={card}
      paletteIndex={paletteIndex}
      onPress={onPress}
      onWalletDisplayChange={onWalletDisplayChange}
      onPhotoFaceChange={onPhotoFaceChange}
    />
  );
}

export function getWalletStackHeight(cards: CapturedCard[]): number {
  if (cards.length === 0) {
    return 0;
  }

  const maxCardHeight = Math.max(...cards.map(getCardDisplayHeight));

  if (cards.length === 1) {
    return maxCardHeight + WALLET_STACK_SHADOW_PADDING;
  }

  const peekCount = cards.length - 1;
  return peekCount * WALLET_CARD_STACK_STEP + maxCardHeight + WALLET_STACK_SHADOW_PADDING;
}

const styles = StyleSheet.create({
  cardWrapper: {
    width: '100%',
    height: WALLET_CARD_FULL_HEIGHT,
  },
  scanCardWrapper: {
    height: WALLET_CARD_SCAN_HEIGHT,
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
  fill: {
    flex: 1,
  },
  faceLayer: {
    ...StyleSheet.absoluteFill,
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
  scanImageFill: {
    ...StyleSheet.absoluteFill,
    width: '100%',
    height: '100%',
  },
});
