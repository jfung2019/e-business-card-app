import React from 'react';
import { StyleSheet, View } from 'react-native';

interface CardFaceIconProps {
  size?: number;
  color?: string;
}

export function PhotoIcon({ size = 18, color = '#FFFFFF' }: CardFaceIconProps): React.JSX.Element {
  const stroke = Math.max(1.5, size * 0.1);
  const lens = size * 0.16;
  const mountain = size * 0.42;

  return (
    <View
      style={[
        styles.photoFrame,
        {
          width: size,
          height: size,
          borderColor: color,
          borderWidth: stroke,
          borderRadius: size * 0.18,
        },
      ]}
    >
      <View
        style={{
          position: 'absolute',
          top: size * 0.14,
          left: size * 0.14,
          width: lens,
          height: lens,
          borderRadius: lens,
          backgroundColor: color,
        }}
      />
      <View
        style={{
          position: 'absolute',
          bottom: -stroke,
          left: size * 0.08,
          width: 0,
          height: 0,
          borderLeftWidth: mountain * 0.55,
          borderRightWidth: mountain * 0.55,
          borderBottomWidth: mountain,
          borderLeftColor: 'transparent',
          borderRightColor: 'transparent',
          borderBottomColor: color,
        }}
      />
    </View>
  );
}

export function FlipIcon({ size = 18, color = '#FFFFFF' }: CardFaceIconProps): React.JSX.Element {
  const thickness = Math.max(1.5, size * 0.1);
  const arrow = size * 0.28;

  return (
    <View style={{ width: size, height: size, justifyContent: 'center' }}>
      <View style={[styles.flipRow, { marginBottom: size * 0.12 }]}>
        <View style={[styles.flipLine, { backgroundColor: color, height: thickness, flex: 1 }]} />
        <View
          style={{
            width: 0,
            height: 0,
            borderTopWidth: arrow * 0.45,
            borderBottomWidth: arrow * 0.45,
            borderLeftWidth: arrow,
            borderTopColor: 'transparent',
            borderBottomColor: 'transparent',
            borderLeftColor: color,
          }}
        />
      </View>
      <View style={styles.flipRow}>
        <View
          style={{
            width: 0,
            height: 0,
            borderTopWidth: arrow * 0.45,
            borderBottomWidth: arrow * 0.45,
            borderRightWidth: arrow,
            borderTopColor: 'transparent',
            borderBottomColor: 'transparent',
            borderRightColor: color,
          }}
        />
        <View style={[styles.flipLine, { backgroundColor: color, height: thickness, flex: 1 }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  photoFrame: {
    overflow: 'hidden',
  },
  flipRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  flipLine: {
    borderRadius: 99,
  },
});
