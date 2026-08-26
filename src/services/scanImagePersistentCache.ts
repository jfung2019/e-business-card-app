import AsyncStorage from '@react-native-async-storage/async-storage';
import type { ImageSourcePropType } from 'react-native';

import { API_BASE_URL } from '../config/apiConfig';

const KEY_PREFIX = '@ebc/scanImageCache/';
const SQLITE_FULL_MARKER = 'SQLITE_FULL';

function isSqliteFullError(error: unknown): boolean {
  return (
    error instanceof Error &&
    (error.message.includes(SQLITE_FULL_MARKER) ||
      error.message.includes('database or disk is full'))
  );
}

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
  try {
    await AsyncStorage.setItem(storageKey(cacheKey), uri);
  } catch (error) {
    if (isSqliteFullError(error)) {
      try {
        await clearScanImagePersistentCache();
        await AsyncStorage.setItem(storageKey(cacheKey), uri);
      } catch {
        // Keep render path resilient even when persistent image cache cannot be written.
      }
      return;
    }
    throw error;
  }
}

export async function clearScanImagePersistentCache(): Promise<void> {
  const allKeys = await AsyncStorage.getAllKeys();
  const keys = allKeys.filter(key => key.startsWith(KEY_PREFIX));
  if (keys.length > 0) {
    await AsyncStorage.multiRemove(keys);
  }
}
