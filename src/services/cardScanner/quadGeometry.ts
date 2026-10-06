/**
 * Geometry helpers for the live card-edge detector.
 *
 * Every function here is a worklet: the detector runs them on the camera's
 * frame thread, and the overlay runs them again on the UI thread.
 */

/** A point in normalized frame space — 0..1 on both axes, origin top-left. */
export interface QuadPoint {
  x: number;
  y: number;
}

/** Four corners ordered top-left, top-right, bottom-right, bottom-left. */
export type CardQuad = readonly [QuadPoint, QuadPoint, QuadPoint, QuadPoint];

/** ISO/IEC 7810 ID-1 (85.6 x 54mm) — the business-card width:height. */
export const CARD_ASPECT_RATIO = 1.586;

/**
 * A detected quad must cover at least this fraction of the frame. Rejects
 * distant clutter (a picture frame across the room, a laptop lid).
 */
const MIN_FRAME_COVERAGE = 0.08;

/**
 * ...and at most this much. A quad filling the whole frame is almost always
 * the table edge or the frame border itself, not the card.
 */
const MAX_FRAME_COVERAGE = 0.95;

/**
 * Perspective skews the apparent aspect ratio, so accept a generous band
 * around 1.586 rather than the exact ratio. Also accept the reciprocal so a
 * card held in portrait still registers.
 */
const MIN_ASPECT_RATIO = 1.15;
const MAX_ASPECT_RATIO = 2.35;

/** Corners sharper than this are not a rectangle viewed at an angle. */
const MIN_CORNER_COSINE = 0.5;

/**
 * Orders four points as top-left, top-right, bottom-right, bottom-left.
 *
 * Sorts by angle around the centroid rather than by y-then-x: splitting into a
 * "top pair" and "bottom pair" breaks down for a card rotated near 45°, where
 * two corners share almost the same height.
 */
export function orderQuadCorners(points: readonly QuadPoint[]): CardQuad | null {
  'worklet';
  if (points.length !== 4) {
    return null;
  }

  const centroidX = (points[0].x + points[1].x + points[2].x + points[3].x) / 4;
  const centroidY = (points[0].y + points[1].y + points[2].y + points[3].y) / 4;

  // Screen space has y pointing down, so ascending atan2 walks clockwise:
  // top-left, top-right, bottom-right, bottom-left.
  const clockwise = [...points].sort(
    (a, b) =>
      Math.atan2(a.y - centroidY, a.x - centroidX) -
      Math.atan2(b.y - centroidY, b.x - centroidX),
  );

  // Start from whichever corner is nearest the top-left.
  let start = 0;
  for (let i = 1; i < 4; i += 1) {
    if (clockwise[i].x + clockwise[i].y < clockwise[start].x + clockwise[start].y) {
      start = i;
    }
  }

  return [
    clockwise[start],
    clockwise[(start + 1) % 4],
    clockwise[(start + 2) % 4],
    clockwise[(start + 3) % 4],
  ] as CardQuad;
}

/** Shoelace area, in normalized units (1.0 == the whole frame). */
export function quadArea(quad: CardQuad): number {
  'worklet';
  let area = 0;
  for (let i = 0; i < 4; i += 1) {
    const current = quad[i];
    const next = quad[(i + 1) % 4];
    area += current.x * next.y - next.x * current.y;
  }
  return Math.abs(area) / 2;
}

