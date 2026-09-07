import React, { forwardRef, useImperativeHandle, useRef } from 'react';
import { Image, StyleSheet, View } from 'react-native';
import ViewShot, { type ViewShotRef } from 'react-native-view-shot';

const COMPOSER_WIDTH = 900;
const CARD_ASPECT_RATIO = 1.586;
const CARD_HEIGHT = Math.round(COMPOSER_WIDTH / CARD_ASPECT_RATIO);
const COMPOSER_GAP = 28;
const COMPOSED_HEIGHT = CARD_HEIGHT * 2 + COMPOSER_GAP;

export interface ComposedCardImage {
  uri: string;
  width: number;
  height: number;
}

export interface CardImageComposerRef {
  capture: () => Promise<ComposedCardImage>;
}

interface CardImageComposerProps {
  frontUri: string | null;
  backUri: string | null;
}

/** Stacks a front + back scan into a single image so front/back exports become one page/photo. */
export const CardImageComposer = forwardRef<CardImageComposerRef, CardImageComposerProps>(
  ({ frontUri, backUri }, ref) => {
    const shotRef = useRef<ViewShotRef>(null);

    useImperativeHandle(ref, () => ({
      capture: async () => {
        if (!shotRef.current) {
          throw new Error('Unable to render card for export.');
        }
        const uri = await shotRef.current.capture();
        return { uri, width: COMPOSER_WIDTH, height: COMPOSED_HEIGHT };
      },
    }));

    if (!frontUri || !backUri) {
      return null;
    }

    return (
      <ViewShot ref={shotRef} options={{ format: 'png', result: 'data-uri' }} style={styles.canvas}>
        <Image source={{ uri: frontUri }} style={styles.face} resizeMode="cover" />
        <View style={styles.gap} />
        <Image source={{ uri: backUri }} style={styles.face} resizeMode="cover" />
      </ViewShot>
    );
  },
);

const styles = StyleSheet.create({
  canvas: {
    width: COMPOSER_WIDTH,
    backgroundColor: '#FFFFFF',
  },
  face: {
    width: '100%',
    height: CARD_HEIGHT,
  },
  gap: {
    height: COMPOSER_GAP,
  },
});
