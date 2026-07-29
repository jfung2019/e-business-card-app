export type QuadPoint = {
  x: number;
  y: number;
};

export type Quad = [QuadPoint, QuadPoint, QuadPoint, QuadPoint];

/**
 * Shrink a detected card quad toward its centroid.
 * insetRatio 0.025 = move each corner 2.5% of the way to the center.
 */
export function insetQuadTowardCenter(
  corners: readonly QuadPoint[],
  insetRatio: number,
): Quad {
  if (corners.length !== 4) {
    throw new Error('insetQuadTowardCenter expects exactly 4 corners.');
  }

  const ratio = Math.min(Math.max(insetRatio, 0), 0.45);
  const scale = 1 - ratio;
  const cx = (corners[0].x + corners[1].x + corners[2].x + corners[3].x) / 4;
  const cy = (corners[0].y + corners[1].y + corners[2].y + corners[3].y) / 4;

  return corners.map(point => ({
    x: cx + (point.x - cx) * scale,
    y: cy + (point.y - cy) * scale,
  })) as Quad;
}

/** TL → TR → BR → BL for a full image / already-warped scan. */
export function imageCornerQuad(width: number, height: number): Quad {
  return [
    { x: 0, y: 0 },
    { x: width, y: 0 },
    { x: width, y: height },
    { x: 0, y: height },
  ];
}

export function boundingSizeOfQuad(corners: readonly QuadPoint[]): {
  width: number;
  height: number;
} {
  const xs = corners.map(p => p.x);
  const ys = corners.map(p => p.y);
  return {
    width: Math.max(1, Math.round(Math.max(...xs) - Math.min(...xs))),
    height: Math.max(1, Math.round(Math.max(...ys) - Math.min(...ys))),
  };
}
