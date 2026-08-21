import AsyncStorage from '@react-native-async-storage/async-storage';

import type { CapturedCard } from '../types/card';

const CACHE_KEY = '@ebc/cardCollectionCache';
const SQLITE_FULL_MARKER = 'SQLITE_FULL';

function isSqliteFullError(error: unknown): boolean {
  return (
    error instanceof Error &&
    (error.message.includes(SQLITE_FULL_MARKER) ||
      error.message.includes('database or disk is full'))
  );
}

export async function loadCachedCards(): Promise<CapturedCard[]> {
  const raw = await AsyncStorage.getItem(CACHE_KEY);
  if (!raw) {
    return [];
  }
  try {
    const parsed = JSON.parse(raw) as CapturedCard[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export async function saveCachedCards(cards: CapturedCard[]): Promise<void> {
  const serverCards = cards.filter(card => !card._id.startsWith('local:'));
  try {
    await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(serverCards));
  } catch (error) {
    // Android AsyncStorage has a SQLite quota separate from device free space.
    if (isSqliteFullError(error)) {
      try {
        await AsyncStorage.removeItem(CACHE_KEY);
        await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(serverCards));
      } catch {
        // Swallow cache-only failures so core app flow continues.
      }
      return;
    }
    throw error;
  }
}

export async function upsertCachedCard(updated: CapturedCard): Promise<void> {
  if (updated._id.startsWith('local:')) {
    return;
  }
  const cached = await loadCachedCards();
  const index = cached.findIndex(card => card._id === updated._id);
  if (index >= 0) {
    cached[index] = updated;
  } else {
    cached.unshift(updated);
  }
  await saveCachedCards(cached);
}

export async function clearCachedCards(): Promise<void> {
  await AsyncStorage.removeItem(CACHE_KEY);
}
