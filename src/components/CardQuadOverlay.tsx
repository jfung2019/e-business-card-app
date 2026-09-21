import React from 'react';
import { StyleSheet } from 'react-native';
import Svg, { Circle, Polygon } from 'react-native-svg';

import type { CardQuad } from '../services/cardScanner/quadGeometry';

interface CardQuadOverlayProps {
  /** Detected corners in normalized preview space, or null when none. */
  quad: CardQuad | null;
  /** Preview size in points, used to project the normalized quad. */
  width: number;
  height: number;
  /** Highlight colour — goes solid once the card is steady enough to capture. */
  color: string;
  /** True while the auto-capture countdown is running. */
  isLocked: boolean;
}

/**
 * Draws the detected card outline over the camera preview.
 *
 * Deliberately a plain re-render rather than a Reanimated overlay: the
 * detector only publishes a few times per second, so the quad is already
 * smoothed by the time it arrives here.
 */
export function CardQuadOverlay({
  quad,
  width,
  height,
  color,
  isLocked,
}: CardQuadOverlayProps): React.JSX.Element | null {
  if (!quad || width <= 0 || height <= 0) {
    return null;
  }

  const points = quad
    .map((corner) => `${corner.x * width},${corner.y * height}`)
    .join(' ');

  return (
    <Svg style={StyleSheet.absoluteFill} pointerEvents="none">
      <Polygon
        points={points}
        fill={color}
        fillOpacity={isLocked ? 0.22 : 0.1}
        stroke={color}
        strokeWidth={isLocked ? 4 : 2.5}
        strokeLinejoin="round"
      />
      {quad.map((corner, index) => (
        <Circle
          key={`corner-${index}`}
          cx={corner.x * width}
          cy={corner.y * height}
          r={isLocked ? 9 : 6}
          fill={color}
        />
      ))}
    </Svg>
  );
}
