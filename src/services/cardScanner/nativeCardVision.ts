import { NativeModules, Platform } from 'react-native';

import { orderQuadCorners, type CardQuad, type QuadPoint } from './quadGeometry';

/**
 * iOS-only bridge to `CardVisionModule`: Apple Vision's rectangle detector
 * and Core Image's perspective correction — what VisionKit's document scanner
 * uses internally, and far steadier than the hand-tuned OpenCV pass on a
 * light card on a light desk.
 *
 * Absent on Android and on an iOS binary built before the module existed;
 * callers fall back to OpenCV then.
 */
interface CardVisionNativeModule {
  detectCardQuad(uri: string): Promise<QuadPoint[] | null>;
  detectCardQuadInLuma(luma: string, width: number, height: number): Promise<QuadPoint[] | null>;
  warpCard(uri: string, quad: readonly QuadPoint[]): Promise<string>;
}

const native: CardVisionNativeModule | undefined =
  Platform.OS === 'ios' ? NativeModules.CardVision : undefined;

if (__DEV__ && Platform.OS === 'ios' && !native) {
  console.warn('[cardScanner] CardVision native module missing — using OpenCV. Rebuild the app.');
}

export function isNativeCardVisionAvailable(): boolean {
  return native !== undefined;
}

function requireNative(): CardVisionNativeModule {
  if (!native) {
    throw new Error('CardVision native module is unavailable.');
  }
  return native;
}

/** Corners normalized to the photo, TL/TR/BR/BL, or `null` when no card is found. */
export async function detectCardQuadNative(imageUri: string): Promise<CardQuad | null> {
  const corners = await requireNative().detectCardQuad(imageUri);
  return corners ? orderQuadCorners(corners) : null;
}

/** Live-frame variant: corners normalized to the sample, or `null`. */
export async function detectCardQuadInLumaNative(
  luma: string,
  width: number,
  height: number,
): Promise<CardQuad | null> {
  const corners = await requireNative().detectCardQuadInLuma(luma, width, height);
  return corners ? orderQuadCorners(corners) : null;
}

/** Writes the flattened card to a new cache JPEG and returns its file URI. */
export async function warpCardPhotoNative(imageUri: string, quad: CardQuad): Promise<string> {
  return requireNative().warpCard(imageUri, quad.map(({ x, y }) => ({ x, y })));
}
