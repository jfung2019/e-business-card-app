import type { Frame } from 'react-native-vision-camera';

import type { CardQuad, QuadPoint } from './quadGeometry';

/**
 * A downsampled grayscale copy of one camera frame, small enough to hand to
 * the JS thread on every detection tick.
 */
export interface LumaSample {
  width: number;
  height: number;
  /**
   * Single-channel 8-bit pixels, row-major, one char per pixel (char code =
   * luma, 1..255).
   *
   * A string rather than an ArrayBuffer. An ArrayBuffer sent from the camera
   * thread arrived empty on Android and OpenCV then memcpy'd from a null
   * pointer, killing the app. Strings are serialized by value in every
   * react-native-worklets version, so this cannot be dropped in transit.
   */
  luma: string;
  /** Frame orientation, needed to map detected points into preview space. */
  orientation: Frame['orientation'];
  isMirrored: boolean;
}

/** Detection runs on a thumbnail whose long edge is this — enough for a card edge. */
const TARGET_LONG_EDGE = 320;

/** String.fromCharCode.apply stays well under engine argument limits at this size. */
const CHAR_CHUNK = 2048;

/**
 * Copies the luma (Y) plane of a YUV frame into a small grayscale string.
 *
 * Deliberately plain arithmetic rather than OpenCV: `react-native-fast-opencv`
 * installs its JSI bindings on the main JS runtime only, so calling it from a
 * frame-thread worklet is not guaranteed. Sampling here and running the actual
 * detection on the JS thread keeps this working across runtime versions.
 */
export function sampleFrameLuma(frame: Frame): LumaSample | null {
  'worklet';
  if (!frame.isValid || !frame.isPlanar) {
    return null;
  }

  const planes = frame.getPlanes();
  if (planes.length === 0) {
    return null;
  }

  const plane = planes[0];
  const sourceWidth = plane.width;
  const sourceHeight = plane.height;
  const bytesPerRow = plane.bytesPerRow;
  if (sourceWidth <= 0 || sourceHeight <= 0 || bytesPerRow <= 0) {
    return null;
  }

  const source = new Uint8Array(plane.getPixelBuffer());
  if (source.length < bytesPerRow * (sourceHeight - 1) + sourceWidth) {
    // Shorter plane than its own geometry claims — do not walk off the end.
    return null;
  }

  // Step by the long edge so portrait (rotated) frames shrink as much as
  // landscape ones.
  const longEdge = sourceWidth > sourceHeight ? sourceWidth : sourceHeight;
  const step = Math.max(1, Math.floor(longEdge / TARGET_LONG_EDGE));
  const width = Math.floor(sourceWidth / step);
  const height = Math.floor(sourceHeight / step);
  if (width <= 0 || height <= 0) {
    return null;
  }

  const parts: string[] = [];
  const chunk: number[] = [];
  for (let y = 0; y < height; y += 1) {
    // bytesPerRow, not width: the plane may be row-padded.
    const rowStart = y * step * bytesPerRow;
    for (let x = 0; x < width; x += 1) {
      const value = source[rowStart + x * step];
      // Never emit U+0000: an embedded NUL is the one character a native
      // string bridge might truncate at. 0 vs 1 is invisible to edge detection.
      chunk.push(value === 0 ? 1 : value);
      if (chunk.length === CHAR_CHUNK) {
        parts.push(String.fromCharCode.apply(null, chunk));
        chunk.length = 0;
      }
    }
  }
  if (chunk.length > 0) {
    parts.push(String.fromCharCode.apply(null, chunk));
  }

  return {
    width,
    height,
    luma: parts.join(''),
    orientation: frame.orientation,
    isMirrored: frame.isMirrored,
  };
}

/** Decodes {@link LumaSample.luma} back into bytes on the JS thread. */
export function decodeLuma(luma: string): Uint8Array {
  const pixels = new Uint8Array(luma.length);
  for (let i = 0; i < luma.length; i += 1) {
    pixels[i] = luma.charCodeAt(i);
  }
  return pixels;
}

/**
 * Maps a point from frame-buffer space into the preview's display space, both
 * normalized 0..1.
 *
 * The scanner asks vision-camera to rotate buffers physically, so frames
 * normally arrive `'up'` and this is the identity. The other cases remain as a
 * fallback in case a device ignores that request.
 */
function toPreviewSpace(
  point: QuadPoint,
  orientation: Frame['orientation'],
  isMirrored: boolean,
): QuadPoint {
  'worklet';
  let { x, y } = point;

  if (isMirrored) {
    x = 1 - x;
  }

  switch (orientation) {
    case 'right':
      // Pixel data is +90° rotated: counter-rotate 90° counter-clockwise.
      return { x: y, y: 1 - x };
    case 'left':
      return { x: 1 - y, y: x };
    case 'down':
      return { x: 1 - x, y: 1 - y };
    default:
      return { x, y };
  }
}

/** Applies {@link toPreviewSpace} to all four corners. */
export function quadToPreviewSpace(
  quad: CardQuad,
  orientation: Frame['orientation'],
  isMirrored: boolean,
): CardQuad {
  'worklet';
  return [
    toPreviewSpace(quad[0], orientation, isMirrored),
    toPreviewSpace(quad[1], orientation, isMirrored),
    toPreviewSpace(quad[2], orientation, isMirrored),
    toPreviewSpace(quad[3], orientation, isMirrored),
  ] as CardQuad;
}
