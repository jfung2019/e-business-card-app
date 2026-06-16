import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { getCardDesign } from '../theme/cardDesigns';
import type { PhotoFace, UserCard, WalletDisplay } from '../types/userCard';
import {
  nextUserCardWalletDisplay,
  showsUserCardPhoto,
  userCardHasScanImage,
} from '../utils/walletDisplay';
import { ScanImage } from './ScanImage';

export const MY_CARD_WIDTH = 300;
export const MY_CARD_HEIGHT = 176;
const SCAN_CARD_ASPECT_RATIO = 1.586;
export const MY_CARD_SCAN_HEIGHT = Math.round(MY_CARD_WIDTH / SCAN_CARD_ASPECT_RATIO);
const CARD_BORDER_RADIUS = 22;
const FACE_FLIP_MS = 240;

interface MyCardFaceProps {
  card: UserCard;
  onPress?: () => void;
  compact?: boolean;
  onWalletDisplayChange?: (cardId: string, walletDisplay: WalletDisplay) => void;
  onPhotoFaceChange?: (cardId: string, photoFace: PhotoFace) => void;
}

function FlipBadge({
  onFlip,
  variant,
  textColor,
  mutedColor,
}: {
  onFlip: () => void;
  variant: 'photo' | 'classic';
  textColor: string;
  mutedColor: string;
}): React.JSX.Element {
  const handlePress = (event: { stopPropagation?: () => void }) => {
    event.stopPropagation?.();
    onFlip();
  };

  if (variant === 'photo') {
    return (
      <Pressable
        onPress={handlePress}
        hitSlop={8}
        style={styles.photoBadge}
        accessibilityLabel="Switch card style"
        accessibilityRole="button"
      >
        <Text style={[styles.flipIcon, styles.flipIconOnPhoto]}>⇄</Text>
        <Text style={styles.scanBadgeText}>Scan</Text>
      </Pressable>
    );
  }

  return (
    <Pressable
      onPress={handlePress}
      hitSlop={8}
      style={styles.classicBadgeRow}
      accessibilityLabel="Switch card style"
      accessibilityRole="button"
    >
      <Text style={[styles.flipIcon, { color: textColor }]}>⇄</Text>
      <Text style={[styles.sourceLabel, { color: mutedColor }]}>Scan</Text>
    </Pressable>
  );
}

function TemplateCardFace({
  card,
  showFlip,
  onFlip,
}: {
  card: UserCard;
  showFlip: boolean;
  onFlip?: () => void;
}): React.JSX.Element {
  const design = getCardDesign(card.design_id);
  const { core_fields } = card;

  return (
    <View style={styles.templateRoot}>
      <View style={[styles.accentOrb, { backgroundColor: design.accent }]} />
      <View style={styles.cardInner}>
        <View style={styles.topRow}>
          <Text style={[styles.company, { color: design.text }]} numberOfLines={1}>
            {core_fields.company_name ?? core_fields.name}
          </Text>
          {showFlip && onFlip ? (
            <FlipBadge
              onFlip={onFlip}
              variant="classic"
              textColor={design.text}
              mutedColor={design.muted}
            />
          ) : card.is_primary ? (
            <Text style={[styles.primaryBadge, { color: design.muted }]}>Primary</Text>
          ) : null}
        </View>
        <View style={styles.bottomBlock}>
          <Text style={[styles.name, { color: design.text }]} numberOfLines={1}>
            {core_fields.name}
          </Text>
          {core_fields.job_title ? (
            <Text style={[styles.subtitle, { color: design.muted }]} numberOfLines={1}>
              {core_fields.job_title}
            </Text>
          ) : null}
          {core_fields.email ? (
            <Text style={[styles.detail, { color: design.muted }]} numberOfLines={1}>
              {core_fields.email}
            </Text>
          ) : null}
        </View>
      </View>
    </View>
  );
}

export function getMyCardDisplayHeight(card: UserCard): number {
  return userCardHasScanImage(card) ? MY_CARD_SCAN_HEIGHT : MY_CARD_HEIGHT;
}

