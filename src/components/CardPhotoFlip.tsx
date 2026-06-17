import React, { useEffect, useRef } from 'react';
import {
  Animated,
  Easing,
  type ImageStyle,
  Platform,
  StyleSheet,
  type StyleProp,
  View,
  type ViewStyle,
} from 'react-native';

import { ScanImage, ScanImageBackground } from './ScanImage';
import { prefetchScanImage } from '../utils/scanImage';

export type CardPhotoFace = 'front' | 'back';

export const CARD_PHOTO_FLIP_MS = 320;

interface CardPhotoFlipProps {
  frontPhotoUrl: string | null | undefined;
  backPhotoUrl?: string | null | undefined;
  photoFace: CardPhotoFace;
  style?: StyleProp<ViewStyle>;
  imageStyle?: StyleProp<ImageStyle>;
  resizeMode?: 'cover' | 'contain' | 'stretch' | 'repeat' | 'center';
  variant?: 'image' | 'background';
}

function faceToProgress(face: CardPhotoFace): number {
  return face === 'back' ? 1 : 0;
}

export function CardPhotoFlip({
  frontPhotoUrl,
  backPhotoUrl,
  photoFace,
  style,
  imageStyle,
  resizeMode = 'cover',
  variant = 'image',
}: CardPhotoFlipProps): React.JSX.Element | null {
  const hasBackPhoto = Boolean(backPhotoUrl);
  const flipProgress = useRef(new Animated.Value(faceToProgress(photoFace))).current;
  const didMountRef = useRef(false);
  const cardKeyRef = useRef('');

  useEffect(() => {
    void prefetchScanImage(frontPhotoUrl);
    if (backPhotoUrl) {
      void prefetchScanImage(backPhotoUrl);
    }
  }, [backPhotoUrl, frontPhotoUrl]);

  useEffect(() => {
    const cardKey = `${frontPhotoUrl ?? ''}|${backPhotoUrl ?? ''}`;
    const cardChanged = cardKeyRef.current !== cardKey;
    cardKeyRef.current = cardKey;

    if (!hasBackPhoto) {
      flipProgress.setValue(0);
      return;
    }

    const target = faceToProgress(photoFace);

    if (!didMountRef.current || cardChanged) {
      didMountRef.current = true;
      flipProgress.setValue(target);
      return;
    }

    const animation = Animated.timing(flipProgress, {
      toValue: target,
      duration: CARD_PHOTO_FLIP_MS,
      easing: Easing.inOut(Easing.ease),
      useNativeDriver: true,
    });

    animation.start();
    return () => {
      animation.stop();
    };
  }, [backPhotoUrl, flipProgress, frontPhotoUrl, hasBackPhoto, photoFace]);

  const rotateY = flipProgress.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '180deg'],
  });

  // backfaceVisibility is unreliable on Android; opacity swap at the edge works everywhere.
  const frontOpacity = flipProgress.interpolate({
    inputRange: [0, 0.5, 0.51, 1],
    outputRange: [1, 1, 0, 0],
    extrapolate: 'clamp',
  });
  const backOpacity = flipProgress.interpolate({
    inputRange: [0, 0.5, 0.51, 1],
    outputRange: [0, 0, 1, 1],
    extrapolate: 'clamp',
  });

  const renderFace = (
    scanImageUrl: string | null | undefined,
  ): React.JSX.Element | null => {
    if (variant === 'background') {
      return (
        <ScanImageBackground
          scanImageUrl={scanImageUrl}
          style={styles.faceFill}
          imageStyle={imageStyle ?? styles.faceImageFill}
          resizeMode={resizeMode}
        />
      );
    }

    return (
      <ScanImage
        scanImageUrl={scanImageUrl}
        style={styles.faceFill}
        resizeMode={resizeMode}
      />
    );
  };

  if (!hasBackPhoto) {
    return <View style={[style, styles.singleFace]}>{renderFace(frontPhotoUrl)}</View>;
  }

  return (
    <View style={[style, styles.flipContainer]}>
      <Animated.View
        needsOffscreenAlphaCompositing={Platform.OS === 'ios'}
        renderToHardwareTextureAndroid
        style={[
          styles.flipInner,
          {
            transform: [{ perspective: 1000 }, { rotateY }],
          },
        ]}
      >
        <Animated.View style={[styles.face, { opacity: frontOpacity }]}>
          {renderFace(frontPhotoUrl)}
        </Animated.View>
        <Animated.View
          style={[
            styles.face,
            styles.backFace,
            { opacity: backOpacity },
          ]}
        >
          {renderFace(backPhotoUrl)}
        </Animated.View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  singleFace: {
    flex: 1,
    overflow: 'hidden',
  },
  flipContainer: {
    flex: 1,
    overflow: 'hidden',
  },
  flipInner: {
    flex: 1,
  },
  face: {
    ...StyleSheet.absoluteFill,
  },
  backFace: {
    transform: [{ rotateY: '180deg' }],
  },
  faceFill: {
    ...StyleSheet.absoluteFill,
    width: '100%',
    height: '100%',
  },
  faceImageFill: {
    ...StyleSheet.absoluteFill,
    width: '100%',
    height: '100%',
  },
});
