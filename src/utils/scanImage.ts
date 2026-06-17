import { useEffect, useState } from 'react';
import type { ImageSourcePropType } from 'react-native';

import { API_BASE_URL } from '../config/apiConfig';
import { getAccessToken } from '../api/authToken';
import { arrayBufferToBase64 } from './imageBase64';

const imageSourceCache = new Map<string, ImageSourcePropType>();

async function loadAuthenticatedImageSource(
  uri: string,
): Promise<ImageSourcePropType | null> {
  const cached = imageSourceCache.get(uri);
  if (cached) {
    return cached;
  }

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
    const nextSource: ImageSourcePropType = {
      uri: `data:${contentType};base64,${base64}`,
    };
    imageSourceCache.set(uri, nextSource);
    return nextSource;
  } catch {
    return null;
  }
}

/** Warm the scan image cache before a flip so both faces are ready. */
export async function prefetchScanImage(
  scanImageUrl: string | null | undefined,
): Promise<void> {
  const uri = resolveScanImageUri(scanImageUrl);
  if (!uri || imageSourceCache.has(uri)) {
    return;
  }
  await loadAuthenticatedImageSource(uri);
}

export function resolveScanImageUri(
  scanImageUrl: string | null | undefined,
): string | null {
  if (!scanImageUrl) {
    return null;
  }
  if (/^https?:\/\//i.test(scanImageUrl)) {
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

    const cached = imageSourceCache.get(uri);
    if (cached) {
      setSource(cached);
      return () => {
        cancelled = true;
      };
    }

    void (async () => {
      const nextSource = await loadAuthenticatedImageSource(uri);
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