function distance(a: QuadPoint, b: QuadPoint): number {
  'worklet';
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Longest-edge aspect ratio, always >= 1. Uses the mean of each opposing edge
 * pair so one badly placed corner does not dominate.
 */
export function quadAspectRatio(quad: CardQuad): number {
  'worklet';
  const [tl, tr, br, bl] = quad;
  const width = (distance(tl, tr) + distance(bl, br)) / 2;
  const height = (distance(tl, bl) + distance(tr, br)) / 2;
  if (width <= 0 || height <= 0) {
    return 0;
  }
  return width >= height ? width / height : height / width;
}

/** True when all four cross products share a sign — i.e. the quad is convex. */
export function isConvex(quad: CardQuad): boolean {
  'worklet';
  let sign = 0;
  for (let i = 0; i < 4; i += 1) {
    const a = quad[i];
    const b = quad[(i + 1) % 4];
    const c = quad[(i + 2) % 4];
    const cross = (b.x - a.x) * (c.y - b.y) - (b.y - a.y) * (c.x - b.x);
    if (cross === 0) {
      continue;
    }
    const currentSign = cross > 0 ? 1 : -1;
    if (sign === 0) {
      sign = currentSign;
    } else if (sign !== currentSign) {
      return false;
    }
  }
  return true;
}

/** Rejects quads whose corners are too sharp to be a rectangle in perspective. */
function hasRectangularCorners(quad: CardQuad): boolean {
  'worklet';
  for (let i = 0; i < 4; i += 1) {
    const previous = quad[(i + 3) % 4];
    const current = quad[i];
    const next = quad[(i + 1) % 4];

    const ax = previous.x - current.x;
    const ay = previous.y - current.y;
    const bx = next.x - current.x;
    const by = next.y - current.y;

    const lengthA = Math.sqrt(ax * ax + ay * ay);
    const lengthB = Math.sqrt(bx * bx + by * by);
    if (lengthA === 0 || lengthB === 0) {
      return false;
    }

    const cosine = Math.abs((ax * bx + ay * by) / (lengthA * lengthB));
    if (cosine > MIN_CORNER_COSINE) {
      return false;
    }
  }
  return true;
}

/**
 * Whether a detected quad is plausibly a business card rather than a book, a
 * table edge, or noise. Runs on every frame, so it stays cheap.
 *
 * Takes the quad in *pixel* space along with the frame size: aspect ratio is
 * only meaningful before the axes are normalized independently.
 */
export function isPlausibleCard(
  quad: CardQuad,
  frameWidth: number,
  frameHeight: number,
): boolean {
  'worklet';
  if (frameWidth <= 0 || frameHeight <= 0) {
    return false;
  }

  const coverage = quadArea(quad) / (frameWidth * frameHeight);
  if (coverage < MIN_FRAME_COVERAGE || coverage > MAX_FRAME_COVERAGE) {
    return false;
  }

  const ratio = quadAspectRatio(quad);
  if (ratio < MIN_ASPECT_RATIO || ratio > MAX_ASPECT_RATIO) {
    return false;
  }

  return isConvex(quad) && hasRectangularCorners(quad);
}

/** Mean per-corner movement between two quads, in normalized units. */
export function quadDrift(a: CardQuad, b: CardQuad): number {
  'worklet';
  let total = 0;
  for (let i = 0; i < 4; i += 1) {
    total += distance(a[i], b[i]);
  }
  return total / 4;
}

/** Corner-wise interpolation, used to smooth the overlay between frames. */
export function lerpQuad(from: CardQuad, to: CardQuad, t: number): CardQuad {
  'worklet';
  const clamped = t < 0 ? 0 : t > 1 ? 1 : t;
  const points: QuadPoint[] = [];
  for (let i = 0; i < 4; i += 1) {
    points.push({
      x: from[i].x + (to[i].x - from[i].x) * clamped,
      y: from[i].y + (to[i].y - from[i].y) * clamped,
    });
  }
  return points as unknown as CardQuad;
}

/** Expands a quad by `padding` (normalized) so the crop keeps the card edge. */
export function expandQuad(quad: CardQuad, padding: number): CardQuad {
  'worklet';
  const centroidX = (quad[0].x + quad[1].x + quad[2].x + quad[3].x) / 4;
  const centroidY = (quad[0].y + quad[1].y + quad[2].y + quad[3].y) / 4;

  const points: QuadPoint[] = [];
  for (let i = 0; i < 4; i += 1) {
    const dx = quad[i].x - centroidX;
    const dy = quad[i].y - centroidY;
    const length = Math.sqrt(dx * dx + dy * dy);
    if (length === 0) {
      points.push({ x: quad[i].x, y: quad[i].y });
      continue;
    }
    points.push({
      x: quad[i].x + (dx / length) * padding,
      y: quad[i].y + (dy / length) * padding,
    });
  }
  return points as unknown as CardQuad;
}

/** A crop smaller than this (normalized area) is almost certainly a mis-drag. */
const MIN_CROP_AREA = 0.01;

/**
 * Whether a user-adjusted crop can be warped: convex, not collapsed, and
 * inside the image. `quad` is in normalized image space.
 */
export function isValidCropQuad(quad: CardQuad): boolean {
  'worklet';
  for (let i = 0; i < 4; i += 1) {
    const { x, y } = quad[i];
    if (x < 0 || x > 1 || y < 0 || y > 1) {
      return false;
    }
  }
  return quadArea(quad) >= MIN_CROP_AREA && isConvex(quad);
}

/** Starting crop when no edge was detected: the image, inset slightly. */
export function defaultCropQuad(inset = 0.08): CardQuad {
  'worklet';
  return [
    { x: inset, y: inset },
    { x: 1 - inset, y: inset },
    { x: 1 - inset, y: 1 - inset },
    { x: inset, y: 1 - inset },
  ] as CardQuad;
}

/** Normalized 0..1 point clamped to the image. */
export function clampPoint(point: QuadPoint): QuadPoint {
  'worklet';
  return {
    x: point.x < 0 ? 0 : point.x > 1 ? 1 : point.x,
    y: point.y < 0 ? 0 : point.y > 1 ? 1 : point.y,
  };
}

/** Where an image of `imageWidth` x `imageHeight` lands when `contain`-fit. */
export interface ContainRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * The rect a `resizeMode="contain"` image or preview actually occupies inside
 * its container. Overlays must be drawn relative to this, not the container:
 * the letterbox bars are not part of the image.
 */
export function containRect(
  contentWidth: number,
  contentHeight: number,
  containerWidth: number,
  containerHeight: number,
): ContainRect {
  'worklet';
  if (contentWidth <= 0 || contentHeight <= 0 || containerWidth <= 0 || containerHeight <= 0) {
    return { x: 0, y: 0, width: 0, height: 0 };
  }
  const scale = Math.min(containerWidth / contentWidth, containerHeight / contentHeight);
  const width = contentWidth * scale;
  const height = contentHeight * scale;
  return {
    x: (containerWidth - width) / 2,
    y: (containerHeight - height) / 2,
    width,
    height,
  };
}
