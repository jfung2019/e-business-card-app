import React from 'react';
import { StyleSheet } from 'react-native';
import Svg, { Circle, Polygon } from 'react-native-svg';

import type { CardQuad, ContainRect } from '../services/cardScanner/quadGeometry';

interface CardQuadOverlayProps {
  /** Detected corners in normalized preview space, or null when none. */
  quad: CardQuad | null;
  /**
   * Where the camera image actually sits inside the preview view. The preview
   * is `contain`-fit, so this excludes the letterbox bars.
   */
  rect: ContainRect;
  /** Highlight colour. */
  color: string;
  /** 0..1 — how close the card is to holding still long enough to auto-capture. */
  progress: number;
}

/**
 * Draws the detected card outline over the camera preview. Corners grow and
 * the fill deepens as the card steadies, so users can see auto-capture coming.
 */
export function CardQuadOverlay({
  quad,
  rect,
  color,
  progress,
}: CardQuadOverlayProps): React.JSX.Element | null {
  if (!quad || rect.width <= 0 || rect.height <= 0) {
    return null;
  }

  const project = (x: number, y: number) => ({
    x: rect.x + x * rect.width,
    y: rect.y + y * rect.height,
  });

  const points = quad
    .map((corner) => {
      const p = project(corner.x, corner.y);
      return `${p.x},${p.y}`;
    })
    .join(' ');

  const clamped = progress < 0 ? 0 : progress > 1 ? 1 : progress;

  return (
    <Svg style={StyleSheet.absoluteFill} pointerEvents="none">
      <Polygon
        points={points}
        fill={color}
        fillOpacity={0.08 + clamped * 0.2}
        stroke={color}
        strokeWidth={2.5 + clamped * 2}
        strokeLinejoin="round"
      />
      {quad.map((corner, index) => {
        const p = project(corner.x, corner.y);
        return (
          <Circle
            key={`corner-${index}`}
            cx={p.x}
            cy={p.y}
            r={6 + clamped * 4}
            fill={color}
          />
        );
      })}
    </Svg>
  );
}
