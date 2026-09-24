import { useEffect, useState } from 'react';
import { InteractionManager, type ImageSourcePropType } from 'react-native';

import { API_BASE_URL } from '../config/apiConfig';
import { getAccessToken } from '../api/authToken';
import {
  readPersistedScanImageSource,
  writePersistedScanImageSource,
} from '../services/scanImagePersistentCache';
import { arrayBufferToBase64 } from './imageBase64';

const imageSourceCache = new Map<string, ImageSourcePropType>();

export function clearMemoryScanImageCache(): void {
  imageSourceCache.clear();
}

function imageSourceFromUri(uri: string): ImageSourcePropType {
  return { uri };
}

function isDataUri(uri: string): boolean {
  return /^data:/i.test(uri);
}

async function fetchAuthenticatedImageSource(
  uri: string,
): Promise<ImageSourcePropType | null> {
  try {
    const token = await getAccessToken();
    const response = await fetch(uri, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (!response.ok) {
      return null;
    }

    const contentType = response.headers.get('content-type') ?? 'image/jpeg';
    const buffer = await response.arrayBuffer();
    if (buffer.byteLength === 0) {
      return null;
    }

    const base64 = arrayBufferToBase64(buffer);
    return {
      uri: `data:${contentType};base64,${base64}`,
    };
  } catch {
    return null;
  }
}

async function getOrLoadImageSource(uri: string): Promise<ImageSourcePropType | null> {
  const cached = imageSourceCache.get(uri);
  if (cached) {
    return cached;
  }

  if (isDataUri(uri)) {
    const nextSource = imageSourceFromUri(uri);
    imageSourceCache.set(uri, nextSource);
    return nextSource;
  }

  const persisted = await readPersistedScanImageSource(uri);
  if (persisted) {
    imageSourceCache.set(uri, persisted);
    return persisted;
  }

  const fetched = await fetchAuthenticatedImageSource(uri);
  if (!fetched) {
    return null;
  }

  imageSourceCache.set(uri, fetched);
  await writePersistedScanImageSource(uri, fetched);
  return fetched;
}

type ScanImageFields = {
  scan_image_url?: string | null;
  scan_image_front_url?: string | null;
  scan_image_back_url?: string | null;
};

function collectScanImageUrls(card: ScanImageFields): string[] {
  const urls = new Set<string>();
  for (const url of [card.scan_image_front_url, card.scan_image_url, card.scan_image_back_url]) {
    if (url?.trim() && !isDataUri(url.trim())) {
      urls.add(url.trim());
    }
  }
  return [...urls];
}

/** Warm the scan image cache (memory + disk) before a flip or offline use. */
export async function prefetchScanImage(
  scanImageUrl: string | null | undefined,
): Promise<void> {
  const uri = resolveScanImageUri(scanImageUrl);
  if (!uri) {
    return;
  }
  await getOrLoadImageSource(uri);
}

/**
 * Warm every card's scan images without blocking the UI.
 *
 * Each miss is fetched, base64-encoded and written to AsyncStorage on the JS
 * thread — the same thread that dispatches taps. Loading them all at once after
 * a list refresh froze the buttons on whatever screen triggered the refresh, so
 * this waits for interactions to settle and then works through them one at a
 * time, leaving a gap on every await for touches to get through.
 */
export async function prefetchScanImagesForCards(cards: ScanImageFields[]): Promise<void> {
  const urls = new Set<string>();
  for (const card of cards) {
    for (const url of collectScanImageUrls(card)) {
      urls.add(url);
    }
  }

  const pending: string[] = [];
  for (const url of urls) {
    const uri = resolveScanImageUri(url);
    if (uri && !imageSourceCache.has(uri)) {
      pending.push(url);
    }
  }
  if (pending.length === 0) {
    return;
  }

  await new Promise<void>(resolve => {
    InteractionManager.runAfterInteractions(() => resolve());
  });

  for (const url of pending) {
    await prefetchScanImage(url);
  }
}

export function resolveScanImageUri(
  scanImageUrl: string | null | undefined,
): string | null {
  if (!scanImageUrl) {
    return null;
  }
  if (isDataUri(scanImageUrl) || /^https?:\/\//i.test(scanImageUrl)) {
    return scanImageUrl;
  }
  return `${API_BASE_URL}${scanImageUrl}`;
}

export function useAuthenticatedImageSource(
  scanImageUrl: string | null | undefined,
): ImageSourcePropType | null {
  const uri = resolveScanImageUri(scanImageUrl);
  const [source, setSource] = useState<ImageSourcePropType | null>(
    uri ? (imageSourceCache.get(uri) ?? null) : null,
  );

  useEffect(() => {
    let cancelled = false;

    if (!uri) {
      setSource(null);
      return () => {
        cancelled = true;
      };
    }

    const memoryCached = imageSourceCache.get(uri);
    if (memoryCached) {
      setSource(memoryCached);
      return () => {
        cancelled = true;
      };
    }

    void (async () => {
      const nextSource = await getOrLoadImageSource(uri);
      if (!cancelled) {
        setSource(nextSource);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [uri]);

  return source;
}
