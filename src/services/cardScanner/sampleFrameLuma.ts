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
   * Single-channel 8-bit pixels, row-major, tightly packed.
   *
   * An `ArrayBuffer`, not a `Uint8Array`: react-native-worklets copies raw
   * ArrayBuffers across runtimes but does not serialize typed-array views.
   */
  pixels: ArrayBuffer;
  /** Frame orientation, needed to map detected points into preview space. */
  orientation: Frame['orientation'];
  isMirrored: boolean;
}

/** Detection runs on a thumbnail this wide — enough for a card edge, cheap to ship. */
const TARGET_WIDTH = 320;

/**
 * Copies the luma (Y) plane of a YUV frame into a small grayscale buffer.
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

  const luma = planes[0];
  const sourceWidth = luma.width;
  const sourceHeight = luma.height;
  const bytesPerRow = luma.bytesPerRow;
  if (sourceWidth <= 0 || sourceHeight <= 0 || bytesPerRow <= 0) {
    return null;
  }

  const source = new Uint8Array(luma.getPixelBuffer());

  // Integer step keeps the inner loop to index arithmetic only.
  const step = Math.max(1, Math.floor(sourceWidth / TARGET_WIDTH));
  const width = Math.floor(sourceWidth / step);
  const height = Math.floor(sourceHeight / step);
  if (width <= 0 || height <= 0) {
    return null;
  }

  const pixels = new Uint8Array(width * height);
  let target = 0;
  for (let y = 0; y < height; y += 1) {
    // bytesPerRow, not width: the plane may be row-padded.
    const rowStart = y * step * bytesPerRow;
    for (let x = 0; x < width; x += 1) {
      pixels[target] = source[rowStart + x * step];
      target += 1;
    }
  }

  return {
    width,
    height,
    pixels: pixels.buffer,
    orientation: frame.orientation,
    isMirrored: frame.isMirrored,
  };
}

/**
 * Maps a point from frame-buffer space into the preview's display space, both
 * normalized 0..1.
 *
 * Frames are not physically rotated — `orientation` says how much the pixel
 * data is rotated relative to the intended output, so we counter-rotate.
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
