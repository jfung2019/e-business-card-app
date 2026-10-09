import { useEffect, useReducer } from 'react';
import { Image } from 'react-native';

import {
  SCAN_IMAGE_ASPECT_RATIO,
  SCAN_IMAGE_MAX_ASPECT_RATIO,
  SCAN_IMAGE_MIN_ASPECT_RATIO,
} from '../theme/scanImageLayout';
import { getOrLoadImageSource, resolveScanImageUri } from './scanImage';

/**
 * Each scan's real width / height, so its frame fits the photo exactly: no
 * cropped text and no letterbox bars. Until a photo's size is known, frames
 * use {@link SCAN_IMAGE_ASPECT_RATIO}.
 */

const aspectCache = new Map<string, number>();
const loading = new Set<string>();
const listeners = new Set<() => void>();

function clampAspect(ratio: number): number {
  return Math.min(
    Math.max(ratio, SCAN_IMAGE_MIN_ASPECT_RATIO),
    SCAN_IMAGE_MAX_ASPECT_RATIO,
  );
}

function isLocalUri(uri: string): boolean {
  return /^(file|content|ph|assets-library):/i.test(uri);
}

function readImageSize(uri: string): Promise<number | null> {
  return new Promise(resolve => {
    Image.getSize(
      uri,
      (width, height) => resolve(width > 0 && height > 0 ? width / height : null),
      () => resolve(null),
    );
  });
}

async function loadAspect(key: string): Promise<void> {
  if (aspectCache.has(key) || loading.has(key)) {
    return;
  }
  loading.add(key);
  try {
    let uri: string | null = key;
    if (!isLocalUri(key)) {
      // Remote scans need the auth header; reuse the cached data URI.
      const source = await getOrLoadImageSource(key);
      uri = source && typeof source === 'object' && 'uri' in source ? source.uri ?? null : null;
    }
    const ratio = uri ? await readImageSize(uri) : null;
    if (ratio) {
      aspectCache.set(key, clampAspect(ratio));
      listeners.forEach(listener => listener());
    }
  } finally {
    loading.delete(key);
  }
}

function toKey(imageUrl: string | null | undefined): string | null {
  if (!imageUrl) {
    return null;
  }
  return isLocalUri(imageUrl) ? imageUrl : resolveScanImageUri(imageUrl);
}

/** The photo's aspect ratio if already measured, else the standard one. */
export function getScanImageAspectRatio(imageUrl: string | null | undefined): number {
  const key = toKey(imageUrl);
  return (key && aspectCache.get(key)) || SCAN_IMAGE_ASPECT_RATIO;
}

/**
 * Measures the given photos and re-renders when any of them resolves. Read the
 * results with {@link getScanImageAspectRatio}. Accepts scan URLs or local
 * file URIs.
 */
export function useScanImageAspectRatios(
  imageUrls: ReadonlyArray<string | null | undefined>,
): void {
  const [, rerender] = useReducer((count: number) => count + 1, 0);
  const keys = imageUrls.map(toKey).filter((key): key is string => Boolean(key));
  const keysId = keys.join('|');

  useEffect(() => {
    if (!keysId) {
      return;
    }
    const watched = new Set(keysId.split('|'));
    let cancelled = false;
    const listener = () => {
      if (!cancelled) {
        rerender();
      }
    };
    listeners.add(listener);
    watched.forEach(key => {
      if (!aspectCache.has(key)) {
        void loadAspect(key);
      }
    });
    return () => {
      cancelled = true;
      listeners.delete(listener);
    };
  }, [keysId]);
}

/** One photo's aspect ratio, re-rendering once it has been measured. */
export function useScanImageAspectRatio(imageUrl: string | null | undefined): number {
  useScanImageAspectRatios([imageUrl]);
  return getScanImageAspectRatio(imageUrl);
}
