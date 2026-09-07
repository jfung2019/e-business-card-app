import React from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { useAppTheme } from '../context/ThemeContext';
import { getCardDesign } from '../theme/cardDesigns';
import type { PhotoFace, UserCard, WalletDisplay } from '../types/userCard';
import {
  nextUserCardWalletDisplay,
  showsUserCardPhoto,
  userCardHasScanImage,
} from '../utils/walletDisplay';
import { CardFaceControls } from './CardFaceControls';
import { CardPhotoFlip } from './CardPhotoFlip';

export const MY_CARD_WIDTH = 300;
export const MY_CARD_HEIGHT = 176;
const SCAN_CARD_ASPECT_RATIO = 1.586;
export const MY_CARD_SCAN_HEIGHT = Math.round(MY_CARD_WIDTH / SCAN_CARD_ASPECT_RATIO);
const CARD_BORDER_RADIUS = 22;

interface MyCardFaceProps {
  card: UserCard;
  onPress?: () => void;
  compact?: boolean;
  /** Renders scan/back controls under the card instead of overlay badges on the card. */
  controlsBelow?: boolean;
  onWalletDisplayChange?: (cardId: string, walletDisplay: WalletDisplay) => void;
  onPhotoFaceChange?: (cardId: string, photoFace: PhotoFace) => void;
}

function BelowCardControls({
  showPhoto,
  photoFace,
  hasBackPhoto,
  onFlip,
  onFlipFace,
}: {
  showPhoto: boolean;
  photoFace: PhotoFace;
  hasBackPhoto: boolean;
  onFlip: () => void;
  onFlipFace: () => void;
}): React.JSX.Element {
  const { wallet } = useAppTheme();

  return (
    <View style={styles.belowControlsRow}>
      {showPhoto && hasBackPhoto ? (
        <Pressable
          onPress={onFlipFace}
          hitSlop={8}
          style={({ pressed }) => [
            styles.belowControlButton,
            { borderColor: wallet.border },
            pressed && styles.belowControlButtonPressed,
          ]}
          accessibilityLabel={photoFace === 'front' ? 'Show back view' : 'Show front view'}
          accessibilityRole="button"
        >
          <Text style={[styles.belowControlText, { color: wallet.title }]}>
            {photoFace === 'front' ? 'Back view' : 'Front view'}
          </Text>
        </Pressable>
      ) : null}
      <Pressable
        onPress={onFlip}
        hitSlop={8}
        style={({ pressed }) => [
          styles.belowControlButton,
          { borderColor: wallet.border },
          pressed && styles.belowControlButtonPressed,
        ]}
        accessibilityLabel="Switch card style"
        accessibilityRole="button"
      >
        <Text style={[styles.belowControlText, { color: wallet.title }]}>
          {showPhoto ? '⇄ Design' : '⇄ Scan'}
        </Text>
      </Pressable>
    </View>
  );
}

function TemplateCardFace({ card }: { card: UserCard }): React.JSX.Element {
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
          {card.is_primary ? (
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
  controlsBelow,
  onWalletDisplayChange,
  onPhotoFaceChange,
}: {
  card: UserCard;
  compact?: boolean;
  controlsBelow?: boolean;
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

  const cardBody = (
    <View
      style={[
        styles.cardShell,
        { width: cardWidth, height: cardHeight },
        !showPhoto && { backgroundColor: design.background },
      ]}
    >
      {showPhoto ? (
        <CardPhotoFlip
          frontPhotoUrl={frontPhotoUrl}
          backPhotoUrl={backPhotoUrl}
          photoFace={photoFace}
          style={styles.scanPhoto}
          resizeMode="cover"
          variant="image"
        />
      ) : (
        <TemplateCardFace card={card} />
      )}
      {!controlsBelow && hasScan ? (
        <CardFaceControls
          onScanToggle={handleFlip}
          showFlipFace={hasBackPhoto}
          onFlipFace={handleShowBack}
        />
      ) : null}
    </View>
  );

  if (!controlsBelow || !hasScan) {
    return cardBody;
  }

  return (
    <View style={[styles.belowControlsWrap, compact && styles.belowControlsWrapCompact]}>
      {cardBody}
      <BelowCardControls
        showPhoto={showPhoto}
        photoFace={photoFace}
        hasBackPhoto={hasBackPhoto}
        onFlip={handleFlip}
        onFlipFace={handleFlipFace}
      />
    </View>
  );
}

export function MyCardFace({
  card,
  onPress,
  compact = false,
  controlsBelow = false,
  onWalletDisplayChange,
  onPhotoFaceChange,
}: MyCardFaceProps): React.JSX.Element {
  const cardHeight = getMyCardDisplayHeight(card);

  const content = (
    <MyCardFaceContent
      card={card}
      compact={compact}
      controlsBelow={controlsBelow}
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
    ...StyleSheet.absoluteFill,
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
  belowControlsWrap: {
    width: MY_CARD_WIDTH,
    gap: 12,
  },
  belowControlsWrapCompact: {
    width: '100%',
  },
  belowControlsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 10,
  },
  belowControlButton: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  belowControlButtonPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.96 }],
  },
  belowControlText: {
    fontSize: 14,
    fontWeight: '600',
  },
});
