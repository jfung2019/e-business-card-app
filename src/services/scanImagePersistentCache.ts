import AsyncStorage from '@react-native-async-storage/async-storage';
import type { ImageSourcePropType } from 'react-native';

import { API_BASE_URL } from '../config/apiConfig';

const KEY_PREFIX = '@ebc/scanImageCache/';

export function normalizeScanImageCacheKey(uriOrPath: string): string {
  if (uriOrPath.startsWith(API_BASE_URL)) {
    return uriOrPath.slice(API_BASE_URL.length);
  }
  if (/^https?:\/\//i.test(uriOrPath)) {
    try {
      return new URL(uriOrPath).pathname;
    } catch {
      return uriOrPath;
    }
  }
  return uriOrPath.startsWith('/') ? uriOrPath : `/${uriOrPath}`;
}

function storageKey(cacheKey: string): string {
  return `${KEY_PREFIX}${cacheKey.replace(/\//g, ':')}`;
}

function sourceFromDataUri(dataUri: string): ImageSourcePropType {
  return { uri: dataUri };
}

export async function readPersistedScanImageSource(
  resolvedUri: string,
): Promise<ImageSourcePropType | null> {
  const cacheKey = normalizeScanImageCacheKey(resolvedUri);
  const raw = await AsyncStorage.getItem(storageKey(cacheKey));
  if (!raw?.trim()) {
    return null;
  }
  return sourceFromDataUri(raw);
}

export async function writePersistedScanImageSource(
  resolvedUri: string,
  source: ImageSourcePropType,
): Promise<void> {
  const uri = typeof source.uri === 'string' ? source.uri : null;
  if (!uri?.startsWith('data:')) {
    return;
  }
  const cacheKey = normalizeScanImageCacheKey(resolvedUri);
  await AsyncStorage.setItem(storageKey(cacheKey), uri);
}

export async function clearScanImagePersistentCache(): Promise<void> {
  const allKeys = await AsyncStorage.getAllKeys();
  const keys = allKeys.filter(key => key.startsWith(KEY_PREFIX));
  if (keys.length > 0) {
    await AsyncStorage.multiRemove(keys);
  }
}
