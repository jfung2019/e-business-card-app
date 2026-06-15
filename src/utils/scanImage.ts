import { useEffect, useState } from 'react';
import type { ImageSourcePropType } from 'react-native';

import { API_BASE_URL } from '../config/apiConfig';
import { getAccessToken } from '../api/authToken';
import { arrayBufferToBase64 } from './imageBase64';

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
  const [source, setSource] = useState<ImageSourcePropType | null>(null);

  useEffect(() => {
    let cancelled = false;
    const uri = resolveScanImageUri(scanImageUrl);

    if (!uri) {
      setSource(null);
      return () => {
        cancelled = true;
      };
    }

    setSource(null);

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
        setSource({ uri: `data:${contentType};base64,${base64}` });
      } catch {
        if (!cancelled) {
          setSource(null);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [scanImageUrl]);

  return source;
}
