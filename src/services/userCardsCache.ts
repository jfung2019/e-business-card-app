import AsyncStorage from '@react-native-async-storage/async-storage';

import type { UserCard } from '../types/userCard';

const CACHE_KEY = '@ebc/userCardsCache';

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
  await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(serverCards));
}

export async function clearCachedUserCards(): Promise<void> {
  await AsyncStorage.removeItem(CACHE_KEY);
}
