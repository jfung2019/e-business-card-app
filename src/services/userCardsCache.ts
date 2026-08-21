import AsyncStorage from '@react-native-async-storage/async-storage';

import type { UserCard } from '../types/userCard';

const CACHE_KEY = '@ebc/userCardsCache';
const SQLITE_FULL_MARKER = 'SQLITE_FULL';

function isSqliteFullError(error: unknown): boolean {
  return (
    error instanceof Error &&
    (error.message.includes(SQLITE_FULL_MARKER) ||
      error.message.includes('database or disk is full'))
  );
}

export async function loadCachedUserCards(): Promise<UserCard[]> {
  const raw = await AsyncStorage.getItem(CACHE_KEY);
  if (!raw) {
    return [];
  }
  try {
    const parsed = JSON.parse(raw) as UserCard[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export async function saveCachedUserCards(cards: UserCard[]): Promise<void> {
  const serverCards = cards.filter(card => !card._id.startsWith('local:'));
  try {
    await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(serverCards));
  } catch (error) {
    // Avoid crashing UX when AsyncStorage quota is reached on Android.
    if (isSqliteFullError(error)) {
      try {
        await AsyncStorage.removeItem(CACHE_KEY);
        await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(serverCards));
      } catch {
        // Keep app functional even if cache write still fails.
      }
      return;
    }
    throw error;
  }
}

export async function clearCachedUserCards(): Promise<void> {
  await AsyncStorage.removeItem(CACHE_KEY);
}
