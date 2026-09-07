import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { FlipIcon, PhotoIcon } from './icons/CardFaceIcons';

interface CardFaceControlsProps {
  onScanToggle?: () => void;
  showFlipFace?: boolean;
  onFlipFace?: () => void;
}

const ICON_SIZE = 16;
const ICON_COLOR = '#FFFFFF';

export function CardFaceControls({
  onScanToggle,
  showFlipFace,
  onFlipFace,
}: CardFaceControlsProps): React.JSX.Element | null {
  const showFlip = Boolean(showFlipFace && onFlipFace);
  if (!onScanToggle && !showFlip) {
    return null;
  }

  return (
    <View style={styles.row} pointerEvents="box-none">
      {onScanToggle ? (
        <Pressable
          onPress={onScanToggle}
          hitSlop={8}
          style={({ pressed }) => [styles.button, pressed && styles.pressed]}
          accessibilityLabel="Switch card style"
          accessibilityRole="button"
        >
          <PhotoIcon size={ICON_SIZE} color={ICON_COLOR} />
        </Pressable>
      ) : null}
      {showFlip ? (
        <Pressable
          onPress={onFlipFace}
          hitSlop={8}
          style={({ pressed }) => [styles.button, pressed && styles.pressed]}
          accessibilityLabel="Flip to see the other side"
          accessibilityRole="button"
        >
          <FlipIcon size={ICON_SIZE} color={ICON_COLOR} />
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    position: 'absolute',
    bottom: 12,
    right: 12,
    flexDirection: 'row',
    gap: 8,
    zIndex: 2,
  },
  button: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.85,
    transform: [{ scale: 0.94 }],
  },
});