function MyCardFaceContent({
  card,
  compact,
  onWalletDisplayChange,
  onPhotoFaceChange,
}: {
  card: UserCard;
  compact?: boolean;
  onWalletDisplayChange?: (cardId: string, walletDisplay: WalletDisplay) => void;
  onPhotoFaceChange?: (cardId: string, photoFace: PhotoFace) => void;
}): React.JSX.Element {
  const design = getCardDesign(card.design_id);
  const hasScan = userCardHasScanImage(card);
  const showPhoto = hasScan && showsUserCardPhoto(card);
  const photoFace: PhotoFace = card.photo_face === 'back' ? 'back' : 'front';
  const hasBackPhoto = Boolean(card.scan_image_back_url);
  const frontPhotoUrl = card.scan_image_front_url ?? card.scan_image_url;
  const backPhotoUrl = card.scan_image_back_url;
  const [displayedFace, setDisplayedFace] = useState<PhotoFace>(photoFace);
  const displayedFaceRef = useRef<PhotoFace>(photoFace);
  const flipProgress = useRef(new Animated.Value(0)).current;
  const activePhotoUrl =
    displayedFace === 'back' && hasBackPhoto ? backPhotoUrl : frontPhotoUrl;
  const cardHeight = getMyCardDisplayHeight(card);
  const cardWidth = compact ? ('100%' as const) : MY_CARD_WIDTH;

  const handleFlip = (): void => {
    if (!hasScan || !onWalletDisplayChange) {
      return;
    }
    onWalletDisplayChange(card._id, nextUserCardWalletDisplay(card));
  };

  const handleFlipFace = (): void => {
    if (!hasBackPhoto || !onPhotoFaceChange) {
      return;
    }
    onPhotoFaceChange(card._id, photoFace === 'front' ? 'back' : 'front');
  };

  useEffect(() => {
    if (!showPhoto || !hasBackPhoto) {
      displayedFaceRef.current = photoFace;
      setDisplayedFace(photoFace);
      flipProgress.setValue(0);
      return;
    }

    if (photoFace === displayedFaceRef.current) {
      return;
    }

    const animation = Animated.sequence([
      Animated.timing(flipProgress, {
        toValue: 1,
        duration: FACE_FLIP_MS / 2,
        useNativeDriver: true,
      }),
      Animated.timing(flipProgress, {
        toValue: 2,
        duration: FACE_FLIP_MS / 2,
        useNativeDriver: true,
      }),
    ]);

    animation.start(({ finished }) => {
      if (finished) {
        displayedFaceRef.current = photoFace;
        setDisplayedFace(photoFace);
        flipProgress.setValue(0);
      }
    });

    const swapTimer = setTimeout(() => {
      displayedFaceRef.current = photoFace;
      setDisplayedFace(photoFace);
    }, FACE_FLIP_MS / 2);

    return () => {
      clearTimeout(swapTimer);
      animation.stop();
      flipProgress.stopAnimation();
      flipProgress.setValue(0);
    };
  }, [flipProgress, hasBackPhoto, photoFace, showPhoto]);

  const flipTransform = {
    transform: [
      {
        rotateY: flipProgress.interpolate({
          inputRange: [0, 1, 2],
          outputRange: ['0deg', '90deg', '180deg'],
        }),
      },
      { perspective: 1000 },
    ],
  };

  return (
    <Animated.View
      style={[
        styles.cardShell,
        { width: cardWidth, height: cardHeight },
        !showPhoto && { backgroundColor: design.background },
        showPhoto && hasBackPhoto && flipTransform,
      ]}
    >
      {showPhoto ? (
        <>
          <ScanImage
            scanImageUrl={activePhotoUrl}
            style={styles.scanPhoto}
            resizeMode="cover"
          />
          {hasBackPhoto ? (
            <Pressable
              onPress={handleFlipFace}
              hitSlop={8}
              style={styles.faceBadge}
              accessibilityLabel="Flip photo face"
              accessibilityRole="button"
            >
              <Text style={[styles.flipIcon, styles.flipIconOnPhoto]}>⇆</Text>
              <Text style={styles.scanBadgeText}>
                {displayedFace === 'front' ? 'Back' : 'Front'}
              </Text>
            </Pressable>
          ) : null}
          <FlipBadge
            onFlip={handleFlip}
            variant="photo"
            textColor={design.text}
            mutedColor={design.muted}
          />
        </>
      ) : (
        <TemplateCardFace
          card={card}
          showFlip={hasScan}
          onFlip={hasScan ? handleFlip : undefined}
        />
      )}
    </Animated.View>
  );
}

export function MyCardFace({
  card,
  onPress,
  compact = false,
  onWalletDisplayChange,
  onPhotoFaceChange,
}: MyCardFaceProps): React.JSX.Element {
  const cardHeight = getMyCardDisplayHeight(card);

  const content = (
    <MyCardFaceContent
      card={card}
      compact={compact}
      onWalletDisplayChange={onWalletDisplayChange}
      onPhotoFaceChange={onPhotoFaceChange}
    />
  );

  if (!onPress) {
    return content;
  }

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        { height: cardHeight },
        !compact && { width: MY_CARD_WIDTH },
        pressed && styles.pressed,
      ]}
    >
      {content}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  cardShell: {
    borderRadius: CARD_BORDER_RADIUS,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.35)',
  },
  templateRoot: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  scanPhoto: {
    ...StyleSheet.absoluteFillObject,
    width: '100%',
    height: '100%',
  },
  pressed: {
    opacity: 0.94,
    transform: [{ scale: 0.988 }],
  },
  accentOrb: {
    position: 'absolute',
    top: -36,
    right: -24,
    width: 140,
    height: 140,
    borderRadius: 70,
    opacity: 0.24,
  },
  cardInner: {
    flex: 1,
    paddingHorizontal: 20,
    paddingVertical: 18,
    justifyContent: 'space-between',
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 8,
  },
  company: {
    flex: 1,
    fontSize: 24,
    fontWeight: '600',
    fontStyle: 'italic',
  },
  primaryBadge: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  bottomBlock: {
    gap: 4,
  },
  name: {
    fontSize: 17,
    fontWeight: '700',
  },
  subtitle: {
    fontSize: 14,
    fontWeight: '500',
  },
  detail: {
    fontSize: 12,
    fontWeight: '500',
  },
  photoBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(0,0,0,0.45)',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
    position: 'absolute',
    top: 12,
    right: 12,
    zIndex: 2,
  },
  faceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(0,0,0,0.45)',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
    position: 'absolute',
    top: 12,
    left: 12,
    zIndex: 2,
  },
  classicBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  flipIcon: {
    fontSize: 14,
    fontWeight: '700',
  },
  flipIconOnPhoto: {
    color: '#FFFFFF',
  },
  scanBadgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.4,
  },
  sourceLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
});
