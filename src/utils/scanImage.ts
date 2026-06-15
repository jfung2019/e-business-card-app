import { useEffect, useState } from 'react';
import type { ImageSourcePropType } from 'react-native';

import { API_BASE_URL } from '../config/apiConfig';
import { getAccessToken } from '../api/authToken';
import { arrayBufferToBase64 } from './imageBase64';

const imageSourceCache = new Map<string, ImageSourcePropType>();

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
      try {
        const token = await getAccessToken();
        const response = await fetch(uri, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        if (!response.ok || cancelled) {
          return;
        }

        const contentType = response.headers.get('content-type') ?? 'image/jpeg';
        const buffer = await response.arrayBuffer();
        if (cancelled || buffer.byteLength === 0) {
          return;
        }

        const base64 = arrayBufferToBase64(buffer);
        const nextSource: ImageSourcePropType = {
          uri: `data:${contentType};base64,${base64}`,
        };
        imageSourceCache.set(uri, nextSource);
        setSource(nextSource);
      } catch {
        if (!cancelled) {
          setSource(null);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [uri]);

  return source;
}
